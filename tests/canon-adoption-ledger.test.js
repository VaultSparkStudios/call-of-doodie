import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";

describe("canon adoption ledger", () => {
  it("contains one evidence-backed checked posture for every active canon", () => {
    const result = spawnSync(process.execPath, ["scripts/check-canon-adoption-ledger.mjs", "--json"], {
      cwd: process.cwd(),
      encoding: "utf8",
    });
    expect(result.status, result.stderr || result.stdout).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({
      schemaVersion: "canon-adoption-ledger-v1",
      ok: true,
      active: 52,
      rows: 52,
      adopted: 50,
      exempt: 2,
      pending: 0,
      evidenceComplete: true,
    });
  });
});
