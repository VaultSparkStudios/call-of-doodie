import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "../scripts/lib/safe-spawn.mjs";
import { describe, expect, it } from "vitest";
import { assessArcBinding, bindArcGoal } from "../scripts/lib/arc-goal-binding.mjs";

describe("startup lock and native goal binding", () => {
  it("binds an actual isolated startup, preserves it on repeat, and keeps help read-only", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "cod-lock-"));
    const run = (cmd, args) => {
      const result = spawnSync(cmd, args, { cwd: root, encoding: "utf8", windowsHide: true });
      expect(result.status, result.stderr || result.stdout).toBe(0);
      return result.stdout;
    };
    try {
      fs.mkdirSync(path.join(root, "scripts/lib"), { recursive: true });
      fs.mkdirSync(path.join(root, "context"));
      for (const file of ["write-session-lock.mjs", "lib/session-identity.mjs", "lib/safe-spawn.mjs", "lib/git-window-guard.mjs", "lib/fast-node.mjs"]) {
        fs.copyFileSync(path.resolve("scripts", file), path.join(root, "scripts", file));
      }
      fs.writeFileSync(path.join(root, "context/PROJECT_STATUS.json"), JSON.stringify({ lastSession: 185 }));
      run("git", ["init", "--quiet"]);
      run("git", ["add", "."]);
      run("git", ["-c", "user.name=Fixture", "-c", "user.email=fixture@example.test", "commit", "--quiet", "-m", "docs: S185 closed"]);
      const goal = { threadId: "fresh-fixture-goal", createdAt: Math.floor(Date.now() / 1000) };
      run(process.execPath, ["scripts/write-session-lock.mjs", "--agent", "codex", "--trigger", "founder-mission"]);
      const lockPath = path.join(root, "context/.session-lock");
      const first = fs.readFileSync(lockPath, "utf8");
      const binding = bindArcGoal(goal, first, root);
      expect(binding.session).toBe(186);
      expect(binding.startHead).toBe(run("git", ["rev-parse", "HEAD"]).trim());
      expect(assessArcBinding(goal, binding, root)).toMatchObject({ action: "resume-current-arc", completionProven: false });
      run(process.execPath, ["scripts/write-session-lock.mjs", "--agent", "codex", "--trigger", "founder-mission"]);
      expect(fs.readFileSync(lockPath, "utf8")).toBe(first);
      run(process.execPath, ["scripts/write-session-lock.mjs", "--help"]);
      expect(fs.readFileSync(lockPath, "utf8")).toBe(first);
      const refused = spawnSync(process.execPath, ["scripts/write-session-lock.mjs", "--session", "185"], { cwd: root, encoding: "utf8", windowsHide: true });
      expect(refused.status).not.toBe(0);
      expect(fs.readFileSync(lockPath, "utf8")).toBe(first);
      fs.writeFileSync(path.join(root, "context/PROJECT_STATUS.json"), JSON.stringify({ lastSession: 186 }));
      run(process.execPath, ["scripts/write-session-lock.mjs", "--agent", "codex", "--trigger", "founder-mission", "--force"]);
      expect(fs.readFileSync(lockPath, "utf8")).toMatch(/^session_id: 187$/m);
      fs.writeFileSync(lockPath, first.replace(/^session_start:.*$/m, "session_start: 2020-01-01T00:00:00.000Z"));
      run(process.execPath, ["scripts/write-session-lock.mjs", "--agent", "codex", "--trigger", "founder-mission"]);
      expect(fs.readFileSync(lockPath, "utf8")).toMatch(/^session_id: 187$/m);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  // ~14 sequential child processes; node spawn costs 1-4s on Windows installs
  // (see scripts/lib/fast-node.mjs), so the 30s global default cannot fit this fixture.
  }, 120_000);
});
