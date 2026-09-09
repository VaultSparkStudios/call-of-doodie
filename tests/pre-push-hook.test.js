import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { changedFilesForUpdate, scanFiles, scanFileText } from "../scripts/hooks/pre-push.mjs";
import { installPrePushShim, isShimInstalled, PRE_PUSH_SHIM } from "../scripts/install-hooks.mjs";

const tmpDirs = [];
afterEach(() => { for (const dir of tmpDirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true }); });
function tmp() { const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cod-hook-")); tmpDirs.push(dir); return dir; }

describe("pre-push hook (S167 Node entrypoint)", () => {
  it("flags every credential family, .env files, local paths, and router drift exactly like the Bash hook", () => {
    expect(scanFileText("src/a.js", "const k = 'sk_live_" + "A".repeat(30) + "';")).toEqual(["  ⛔ Stripe live secret key: src/a.js"]);
    expect(scanFileText("x.txt", "rnd_" + "b".repeat(24))).toEqual(["  ⛔ Render API key: x.txt"]);
    expect(scanFileText("x.txt", "ghp_" + "c".repeat(36))).toEqual(["  ⛔ GitHub PAT: x.txt"]);
    expect(scanFileText("x.txt", "AKIA" + "D".repeat(16))).toEqual(["  ⛔ AWS access key: x.txt"]);
    expect(scanFileText("x.txt", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9." + "e".repeat(60))).toEqual(["  ⚠  JWT token (service role?): x.txt"]);
    expect(scanFileText("x.txt", "postgresql://user:hunter2hunter2@db.example")).toEqual(["  ⚠  DB connection string with password: x.txt"]);
    expect(scanFileText("docs/n.md", "see C:\\Users\\someone\\thing")).toEqual(["  ⚠  Absolute local path leak: docs/n.md"]);
    expect(scanFileText(".env", "X=1")).toEqual(["  ⛔ .env file committed: .env"]);
    expect(scanFileText("config/.env.local", "X=1")).toEqual(["  ⛔ .env file committed: config/.env.local"]);
    expect(scanFileText(".env.example", "X=1")).toEqual([]);
    expect(scanFileText("scripts/x.mjs", "// api.anthropic.com in a comment\nconst m = 'claude-opus-4';")).toEqual(["  ⛔ Router adherence violation: scripts/x.mjs:2"]);
    expect(scanFileText("scripts/lib/model-router.mjs", "fetch('https://api.anthropic.com')")).toEqual([]);
    expect(scanFileText("src/x.js", "fetch('https://api.anthropic.com')")).toEqual([]);
    expect(scanFileText("src/clean.js", "export const ok = 1;")).toEqual([]);
    // The hook must not flag its own rule table or its installer.
    expect(scanFiles(["scripts/hooks/pre-push.mjs", "scripts/install-hooks.mjs"], process.cwd())).toEqual([]);
  });

  it("skips binaries and missing files, scans the rest from disk", () => {
    const root = tmp();
    fs.mkdirSync(path.join(root, "docs"));
    fs.writeFileSync(path.join(root, "docs", "bad.md"), "C:\\Users\\leak");
    fs.writeFileSync(path.join(root, "docs", "img.png"), Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00, 0x01]));
    expect(scanFiles(["docs/bad.md", "docs/img.png", "docs/missing.md"], root)).toEqual(["  ⚠  Absolute local path leak: docs/bad.md"]);
  });

  it("returns no files for a delete and resolves the outgoing range in this repository", () => {
    expect(changedFilesForUpdate({ localSha: "0".repeat(40), remoteSha: "abc" }, process.cwd())).toEqual([]);
    const files = changedFilesForUpdate({ localSha: "HEAD", remoteSha: "HEAD~1" }, process.cwd());
    expect(Array.isArray(files)).toBe(true);
  });

  it("installs a two-line shim that hands stdin to the Node entrypoint", () => {
    const hooks = path.join(tmp(), "hooks");
    expect(isShimInstalled(hooks)).toBe(false);
    installPrePushShim(hooks);
    expect(isShimInstalled(hooks)).toBe(true);
    expect(PRE_PUSH_SHIM).toContain('exec node "$(git rev-parse --show-toplevel)/scripts/hooks/pre-push.mjs" "$@"');
    expect(PRE_PUSH_SHIM.split("\n").filter(Boolean)).toHaveLength(3);
  });
});
