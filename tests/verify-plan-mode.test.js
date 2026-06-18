import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const repoRoot = path.resolve(".");
const script = path.join(repoRoot, "scripts", "verify-plan-mode.mjs");

function makeTempProject(agent) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "cod-plan-mode-"));
  const context = path.join(root, "context");
  fs.mkdirSync(context, { recursive: true });
  fs.writeFileSync(path.join(context, "PROJECT_STATUS.json"), JSON.stringify({
    modelPlanMode: true,
    modelTier: "T2_opusplan",
  }, null, 2));
  fs.writeFileSync(path.join(context, ".session-lock"), [
    `agent: ${agent}`,
    `session_start: ${new Date().toISOString()}`,
  ].join("\n") + "\n");
  return root;
}

describe("verify-plan-mode agent handling", () => {
  it("marks Codex sessions not_required instead of asking for Claude Code plan mode", () => {
    const root = makeTempProject("codex");
    const output = execFileSync(process.execPath, [script, "--json"], {
      cwd: root,
      encoding: "utf8",
    });
    const result = JSON.parse(output);
    const status = JSON.parse(fs.readFileSync(path.join(root, "context", "PROJECT_STATUS.json"), "utf8"));
    const lock = fs.readFileSync(path.join(root, "context", ".session-lock"), "utf8");

    expect(result.status).toBe("not_required");
    expect(result.agent).toBe("codex");
    expect(result.reason).toMatch(/does not support Claude Code plan-mode/);
    expect(status.planModeDetected).toBe("not_required");
    expect(lock).toContain("plan_mode_detected: not_required");
  });
});
