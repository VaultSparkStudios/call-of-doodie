export const OPERATION_OBJECTIVE_SCHEMA = "operation-objective-state-v1";

export const OPERATION_ENCOUNTER_ACTIONS = Object.freeze({
  BREACH: Object.freeze({ targetId: "door-north", command: "open", label: "BREACH THE NORTH DOOR", benefit: "Opens the short assault lane.", effect: Object.freeze({ id: "breach-tempo", scoreBonus: 40 }) }),
  HOLD: Object.freeze({ targetId: "turret-northwest", command: "power", label: "POWER THE HOLD TURRET", benefit: "Adds bounded auto-defense pressure.", effect: Object.freeze({ id: "hold-repair", heal: 15 }) }),
  ESCORT: Object.freeze({ targetId: "valve-east", command: "power", label: "PRESSURIZE THE ESCORT LANE", benefit: "Keeps the cart lane clean and readable.", effect: Object.freeze({ id: "escort-relief", pressureMultiplier: 0.85 }) }),
  HUNT: Object.freeze({ targetId: "watchtower-center", command: "enter", label: "TAKE THE WATCHTOWER", benefit: "Marks the target sightline.", effect: Object.freeze({ id: "hunt-mark", scoreBonus: 75 }) }),
  SABOTAGE: Object.freeze({ targetId: "pump-west", command: "flood", label: "FLOOD THE ENEMY LINE", benefit: "Changes the west lane into a hazard.", effect: Object.freeze({ id: "sabotage-hazard", enemyDamageRatio: 0.15 }) }),
  ESCAPE: Object.freeze({ targetId: "extraction-toilet-alpha", command: "arm", label: "ARM EXTRACTION", benefit: "Prepares the porcelain exit.", effect: Object.freeze({ id: "escape-recovery", heal: 25 }) }),
  BOSS: Object.freeze({ targetId: "pump-west", command: "drain", label: "DRAIN THE BOSS FLOOR", benefit: "Clears the finale arena.", effect: Object.freeze({ id: "boss-drain", scoreBonus: 100 }) }),
});

function verbOf(encounter) {
  return String(encounter?.verb || encounter?.type || "").toUpperCase();
}

export function getOperationEncounterAction(encounter) {
  return OPERATION_ENCOUNTER_ACTIONS[verbOf(encounter)] || null;
}

export function createOperationObjectiveState(encounter) {
  const action = getOperationEncounterAction(encounter);
  if (!encounter?.id || !action) return null;
  return {
    schemaVersion: OPERATION_OBJECTIVE_SCHEMA,
    encounterId: String(encounter.id),
    verb: verbOf(encounter),
    requiredAction: { targetId: action.targetId, command: action.command },
    actionComplete: false,
    actionEvidence: null,
    reinforcementCount: 0,
    reasonCode: "OBJECTIVE_ACTION_REQUIRED",
  };
}

export function recordOperationObjectiveAction(state, action = {}, evidence = {}) {
  if (state?.schemaVersion !== OPERATION_OBJECTIVE_SCHEMA || state.actionComplete) return state;
  if (String(action.targetId || "") !== state.requiredAction.targetId
    || String(action.command || "").toLowerCase() !== state.requiredAction.command) return state;
  return {
    ...state,
    actionComplete: true,
    actionEvidence: {
      targetId: state.requiredAction.targetId,
      command: state.requiredAction.command,
      arenaSequence: Math.max(0, Math.floor(Number(evidence.arenaSequence) || 0)),
      transitionFingerprint: String(evidence.transitionFingerprint || "").slice(0, 16) || null,
    },
    reasonCode: "OBJECTIVE_ACTION_CONFIRMED",
  };
}

export function evaluateOperationObjectiveClear(state, { arenaCleared = false } = {}) {
  if (state?.schemaVersion !== OPERATION_OBJECTIVE_SCHEMA || !arenaCleared) {
    return { advance: false, objectiveState: state, reasonCode: "ARENA_NOT_CLEAR" };
  }
  if (state.actionComplete) {
    return { advance: true, objectiveState: state, reasonCode: "OBJECTIVE_CLEAR_CONFIRMED" };
  }
  const reinforcementCount = Math.min(6, state.reinforcementCount + 1);
  return {
    advance: false,
    objectiveState: { ...state, reinforcementCount, reasonCode: "OBJECTIVE_REINFORCEMENTS_REQUIRED" },
    reasonCode: "OBJECTIVE_REINFORCEMENTS_REQUIRED",
  };
}
