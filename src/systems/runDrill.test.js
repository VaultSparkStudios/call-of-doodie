import { describe, expect, it } from "vitest";
import { buildActiveRunDrill, buildDrillEvidenceLedger, buildDrillLaunchPayload, buildRunDrillLiveProgress, buildRunDrillOutcomeReceipt, sanitizeCarriedRunDrill } from "./runDrill.js";

describe("next-run drill continuity", () => {
  const drill = { id: "strafe", title: "Strafe the burst", detail: "Move perpendicular." };
  const contract = { focus: "Movement", target: "Clear the next wave", proof: "Wave delta is positive" };

  it("carries accepted coaching and its baseline into a live run", () => {
    const launch = buildDrillLaunchPayload(drill, contract, {
      baselineWave: 7, baselineScore: 1200, launchKind: "replay_seed", acceptedAt: 123,
    });
    const active = buildActiveRunDrill({ drill: launch, contract: launch.contract, seed: 99 });
    expect(active).toMatchObject({
      receiptId: "drill:strafe:123",
      id: "strafe",
      title: "Strafe the burst",
      target: "Clear the next wave",
      baseline: { wave: 7, score: 1200 },
      seed: 99,
      launchKind: "replay_seed",
      practice: false,
      label: "LIVE DRILL",
    });
  });

  it("allowlists and bounds the drill envelope carried through the menu", () => {
    const carried = sanitizeCarriedRunDrill({
      id: " strafe ", title: "t".repeat(200), detail: "d".repeat(400),
      contract: { id: "tempo", focus: "Spend cooldowns", target: "x".repeat(300), proof: "Use one grenade." },
      baselineWave: 7, baselineScore: 1200, seed: 99, launchKind: "replay_seed", acceptedAt: 123,
      ignored: "nope",
    });
    expect(carried).toMatchObject({
      schemaVersion: "menu-run-drill-v1", id: "strafe", baselineWave: 7, baselineScore: 1200,
      seed: 99, launchKind: "replay_seed", acceptedAt: 123,
      contract: { id: "tempo", focus: "Spend cooldowns", proof: "Use one grenade." },
    });
    expect(carried.title).toHaveLength(120);
    expect(carried.detail).toHaveLength(280);
    expect(carried.contract.target).toHaveLength(220);
    expect(carried.ignored).toBeUndefined();
    expect(sanitizeCarriedRunDrill({ id: "partial" })).toBeNull();
  });

  it("reports observed improvement without claiming the drill caused it", () => {
    const active = buildActiveRunDrill({
      drill: buildDrillLaunchPayload(drill, contract, { baselineWave: 7, baselineScore: 1200, acceptedAt: 123 }),
      seed: 99,
    });
    expect(buildRunDrillOutcomeReceipt(active, { wave: 8, score: 900, endedAt: 456 })).toMatchObject({
      receiptId: "drill:strafe:123",
      status: "improved",
      masteryClaim: "observed-outcome-only",
      waveDelta: 1,
      label: "IMPROVEMENT OBSERVED",
      endedAt: 456,
    });
  });

  it("fails closed for held and regressed outcomes", () => {
    const active = buildActiveRunDrill({
      drill: buildDrillLaunchPayload(drill, contract, { baselineWave: 7, baselineScore: 1200, acceptedAt: 123 }),
    });
    expect(buildRunDrillOutcomeReceipt(active, { wave: 7, score: 1200 }).status).toBe("held");
    expect(buildRunDrillOutcomeReceipt(active, { wave: 6, score: 500 })).toMatchObject({
      status: "regressed", label: "MORE PRACTICE NEEDED",
    });
    expect(buildRunDrillOutcomeReceipt(null, { wave: 10 })).toBeNull();
  });

  it("requires repeated observed improvements before reporting repeatability", () => {
    const receipts = [
      { receiptId: "a", drillId: "strafe", status: "improved", endedAt: 100 },
      { receiptId: "b", drillId: "strafe", status: "held", endedAt: 200 },
      { receiptId: "c", drillId: "strafe", status: "improved", endedAt: 300 },
      { receiptId: "c", drillId: "strafe", status: "improved", endedAt: 300 },
      { receiptId: "other", drillId: "reload", status: "improved", endedAt: 400 },
    ];
    expect(buildDrillEvidenceLedger(receipts, { drillId: "strafe" })).toEqual({
      drillId: "strafe",
      attempts: 3,
      improvements: 2,
      targetImprovements: 2,
      windowSize: 3,
      repeatable: true,
      claim: "repeatability-evidence-not-causality",
      label: "REPEATABLE IMPROVEMENT",
    });
    expect(buildDrillEvidenceLedger(receipts.slice(1), { drillId: "strafe" })).toMatchObject({
      improvements: 1, repeatable: false, label: "EVIDENCE 1/2",
    });
  });
  it("does not compare reset rematch scores with full-run scores", () => {
    const active = buildActiveRunDrill({
      drill: buildDrillLaunchPayload(drill, contract, { baselineWave: 10, baselineScore: 5000, launchKind: "rematch", acceptedAt: 123 }),
    });
    expect(buildRunDrillOutcomeReceipt(active, { wave: 10, score: 0 })).toMatchObject({
      status: "held", scoreDelta: null, masteryClaim: "observed-outcome-only",
    });
  });
  it("reports honest live progress against the accepted baseline", () => {
    const active = buildActiveRunDrill({
      drill: buildDrillLaunchPayload(drill, contract, { baselineWave: 7, baselineScore: 1200, acceptedAt: 123 }),
    });
    expect(buildRunDrillLiveProgress(active, { wave: 6, score: 500 })).toMatchObject({
      status: "before", label: "BEFORE BASELINE · W6/7", waveDelta: -1,
      claim: "observed-progress-not-causality",
    });
    expect(buildRunDrillLiveProgress(active, { wave: 7, score: 1200 })).toMatchObject({
      status: "held", label: "BASELINE HELD · W7",
    });
    expect(buildRunDrillLiveProgress(active, { wave: 7, score: 1201 })).toMatchObject({
      status: "passed", label: "BASELINE PASSED · W7", scoreDelta: 1,
    });
    expect(buildRunDrillLiveProgress(active, { wave: 8, score: 100 })).toMatchObject({
      status: "passed", waveDelta: 1,
    });
  });

  it("never compares reset REMATCH scores during live progress", () => {
    const active = buildActiveRunDrill({
      drill: buildDrillLaunchPayload(drill, contract, { baselineWave: 10, baselineScore: 9000, launchKind: "rematch", acceptedAt: 123 }),
    });
    expect(buildRunDrillLiveProgress(active, { wave: 10, score: 0 })).toMatchObject({
      status: "held", scoreDelta: null,
    });
    expect(buildRunDrillLiveProgress(active, { wave: 9, score: 99999 })).toMatchObject({
      status: "before", scoreDelta: null,
    });
  });
});
