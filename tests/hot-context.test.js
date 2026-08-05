import { describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

describe("hot context contract", () => {
  it("is bounded, source-indexed, and keeps authoritative artifacts discoverable", () => {
    const context = JSON.parse(fs.readFileSync("context/HOT_CONTEXT.json", "utf8"));
    expect(context.schemaVersion).toBe("hot-context-v1");
    expect(context.budgets.maximumBytes).toBe(24000);
    expect(context.sourceFingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(context.sources.currentState.file).toBe("context/CURRENT_STATE.md");
    expect(context.sources.audit.file).toBe("docs/AUDIT_2026-08-04_2.json");
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

  it("regenerates byte-identically after source mtimes change", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "cod-hot-context-"));
    try {
      fs.mkdirSync(path.join(root, "context"));
      fs.mkdirSync(path.join(root, "docs"));
      const sources = {
        "context/CURRENT_STATE.md": "- Session 140 (2026-08-04) deterministic context\n",
        "context/TASK_BOARD.md": "## Now\n- [ ] one item\n",
        "context/DECISIONS.md": "## 2026-08-04 — Current\nDecision: deterministic.\n",
        "docs/AUDIT_2026-08-04.json": "{\"generatedAt\":\"2026-08-04\",\"items\":[]}\n",
        "docs/AUDIT_2026-08-04_2.json": "{\"generatedAt\":\"2026-08-04\",\"items\":[{\"slug\":\"latest\"}]}\n",
      };
      for (const [relative, value] of Object.entries(sources)) {
        const target = path.join(root, relative);
        fs.writeFileSync(target, value);
      }
      const script = path.resolve("scripts/render-hot-context.mjs");
      const first = spawnSync(process.execPath, [script], { cwd: root, encoding: "utf8" });
      expect(first.status, first.stderr || first.stdout).toBe(0);
      const before = [
        fs.readFileSync(path.join(root, "context/HOT_CONTEXT.json"), "utf8"),
        fs.readFileSync(path.join(root, "context/HOT_CONTEXT.md"), "utf8"),
      ];
      for (const relative of Object.keys(sources)) {
        fs.utimesSync(path.join(root, relative), new Date("2035-01-01"), new Date("2035-01-01"));
      }
      const check = spawnSync(process.execPath, [script, "--check"], { cwd: root, encoding: "utf8" });
      expect(check.status, check.stderr || check.stdout).toBe(0);
      expect([
        fs.readFileSync(path.join(root, "context/HOT_CONTEXT.json"), "utf8"),
        fs.readFileSync(path.join(root, "context/HOT_CONTEXT.md"), "utf8"),
      ]).toEqual(before);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
