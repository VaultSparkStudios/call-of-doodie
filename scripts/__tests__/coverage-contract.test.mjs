import { describe, expect, it } from "vitest";
import { coreLogicCoverageContract, validateCoverageSummary } from "../lib/coverage-contract.mjs";

const expectedFiles = Array.from({ length: 82 }, (_, index) => `/repo/src/systems/file-${index}.js`);

function summary({
  statements = coreLogicCoverageContract.thresholds.statements,
  branches = coreLogicCoverageContract.thresholds.branches,
  functions = coreLogicCoverageContract.thresholds.functions,
  lines = coreLogicCoverageContract.thresholds.lines,
  files = expectedFiles,
} = {}) {
  return {
    total: {
      statements: { pct: statements },
      branches: { pct: branches },
      functions: { pct: functions },
      lines: { pct: lines },
    },
    ...Object.fromEntries(files.map((file) => [file, {}])),
  };
}

describe("core logic coverage contract", () => {
  it("passes only when the declared source scope and every metric clear the ratchet", () => {
    const receipt = validateCoverageSummary(summary(), { expectedFiles });
    expect(receipt.ok).toBe(true);
    expect(receipt.measuredFiles).toBe(82);
    expect(receipt.metrics).toEqual(coreLogicCoverageContract.thresholds);
  });

  it("fails closed when one expected file disappears despite healthy percentages", () => {
    const receipt = validateCoverageSummary(summary({ files: expectedFiles.slice(1) }), { expectedFiles });
    expect(receipt.ok).toBe(false);
    expect(receipt.checks.find((check) => check.id === "source-scope-complete")).toMatchObject({ ok: false });
    expect(receipt.checks.find((check) => check.id === "scope-file-floor")).toMatchObject({ ok: false, actual: 81 });
  });

  it.each(Object.keys(coreLogicCoverageContract.thresholds))("fails when the %s metric regresses", (metric) => {
    const receipt = validateCoverageSummary(summary({ [metric]: coreLogicCoverageContract.thresholds[metric] - 0.01 }), { expectedFiles });
    expect(receipt.ok).toBe(false);
    expect(receipt.checks.find((check) => check.id === `${metric}-floor`)).toMatchObject({ ok: false });
  });

  it("fails closed when the report predates an input to the coverage contract", () => {
    const receipt = validateCoverageSummary(summary(), {
      expectedFiles,
      evidenceFreshness: { ok: false, summaryMtime: 10, newestInputMtime: 11, staleInputs: ["new-source.js"] },
    });
    expect(receipt.ok).toBe(false);
    expect(receipt.checks.find((check) => check.id === "coverage-evidence-fresh")).toMatchObject({ ok: false });
  });
});
