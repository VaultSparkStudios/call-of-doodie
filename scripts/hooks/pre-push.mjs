#!/usr/bin/env node
// pre-push.mjs — bounded Node replacement for the per-file Bash pre-push
// fan-out (S167). The Bash hook spawned `file` + several `grep` processes per
// changed file through Git-Bash on Windows and orphaned on two ordinary S166
// pushes and one S167 push, leaving `git push` hung. This entrypoint reads the
// same stdin contract, resolves the same outgoing range, applies the same four
// rules in-process, and exits with the same semantics. One git child per ref,
// zero per file.
//
// Rules (unchanged from the Bash hook):
//   1. Committed .env files (not .env.example/.env.sample/.env.template)
//   2. Credential-like patterns (Stripe live, Render, GitHub PAT, AWS, JWT, DB URL)
//   3. Absolute local paths that leak machine-specific info into a public repo
//   4. Anthropic/router references in scripts/ outside scripts/lib/model-router.mjs
//
// Usage (git installs this via scripts/install-hooks.mjs):
//   git pre-push stdin → node scripts/hooks/pre-push.mjs origin <url>
// Self-test / manual range:
//   node scripts/hooks/pre-push.mjs --range origin/main..HEAD
//
// Bypass (with justification recorded in DECISIONS): git push --no-verify

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "../lib/safe-spawn.mjs";

const ZERO_SHA = "0000000000000000000000000000000000000000";
const MAX_FILE_BYTES = 2 * 1024 * 1024;

export const CREDENTIAL_RULES = Object.freeze([
  { id: "stripe-live", label: "⛔ Stripe live secret key", pattern: /sk_live_[A-Za-z0-9]{24,}/ },
  { id: "render-key", label: "⛔ Render API key", pattern: /rnd_[A-Za-z0-9]{20,}/ },
  { id: "github-pat", label: "⛔ GitHub PAT", pattern: /(ghp_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{82})/ },
  { id: "aws-key", label: "⛔ AWS access key", pattern: /AKIA[A-Z0-9]{16}/ },
  { id: "jwt", label: "⚠  JWT token (service role?)", pattern: /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[A-Za-z0-9_-]{50,}/ },
  { id: "db-url", label: "⚠  DB connection string with password", pattern: /postgresql:\/\/[^:]+:[^@]{8,}@/ },
]);
export const LOCAL_PATH_RULE = Object.freeze({ id: "local-path", label: "⚠  Absolute local path leak", pattern: /(C:\\Users\\|\/Users\/[A-Za-z0-9_.-]+\/documents\/development\/)/i });
export const ROUTER_RULE = Object.freeze({ id: "router", label: "⛔ Router adherence violation", pattern: /api\.anthropic\.com|@anthropic-ai\/sdk|claude-(opus|sonnet|haiku)-[0-9]/ });
const SAFE_ENV_NAMES = new Set([".env.example", ".env.sample", ".env.template"]);

function looksBinary(buffer) {
  const sample = buffer.subarray(0, 8000);
  for (const byte of sample) if (byte === 0) return true;
  return false;
}

/** Pure: apply the four rules to one file's text. Returns violation strings. */
export function scanFileText(file, text) {
  const messages = [];
  const base = path.posix.basename(file.split(path.sep).join("/"));
  if ((base === ".env" || base.startsWith(".env.")) && !SAFE_ENV_NAMES.has(base)) messages.push(`  ⛔ .env file committed: ${file}`);
  for (const rule of CREDENTIAL_RULES) if (rule.pattern.test(text)) messages.push(`  ${rule.label}: ${file}`);
  if (LOCAL_PATH_RULE.pattern.test(text)) messages.push(`  ${LOCAL_PATH_RULE.label}: ${file}`);
  const posixFile = file.split(path.sep).join("/");
  if (posixFile.startsWith("scripts/") && posixFile !== "scripts/lib/model-router.mjs") {
    const lines = text.split(/\r?\n/);
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      if (/^\s*(\/\/|#)/.test(line)) continue;
      if (ROUTER_RULE.pattern.test(line)) messages.push(`  ${ROUTER_RULE.label}: ${file}:${index + 1}`);
    }
  }
  return messages;
}

function git(args, cwd) {
  const result = spawnSync("git", args, { cwd, encoding: "utf8", windowsHide: true });
  return result.status === 0 ? String(result.stdout || "") : "";
}

/** Resolve the changed-file list for one pushed ref update. */
export function changedFilesForUpdate({ localSha, remoteSha }, cwd) {
  if (localSha === ZERO_SHA) return [];
  const output = remoteSha === ZERO_SHA
    ? git(["diff-tree", "--no-commit-id", "-r", "--name-only", localSha], cwd)
    : git(["diff", "--name-only", `${remoteSha}..${localSha}`], cwd);
  return output.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

export function scanFiles(files, repoRoot) {
  const messages = [];
  for (const file of files) {
    const fullPath = path.join(repoRoot, file);
    let stat;
    try { stat = fs.statSync(fullPath); } catch { continue; }
    if (!stat.isFile() || stat.size > MAX_FILE_BYTES) continue;
    const buffer = fs.readFileSync(fullPath);
    if (looksBinary(buffer)) continue;
    messages.push(...scanFileText(file, buffer.toString("utf8")));
  }
  return messages;
}

function parseStdinUpdates(input) {
  return String(input || "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line) => {
    const [localRef, localSha, remoteRef, remoteSha] = line.split(/\s+/);
    return { localRef, localSha, remoteRef, remoteSha };
  }).filter((update) => update.localSha && update.remoteSha);
}

function report(messages) {
  if (!messages.length) return 0;
  console.log("");
  console.log(`⛔ Pre-push checks: ${messages.length} issue(s) found`);
  console.log("");
  for (const message of messages) console.log(message);
  console.log("");
  console.log("  Review the flagged files before pushing.");
  console.log("  To push anyway with justification: git push --no-verify");
  console.log("  Sanitization guide: vaultspark-studio-ops/docs/SANITIZATION_PROTOCOL.md");
  console.log("");
  return 1;
}

function main() {
  const args = process.argv.slice(2);
  const repoRoot = git(["rev-parse", "--show-toplevel"], process.cwd()).trim() || process.cwd();
  const rangeIndex = args.indexOf("--range");
  let files = [];
  if (rangeIndex >= 0) {
    const range = args[rangeIndex + 1];
    if (!range) { console.error("Usage: node scripts/hooks/pre-push.mjs --range <from>..<to>"); return 2; }
    files = git(["diff", "--name-only", range], repoRoot).split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  } else {
    let input = "";
    try { input = fs.readFileSync(0, "utf8"); } catch { input = ""; }
    for (const update of parseStdinUpdates(input)) files.push(...changedFilesForUpdate(update, repoRoot));
  }
  const unique = [...new Set(files)];
  const messages = scanFiles(unique, repoRoot);
  const code = report(messages);
  if (code === 0 && rangeIndex >= 0) console.log(`✓ pre-push: ${unique.length} file(s) scanned, no findings`);
  return code;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exit(main());
}
