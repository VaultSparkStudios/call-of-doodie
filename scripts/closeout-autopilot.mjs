#!/usr/bin/env node

import fs from "fs";
import path from "path";
import readline from "readline";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";
import { redact } from "./lib/secrets.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const STUDIO_OPS = path.resolve(ROOT, "..", "vaultspark-studio-ops", "scripts", "ops.mjs");
const STATUS_PATH = path.join(ROOT, "context", "PROJECT_STATUS.json");
const LOCK_PATH = path.join(ROOT, "context", ".session-lock");
const BEACON_PATH = path.join(ROOT, ".claude", "beacon.env");

const args = process.argv.slice(2);
const DRY = args.includes("--dry-run");
const SKIP_PUSH = args.includes("--skip-push");
const YES = args.includes("--yes");
const msgIdx = args.indexOf("--message");
const CUSTOM_MESSAGE = msgIdx >= 0 ? args[msgIdx + 1] : null;

function header(title) {
  const bar = "═".repeat(64);
  console.log(`\n╔${bar}╗`);
  console.log(`║  ${title.padEnd(62)}║`);
  console.log(`╚${bar}╝\n`);
}

function sh(command, cwd = ROOT) {
  return spawnSync(command, {
    shell: true,
    cwd,
    encoding: "utf8",
  });
}

async function prompt(question) {
  if (DRY) return "dry";
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(`${question} [Y/n/dry]: `, (answer) => {
      rl.close();
      const normalized = (answer || "").trim().toLowerCase();
      if (!normalized) resolve("yes");
      else if (normalized === "dry") resolve("dry");
      else resolve(normalized);
    });
  });
}

function bestEffortDoctor() {
  header("Step 1 · Studio Ops doctor sync");
  const result = DRY
    ? { status: 0, stdout: "(dry-run) would run Studio Ops doctor\n", stderr: "" }
    : sh(`${JSON.stringify(process.execPath)} ${JSON.stringify(STUDIO_OPS)} doctor --update-json`);
  process.stdout.write(redact(result.stdout || ""));
  process.stderr.write(redact(result.stderr || ""));
  if ((result.status ?? 1) !== 0) {
    console.error("Doctor sync reported portfolio-level issues. Continuing project closeout with warning.");
  }
}

function stampStatus() {
  header("Step 2 · Stamp PROJECT_STATUS.json");
  const status = JSON.parse(fs.readFileSync(STATUS_PATH, "utf8"));
  const today = new Date().toISOString().slice(0, 10);
  status.lastUpdated = today;
  if (!DRY) fs.writeFileSync(STATUS_PATH, JSON.stringify(status, null, 2) + "\n");
  console.log(`lastUpdated → ${today}`);
}

function showGitPreview() {
  header("Step 3 · Git status + diff preview");
  const status = sh("git status --short");
  process.stdout.write(status.stdout || "");
  if (status.stderr) process.stderr.write(status.stderr);
  const diff = sh("git diff --stat");
  process.stdout.write(diff.stdout || "");
  if (diff.stderr) process.stderr.write(diff.stderr);
}

function parseBeaconEnv() {
  if (!fs.existsSync(BEACON_PATH)) return null;
  const env = {};
  for (const rawLine of fs.readFileSync(BEACON_PATH, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 1) continue;
    env[line.slice(0, eq)] = line.slice(eq + 1);
  }
  return env;
}

function clearSessionArtifacts() {
  header("Step 5 · Clear lock + beacon");
  if (fs.existsSync(LOCK_PATH) && !DRY) fs.unlinkSync(LOCK_PATH);
  console.log(fs.existsSync(LOCK_PATH) && DRY ? "(dry-run) would clear context/.session-lock" : "Session lock cleared");

  const beacon = parseBeaconEnv();
  if (!beacon?.BEACON_GIST_ID) {
    console.log("Beacon clear skipped");
    return;
  }
  if (DRY) {
    console.log("(dry-run) would clear active session beacon");
    return;
  }
  console.log("Beacon clear skipped");
}

function defaultCommitMessage() {
  return CUSTOM_MESSAGE || "chore: protocol sync prompts";
}

function commitAndPush(skipPush) {
  header("Step 4 · Commit + push");
  if (DRY) {
    console.log(`(dry-run) would run: git add -A && git commit -m "${defaultCommitMessage()}"${skipPush ? "" : " && git push"}`);
    return { committed: false, pushed: false };
  }

  const add = sh("git add -A");
  if ((add.status ?? 1) !== 0) {
    process.stderr.write(add.stderr || "");
    process.exit(add.status ?? 1);
  }

  const diffCached = sh("git diff --cached --quiet");
  if ((diffCached.status ?? 1) === 0) {
    console.log("No staged changes to commit");
    return { committed: false, pushed: false };
  }

  const commit = sh(`git commit -m "${defaultCommitMessage().replace(/"/g, '\\"')}"`);
  process.stdout.write(commit.stdout || "");
  process.stderr.write(commit.stderr || "");
  if ((commit.status ?? 1) !== 0) process.exit(commit.status ?? 1);

  if (skipPush) return { committed: true, pushed: false };

  const push = sh("git push");
  process.stdout.write(push.stdout || "");
  process.stderr.write(push.stderr || "");
  if ((push.status ?? 1) !== 0) process.exit(push.status ?? 1);
  return { committed: true, pushed: true };
}

function printBoard(result) {
  header("Closeout Status");
  console.log(`Committed: ${result.committed ? "yes" : "no"}`);
  console.log(`Pushed: ${result.pushed ? "yes" : "no"}`);
  console.log(`Lock cleared: ${!fs.existsSync(LOCK_PATH) || DRY ? "yes" : "no"}`);
}

bestEffortDoctor();
stampStatus();
showGitPreview();

const answer = YES ? "yes" : await prompt("Commit + push the current project changes?");
if (answer === "n" || answer === "no") {
  console.log("Closeout autopilot cancelled before git operations.");
  process.exit(0);
}

if (answer === "dry" && !DRY) {
  console.log("Dry-run preview requested. Re-run with --dry-run for a full non-writing pass.");
  process.exit(0);
}

const result = commitAndPush(SKIP_PUSH);
clearSessionArtifacts();
printBoard(result);
