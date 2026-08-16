import { describe, expect, it } from "vitest";
import {
  createOperationObjectiveState,
  evaluateOperationObjectiveClear,
  getOperationEncounterAction,
  recordOperationObjectiveAction,
} from "./operationEncounterContract.js";

describe("Operation encounter objective contract", () => {
  const encounter = { id: "blacksite-breach", verb: "BREACH" };

  it("requires the exact authored action before enemy-clear can advance", () => {
    const initial = createOperationObjectiveState(encounter);
    const ignored = recordOperationObjectiveAction(initial, { targetId: "pump-west", command: "flood" });
    expect(ignored).toBe(initial);
    const blocked = evaluateOperationObjectiveClear(initial, { arenaCleared: true });
    expect(blocked).toMatchObject({ advance: false, reasonCode: "OBJECTIVE_REINFORCEMENTS_REQUIRED" });
    expect(blocked.objectiveState.reinforcementCount).toBe(1);

    const completed = recordOperationObjectiveAction(blocked.objectiveState, getOperationEncounterAction(encounter), {
      arenaSequence: 2,
      transitionFingerprint: "proof-1",
    });
    expect(evaluateOperationObjectiveClear(completed, { arenaCleared: true })).toMatchObject({
      advance: true,
      reasonCode: "OBJECTIVE_CLEAR_CONFIRMED",
    });
  });

  it("defines distinct bounded effects for all seven authored verbs", () => {
    const verbs = ["BREACH", "HOLD", "ESCORT", "HUNT", "SABOTAGE", "ESCAPE", "BOSS"];
    const effects = verbs.map((verb) => getOperationEncounterAction({ verb }).effect.id);
    expect(new Set(effects).size).toBe(7);
  });
});
