import { describe, expect, it } from "vitest";
import {
  aggregateOperationPlaytestReceipts,
  createPairedOperationPlaytestReceipt,
  evaluateOperationPlaytestGates,
  OPERATION_PLAYTEST_QUESTIONS,
  buildRunEvidenceReference,
  selectComparableStandardRuns,
} from "./operationPlaytest.js";

const run = (route, overrides = {}) => ({
  evidenceRef: route === "arena" ? "standard:9A7F20C1" : "operation:9A7F20C2",
  route,
  durationSeconds: 720,
  repeatedness: 3,
  objectiveClarity: 4,
  controlTrust: 5,
  threatReadability: 4,
  memorableMoment: 3,
  immediateReplayIntent: 4,
  ...overrides,
});

describe("Operation paired playtest evidence", () => {
  it("requires explicit opt-in and a complete answer for every paired question", () => {
    expect(OPERATION_PLAYTEST_QUESTIONS).toHaveLength(9);
    expect(OPERATION_PLAYTEST_QUESTIONS).toContain("preferredNextMode");
    expect(createPairedOperationPlaytestReceipt({ standard: run("arena"), operation: run("sewer") })).toBeNull();
    expect(createPairedOperationPlaytestReceipt({
      optIn: true,
      standard: run("arena"),
      operation: run("sewer", { threatReadability: null }),
      preferredNextMode: "operation",
    })).toBeNull();
  });

  it("redacts unrecognized fields and exports only aggregate distributions", () => {
    const receipt = createPairedOperationPlaytestReceipt({
      optIn: true,
      standard: { ...run("arena"), callsign: "private-player" },
      operation: { ...run("left-branch", { memorableMoment: 5 }), email: "private@example.com" },
      preferredNextMode: "operation",
      testerId: "private-id",
    });
    const aggregate = aggregateOperationPlaytestReceipts([receipt]);
    expect(aggregate).toMatchObject({
      sampleSize: 1,
      routes: { standard: { arena: 1 }, operation: { "left-branch": 1 } },
      preferredNextMode: { operation: 1 },
    });
    expect(aggregate.ratings.memorableMoment.operation.distribution["5"]).toBe(1);
    expect(aggregate).not.toHaveProperty("receipts");
    expect(JSON.stringify(aggregate)).not.toMatch(/private-player|private@example|private-id/);
    expect(aggregate.interpretation).toContain("not causal");
  });

  it("keeps campaign and realtime gates closed below 10 and 20 paired receipts", () => {
    expect(evaluateOperationPlaytestGates(9)).toMatchObject({
      campaignBreadth: { eligible: false, remaining: 1 },
      realtimeCoop: { eligible: false, remaining: 11 },
    });
    expect(evaluateOperationPlaytestGates(10).campaignBreadth.eligible).toBe(true);
    expect(evaluateOperationPlaytestGates(19).realtimeCoop.eligible).toBe(false);
    expect(evaluateOperationPlaytestGates(20).realtimeCoop.eligible).toBe(true);
  });

  it("selects only actual eligible Standard history and creates identifier-free references", () => {
    const history = [
      { mode: "operation", time: 800, wave: 7, score: 2000 },
      { mode: "standard", time: 640, wave: 8, score: 1200, difficulty: "hard", runSeed: 42, ts: 123 },
      { mode: "standard", time: 300, wave: 4, score: 400, integrityReceipt: { onlineEligible: false } },
    ];
    const selected = selectComparableStandardRuns(history);
    expect(selected).toHaveLength(1);
    expect(selected[0]).toMatchObject({ route: "standard-hard", durationSeconds: 640, wave: 8, score: 1200 });
    expect(selected[0].evidenceRef).toBe(buildRunEvidenceReference(history[1], "standard"));
    expect(JSON.stringify(selected)).not.toContain("123");
  });
});
