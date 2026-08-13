import { describe, expect, it } from "vitest";
import { buildWavePlanReceipt, canonicalWavePlan, recordWavePlanSnapshot } from "./wavePlanReceipt.js";

const plan = (wave, aliveBudget = 8) => ({
  wave,
  themeId: "vanguard",
  event: wave % 3 === 0 ? "fast_round" : null,
  eliteType: "fast",
  stages: [{ id: "scouting", aliveBudget, eliteEvery: 0, progressUntil: 0.24 }],
});

describe("recorded wave plan receipt", () => {
  it("produces stable fingerprints while remaining explicitly non-authoritative", () => {
    const ledger = recordWavePlanSnapshot([], plan(3));
    const first = buildWavePlanReceipt(ledger);
    const second = buildWavePlanReceipt(recordWavePlanSnapshot([], plan(3)));
    expect(first).toEqual(second);
    expect(first).toMatchObject({
      schemaVersion: "recorded-wave-plan-v1",
      confidence: "advisory",
      count: 1,
      firstWave: 3,
      lastWave: 3,
    });
    expect(first.contract).toContain("not-spawn-physics-or-outcome-replay");
    expect(first.combinedFingerprint).toMatch(/^[0-9A-F]{8}$/);
  });

  it("changes proof when planned pressure changes and keeps one snapshot per wave", () => {
    let ledger = recordWavePlanSnapshot([], plan(4, 8));
    const before = buildWavePlanReceipt(ledger).combinedFingerprint;
    ledger = recordWavePlanSnapshot(ledger, plan(4, 10));
    const after = buildWavePlanReceipt(ledger);
    expect(after.count).toBe(1);
    expect(after.plans[0].stages[0].aliveBudget).toBe(10);
    expect(after.combinedFingerprint).not.toBe(before);
  });

  it("bounds snapshots and strips presentation copy from the proof shape", () => {
    let ledger = [];
    for (let wave = 1; wave <= 30; wave += 1) ledger = recordWavePlanSnapshot(ledger, plan(wave));
    const receipt = buildWavePlanReceipt(ledger);
    expect(receipt.count).toBe(20);
    expect(receipt.firstWave).toBe(11);
    expect(canonicalWavePlan({ ...plan(3), label: "presentation", hint: "not proof" })).not.toHaveProperty("label");
  });
});
