export const OPERATION_SCORE_SCHEMA = "operation-score-v2";

function finite(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}
function points(value) {
  return Math.max(0, Math.floor(finite(value)));
}

function authoredEncounterMs(operation) {
  const encounters = Math.max(1, operation?.encounters?.length || 7);
  const minutes = Array.isArray(operation?.durationMinutes)
    ? (finite(operation.durationMinutes[0], 12) + finite(operation.durationMinutes[1], 18)) / 2
    : 15;
  return Math.max(30_000, Math.floor((minutes * 60_000) / encounters));
}

export function scoreOperationEncounter({
  operation,
  encounter,
  interactionBonus = 0,
  elapsedMs = 0,
  reinforcementCount = 0,
  routeMultiplier = 1,
  completed = true,
} = {}) {
  const objective = completed ? points(encounter?.scoreValue) : 0;
  const interaction = completed ? Math.min(100, points(interactionBonus)) : 0;
  const targetMs = authoredEncounterMs(operation);
  const elapsed = Math.max(0, finite(elapsedMs));
  const tempoRatio = elapsed > 0 ? Math.max(0, Math.min(1, (targetMs - elapsed) / targetMs)) : 0;
  const tempo = completed ? Math.floor(objective * 0.15 * tempoRatio) : 0;
  const reinforcements = Math.max(0, Math.min(6, points(reinforcementCount)));
  const pressurePenalty = completed ? Math.min(Math.floor(objective * 0.5), reinforcements * 100) : 0;
  const extraction = completed && String(encounter?.verb || "").toUpperCase() === "BOSS" ? 500 : 0;
  const subtotal = Math.max(0, objective + interaction + tempo + extraction - pressurePenalty);
  const multiplier = Math.max(0.5, Math.min(2, finite(routeMultiplier, 1)));
  const awarded = Math.floor(subtotal * multiplier);
  return Object.freeze({
    schemaVersion: OPERATION_SCORE_SCHEMA,
    objective,
    interaction,
    tempo,
    pressurePenalty,
    extraction,
    subtotal,
    routeMultiplier: multiplier,
    awarded,
    evidence: Object.freeze({
      elapsedMs: Math.floor(elapsed),
      targetMs,
      reinforcementCount: reinforcements,
      completed: Boolean(completed),
    }),
  });
}

export function summarizeOperationScore(encounterReceipts = []) {
  const totals = {
    objective: 0,
    interaction: 0,
    tempo: 0,
    pressurePenalty: 0,
    extraction: 0,
    awarded: 0,
  };
  for (const receipt of encounterReceipts) {
    const breakdown = receipt?.scoreBreakdown;
    if (breakdown?.schemaVersion !== OPERATION_SCORE_SCHEMA) continue;
    for (const key of Object.keys(totals)) totals[key] += points(breakdown[key]);
  }
  return Object.freeze({ schemaVersion: OPERATION_SCORE_SCHEMA, ...totals });
}
