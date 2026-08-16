import { describe, expect, it } from "vitest";
import { buildOperationReceipt, chooseOperationRoute, createOperationState, getCurrentEncounter, resolveOperationEncounter } from "./operationDirector.js";

describe("operationDirector", () => {
  it("advances once through the authored verb spine and emits a stable receipt", () => {
    let state = createOperationState({ operationId: "blacksite-flush", seed: 7 });
    state = chooseOperationRoute(state, "service-tunnel");
    expect(getCurrentEncounter(state).verb).toBe("BREACH");
    const first = resolveOperationEncounter(state, { completed: true, arenaFingerprint: "arena-a", resolutionKey: "wave-1" });
    expect(resolveOperationEncounter(first, { completed: true, resolutionKey: "wave-1" })).toBe(first);
    state = first;
    while (state.status === "active") state = resolveOperationEncounter(state, { completed: true });
    expect(state.encounterReceipts.map((entry) => entry.verb)).toEqual(["BREACH", "HOLD", "ESCORT", "HUNT", "SABOTAGE", "ESCAPE", "BOSS"]);
    expect(buildOperationReceipt(state)).toMatchObject({ completed: true, checkpoint: "7/7 encounters", route: "service-tunnel" });
    expect(buildOperationReceipt(state).fingerprint).toBe(buildOperationReceipt(state).fingerprint);
  });

  it("rejects unknown operations and routes", () => {
    expect(() => createOperationState({ operationId: "missing" })).toThrow(RangeError);
    const state = createOperationState({ operationId: "porcelain-siege" });
    expect(() => chooseOperationRoute(state, "missing")).toThrow(RangeError);
  });
});
