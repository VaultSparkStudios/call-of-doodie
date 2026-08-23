import { describe, expect, it } from "vitest";
import { buildOperationMissionSnapshot, deriveOperationScorePace } from "./operationMissionSnapshot.js";

const state = {
  operationId: "blacksite-flush",
  route: "service-tunnel",
  routeConsequence: { id: "tempo_bonus" },
  score: 3000,
  encounterReceipts: [{ verb: "BREACH" }, { verb: "HOLD" }],
};

describe("operationMissionSnapshot", () => {
  it("builds one bounded deterministic director input from live evidence", () => {
    const input = {
      encounter: { id: "blacksite-flush-escort", verb: "ESCORT" },
      operationState: state,
      objectiveState: { actionComplete: true },
      gs: {
        player: { health: 54, maxHealth: 120 },
        damageSequence: { events: [{ kind: "projectile", sourceName: "Hall Monitor" }] },
      },
      activePerks: [{ id: "eagle_eye" }, { id: "penetrator" }, { id: "overclocked" }],
      elapsedMs: 360_000,
    };
    expect(buildOperationMissionSnapshot(input)).toMatchObject({
      schemaVersion: "operation-mission-snapshot-v1",
      healthRatio: 0.45,
      routeChosen: true,
      routeChoice: "service-tunnel",
      routeConsequence: "tempo_bonus",
      interactionComplete: true,
      buildArchetype: "gunslinger",
      recentDamageSource: "projectile",
      objectiveHistory: ["BREACH", "HOLD"],
    });
    expect(buildOperationMissionSnapshot(input)).toEqual(buildOperationMissionSnapshot(input));
  });

  it("derives honest bounded pace from the authored duration window", () => {
    expect(deriveOperationScorePace({ operationId: "blacksite-flush", score: 0, elapsedMs: 1_000 })).toBe(1);
    expect(deriveOperationScorePace({ operationId: "blacksite-flush", score: 6_000, elapsedMs: 540_000 })).toBeGreaterThan(0.65);
    expect(deriveOperationScorePace({ operationId: "blacksite-flush", score: 500, elapsedMs: 900_000 })).toBeLessThan(0.65);
    expect(deriveOperationScorePace({ operationId: "unknown", score: 50_000, elapsedMs: 900_000 })).toBe(1);
  });

  it("fails closed to neutral optional signals when evidence is absent", () => {
    expect(buildOperationMissionSnapshot({ encounter: { verb: "BREACH" }, operationState: {}, gs: {} })).toMatchObject({
      healthRatio: 1,
      routeChosen: false,
      interactionComplete: false,
      scorePace: 1,
      buildArchetype: null,
      recentDamageSource: null,
      objectiveHistory: [],
    });
  });
});
