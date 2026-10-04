import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";

describe("Node runtime contract", () => {
  it("aligns package, workflows, current runtime, and dependency engine floors", () => {
    const result = spawnSync(process.execPath, ["scripts/check-node-runtime.mjs", "--json"], {
      cwd: process.cwd(),
      encoding: "utf8",
    });
    expect(result.status, result.stderr || result.stdout).toBe(0);
    const receipt = JSON.parse(result.stdout);
    expect(receipt).toMatchObject({
      schemaVersion: "node-runtime-contract-v1",
      ok: true,
      projectMinimum: 22,
      requiredDependencyMinimum: 22,
    });
    expect(receipt.workflowRows.length).toBeGreaterThan(0);
    // The checker explicitly permits the externally propagated brief workflow
    // at Node 20; project-owned build/deploy workflows retain the Node 22 floor.
    expect(receipt.workflowRows.every((row) => row.major >= 22 ||
      (row.file === '.github/workflows/brief-format-check.yml' && row.major >= 20))).toBe(true);
    expect(receipt.dependencyFloorPackages.some((row) => row.package === "@supabase/supabase-js")).toBe(true);
  });
});
