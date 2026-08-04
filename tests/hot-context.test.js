import { describe, expect, it } from "vitest";
import fs from "node:fs";
import { spawnSync } from "node:child_process";

describe("hot context contract", () => {
  it("is bounded, source-indexed, and keeps authoritative artifacts discoverable", () => {
    const context = JSON.parse(fs.readFileSync("context/HOT_CONTEXT.json", "utf8"));
    expect(context.schemaVersion).toBe("hot-context-v1");
    expect(context.budgets.maximumBytes).toBe(24000);
    expect(context.sources.currentState.file).toBe("context/CURRENT_STATE.md");
    expect(context.sources.taskBoard.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(Buffer.byteLength(JSON.stringify(context))).toBeLessThan(24000);
  });

  it("passes the same deterministic freshness court enforced at startup", () => {
    const result = spawnSync(process.execPath, ["scripts/render-hot-context.mjs", "--check"], {
      cwd: process.cwd(),
      encoding: "utf8",
    });
    expect(result.status, result.stderr || result.stdout).toBe(0);
    expect(result.stdout).toContain("Hot context current");
  });
});
