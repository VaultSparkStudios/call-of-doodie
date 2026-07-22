import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(import.meta.dirname, "..");

describe("protocol reference drift", () => {
  it("keeps every arc phase anchor and the Oracle proxy locally reachable", () => {
    const result = spawnSync(process.execPath, [path.join(ROOT, "scripts", "protocol-drift-check.mjs"), "--json"], {
      cwd: ROOT,
      encoding: "utf8",
      windowsHide: true,
    });
    const receipt = JSON.parse(result.stdout);
    expect(result.status).toBe(0);
    expect(receipt.status).toBe("ok");
    for (const anchor of ["#§1", "#§2B", "#§2C", "#§3"]) {
      expect(receipt.checks.find((check) => check.rel.endsWith(anchor))?.ok).toBe(true);
    }
    expect(receipt.checks.find((check) => check.rel === "scripts/studio-oracle.mjs")?.ok).toBe(true);
  });

  it("routes Oracle calls through the Windows-hidden Studio Ops proxy", () => {
    const source = fs.readFileSync(path.join(ROOT, "scripts", "studio-oracle.mjs"), "utf8");
    expect(source).toContain('script: "studio-oracle.mjs"');
    expect(source).toContain("runStudioScript");
    expect(source).toContain("projectBound: false");
  });
});
