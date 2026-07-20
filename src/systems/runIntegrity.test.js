import { describe, expect, it } from "vitest";
import { buildIntegrityLocalSubmissionResult, getRunIntegrityReceipt, recordRunIntegrityFault } from "./runIntegrity.js";

describe("run integrity fault boundary", () => {
  it("keeps a clean run globally eligible", () => {
    expect(getRunIntegrityReceipt(null)).toMatchObject({
      status: "clean",
      onlineEligible: true,
      faultCount: 0,
      claim: "eligibility-from-observed-runtime-state",
    });
  });

  it("records sanitized bounded faults and deduplicates repeated stages", () => {
    const gs = { currentWave: 7 };
    recordRunIntegrityFault(gs, { stage: "Objective Director", error: new Error("failed at C:\\secret\\path.js"), at: 100 });
    recordRunIntegrityFault(gs, { stage: "Objective Director", error: new Error("failed at C:\\secret\\path.js"), at: 200 });
    expect(gs.runIntegrity.faults).toHaveLength(1);
    expect(gs.runIntegrity.faults[0]).toMatchObject({
      stage: "objective_director",
      message: "failed at <path>",
      occurrences: 2,
      firstWave: 7,
      lastWave: 7,
    });

    for (let index = 0; index < 12; index += 1) {
      recordRunIntegrityFault(gs, { stage: `stage-${index}`, error: `fault-${index}`, at: 300 + index });
    }
    expect(gs.runIntegrity.faults).toHaveLength(8);
    expect(gs.runIntegrity.faults[0].stage).toBe("stage-4");
  });

  it("fails global eligibility closed without claiming why the fault occurred", () => {
    const gs = { currentWave: 4 };
    recordRunIntegrityFault(gs, { stage: "objective_director", error: "choice stream unavailable", at: 10 });
    expect(getRunIntegrityReceipt(gs)).toMatchObject({
      status: "degraded",
      onlineEligible: false,
      faultCount: 1,
      occurrenceCount: 1,
      label: "LOCAL ONLY · RUNTIME RECOVERY",
      claim: "competitive-eligibility-fails-closed",
      stages: ["objective_director"],
    });
  });

  it("builds an explicit local-only submission while preserving the current board", () => {
    const board = [{ name: "Rival", score: 100 }];
    const result = buildIntegrityLocalSubmissionResult({
      onlineEligible: false,
      detail: "Run recovered.",
      stages: ["objective_director"],
    }, board);
    expect(result).toMatchObject({
      submission: "skipped_integrity",
      online: false,
      board,
      rejectionReason: "Run recovered.",
    });
    expect(result.rejectionReasons.join(" ")).toContain("not presented as globally verified");
  });
});

