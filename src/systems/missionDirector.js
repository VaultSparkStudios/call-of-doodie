export const MISSION_DIRECTOR_REASON_CODES = Object.freeze({
  CRITICAL_HEALTH: "DIRECTOR_CRITICAL_HEALTH",
  LOW_HEALTH: "DIRECTOR_LOW_HEALTH",
  ROUTE_UNCOMMITTED: "DIRECTOR_ROUTE_UNCOMMITTED",
  INTERACTION_PENDING: "DIRECTOR_INTERACTION_PENDING",
  SCORE_PRESSURE: "DIRECTOR_SCORE_PRESSURE",
  BUILD_COUNTERPLAY: "DIRECTOR_BUILD_COUNTERPLAY",
  DAMAGE_RESPONSE: "DIRECTOR_DAMAGE_RESPONSE",
  OBJECTIVE_VARIETY: "DIRECTOR_OBJECTIVE_VARIETY",
  ROUTE_CONSEQUENCE: "DIRECTOR_ROUTE_CONSEQUENCE",
  ENCOUNTER_DEFAULT: "DIRECTOR_ENCOUNTER_DEFAULT",
});

const VERB_DIRECTIVES = Object.freeze({
  BREACH: "Open the marked lane before clearing the room.",
  HOLD: "Power the defense point and control its approach.",
  ESCORT: "Keep the clean route online and move with the objective.",
  HUNT: "Take the sightline and eliminate the marked target.",
  SABOTAGE: "Reverse the marked system against the hostile lane.",
  ESCAPE: "Arm extraction, then clear the exit pressure.",
  BOSS: "Prepare the arena state, then finish the boss.",
});

export function chooseMissionDirective({
  encounter,
  healthRatio = 1,
  routeChosen = true,
  routeChoice = null,
  routeConsequence = null,
  interactionComplete = false,
  scorePace = 1,
  buildArchetype = null,
  recentDamageSource = null,
  objectiveHistory = [],
} = {}) {
  const routeConsequenceId = typeof routeConsequence === "object" ? routeConsequence?.id : routeConsequence;
  const health = Math.max(0, Math.min(1, Number(healthRatio) || 0));
  let reasonCode = MISSION_DIRECTOR_REASON_CODES.ENCOUNTER_DEFAULT;
  let directive = VERB_DIRECTIVES[String(encounter?.verb || "").toUpperCase()] || "Secure the current objective.";
  if (health <= 0.2) {
    reasonCode = MISSION_DIRECTOR_REASON_CODES.CRITICAL_HEALTH;
    directive = "Break contact, recover health, then resume the objective.";
  } else if (health <= 0.4) {
    reasonCode = MISSION_DIRECTOR_REASON_CODES.LOW_HEALTH;
    directive = "Use cover and finish the marked interaction safely.";
  } else if (!routeChosen && Number(encounter?.act || 1) >= 2) {
    reasonCode = MISSION_DIRECTOR_REASON_CODES.ROUTE_UNCOMMITTED;
    directive = "Commit to an Operation route before the next push.";
  } else if (recentDamageSource) {
    reasonCode = MISSION_DIRECTOR_REASON_CODES.DAMAGE_RESPONSE;
    directive = `Counter the recent ${String(recentDamageSource).slice(0, 32)} pressure before recommitting.`;
  } else if (Array.isArray(objectiveHistory) && objectiveHistory.length >= 2 && objectiveHistory.slice(-2).every((verb) => verb === encounter?.verb)) {
    reasonCode = MISSION_DIRECTOR_REASON_CODES.OBJECTIVE_VARIETY;
    directive = "Take the optional side contract to break the repeated objective pattern.";
  } else if (buildArchetype) {
    reasonCode = MISSION_DIRECTOR_REASON_CODES.BUILD_COUNTERPLAY;
    directive = `${directive} Director read: ${String(buildArchetype).slice(0, 24)} build.`;
  } else if (routeChoice && routeConsequenceId) {
    reasonCode = MISSION_DIRECTOR_REASON_CODES.ROUTE_CONSEQUENCE;
    directive = `${directive} Route consequence ${String(routeConsequenceId).slice(0, 32)} is active.`;
  } else if (!interactionComplete) {
    reasonCode = MISSION_DIRECTOR_REASON_CODES.INTERACTION_PENDING;
  } else if ((Number(scorePace) || 0) < 0.65) {
    reasonCode = MISSION_DIRECTOR_REASON_CODES.SCORE_PRESSURE;
    directive = "Increase tempo without abandoning the objective route.";
  }
  return {
    reasonCode,
    directive,
    encounterVerb: String(encounter?.verb || "UNKNOWN").toUpperCase(),
    optionalContract: reasonCode === MISSION_DIRECTOR_REASON_CODES.OBJECTIVE_VARIETY ? "side-contract-variety" : null,
    difficultyChange: "none-player-opt-in-only",
  };
}
