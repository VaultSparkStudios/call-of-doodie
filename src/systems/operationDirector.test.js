import { describe, expect, it } from "vitest";
import { OPERATIONS } from "./operationCampaign.js";
import { buildOperationReceipt, chooseOperationRoute, createOperationState, getCurrentEncounter, getOperationRouteIntel, resolveOperationEncounter } from "./operationDirector.js";

describe("operationDirector", () => {
  it("advances once through the authored verb spine and emits a stable receipt", () => {
    let state = createOperationState({ operationId: "blacksite-flush", seed: 7 });
    state = chooseOperationRoute(state, "service-tunnel");
    expect(state.routeConsequence).toMatchObject({ id: "tempo_bonus", pressureMultiplier: 0.9 });
    expect(getCurrentEncounter(state).verb).toBe("BREACH");
    const first = resolveOperationEncounter(state, { completed: true, arenaFingerprint: "arena-a", resolutionKey: "wave-1" });
    expect(resolveOperationEncounter(first, { completed: true, resolutionKey: "wave-1" })).toBe(first);
    state = first;
    while (state.status === "active") state = resolveOperationEncounter(state, { completed: true });
    expect(state.encounterReceipts.map((entry) => entry.verb)).toEqual(["BREACH", "HOLD", "ESCORT", "HUNT", "SABOTAGE", "ESCAPE", "BOSS"]);
    expect(buildOperationReceipt(state)).toMatchObject({ completed: true, checkpoint: "7/7 encounters", route: "service-tunnel" });
    expect(buildOperationReceipt(state).fingerprint).toBe(buildOperationReceipt(state).fingerprint);
  });

  it("applies the typed score route consequence", () => {
    const state = chooseOperationRoute(createOperationState({ operationId: "blacksite-flush", seed: 8 }), "executive-washroom");
    const next = resolveOperationEncounter(state, { completed: true });
    expect(next.routeConsequence).toMatchObject({ id: "score_bonus", scoreMultiplier: 1.1 });
    expect(next.encounterReceipts[0].awardedScore).toBe(1100);
    expect(next.encounterReceipts[0].scoreBreakdown).toMatchObject({
      schemaVersion: "operation-score-v2",
      objective: 1000,
      awarded: 1100,
    });
  });

  it("publishes an exact v2 component summary while legacy states remain readable", () => {
    let state = chooseOperationRoute(createOperationState({ operationId: "blacksite-flush", seed: 159 }), "service-tunnel");
    state = resolveOperationEncounter(state, {
      completed: true,
      bonusScore: 40,
      elapsedMs: 45_000,
      reinforcementCount: 1,
      resolutionKey: "score-v2-1",
    });
    const receipt = buildOperationReceipt(state);
    expect(receipt).toMatchObject({
      scoringContract: "operation-score-v2",
      scoreBreakdown: {
        schemaVersion: "operation-score-v2",
        objective: 1000,
        interaction: 40,
        pressurePenalty: 100,
        awarded: state.score,
      },
    });
    const componentNet = receipt.scoreBreakdown.objective
      + receipt.scoreBreakdown.interaction
      + receipt.scoreBreakdown.tempo
      + receipt.scoreBreakdown.extraction
      - receipt.scoreBreakdown.pressurePenalty;
    expect(componentNet).toBe(receipt.scoreBreakdown.awarded);

    const legacy = buildOperationReceipt({
      ...state,
      scoringContract: undefined,
      score: 12065,
      encounterReceipts: state.encounterReceipts.map(({ scoreBreakdown: _ignored, ...entry }) => entry),
    });
    expect(legacy).toMatchObject({ scoringContract: "operation-score-v1", score: 12065, scoreBreakdown: null });
  });

  it("uses one route-intel authority for every displayed and runtime multiplier", () => {
    for (const operation of OPERATIONS) {
      for (const routeId of operation.routeOptions) {
        const intel = getOperationRouteIntel(operation.id, routeId);
        const state = chooseOperationRoute(createOperationState({ operationId: operation.id }), routeId);
        expect(intel).toMatchObject({
          schemaVersion: "operation-route-intel-v1",
          operationId: operation.id,
          routeId,
          immediate: {
            pressureMultiplier: intel.consequence.pressureMultiplier,
            scoreMultiplier: intel.consequence.scoreMultiplier,
          },
        });
        expect(state.routeConsequence).toBe(intel.consequence);
        expect(intel.immediate.summary).toMatch(/reinforcement pressure/);
        expect(intel.accessibleSummary).toMatch(/Operation score/);
      }
    }
  });

  it("declares only authored next-Operation echoes", () => {
    expect(getOperationRouteIntel("blacksite-flush", "service-tunnel")?.nextOperationEcho).toMatchObject({
      eligibility: "eligible-on-completion",
      targetOperationId: "porcelain-siege",
      consequenceId: "tunnel-debt",
    });
    expect(getOperationRouteIntel("porcelain-siege", "boiler-room")?.nextOperationEcho).toMatchObject({
      targetOperationId: "final-notice",
      consequenceId: "boiler-paper-trail",
    });
    expect(getOperationRouteIntel("blacksite-flush", "executive-washroom")?.nextOperationEcho).toBeNull();
    expect(getOperationRouteIntel("final-notice", "records-office")?.nextOperationEcho).toBeNull();
  });

  it("rejects unknown operations and routes", () => {
    expect(() => createOperationState({ operationId: "missing" })).toThrow(RangeError);
    expect(getOperationRouteIntel("missing", "service-tunnel")).toBeNull();
    expect(getOperationRouteIntel("porcelain-siege", "missing")).toBeNull();
    const state = createOperationState({ operationId: "porcelain-siege" });
    expect(() => chooseOperationRoute(state, "missing")).toThrow(RangeError);
  });
});
