import { ENCOUNTER_VERBS, OPERATIONS, getOperation } from "./operationCampaign.js";
import { OPERATION_SCORE_SCHEMA, scoreOperationEncounter, summarizeOperationScore } from "./operationScore.js";

export const OPERATION_STATE_SCHEMA = "operation-state-v1";
export const OPERATION_RECEIPT_SCHEMA = "operation-receipt-v1";
export const OPERATION_ROUTE_INTEL_SCHEMA = "operation-route-intel-v1";
export const OPERATION_ENCOUNTER_VERBS = ENCOUNTER_VERBS;

const ROUTE_CONSEQUENCES = Object.freeze([
  Object.freeze({ id: "tempo_bonus", label: "TEMPO RELIEF", pressureMultiplier: 0.9, scoreMultiplier: 1 }),
  Object.freeze({ id: "score_bonus", label: "SCORE PREMIUM", pressureMultiplier: 1, scoreMultiplier: 1.1 }),
]);

function hash(value) {
  let result = 2166136261;
  for (const character of JSON.stringify(value)) {
    result ^= character.charCodeAt(0);
    result = Math.imul(result, 16777619);
  }
  return (result >>> 0).toString(16).padStart(8, "0");
}

function safeScore(value) {
  return Math.max(0, Math.floor(Number(value) || 0));
}

function routeLabel(routeId) {
  return String(routeId)
    .split("-")
    .filter(Boolean)
    .map((part) => `${part[0]?.toUpperCase() || ""}${part.slice(1)}`)
    .join(" ");
}

function percentDelta(multiplier) {
  return Math.round((Number(multiplier) - 1) * 100);
}

function buildImmediateBargain(consequence) {
  const pressureDelta = percentDelta(consequence.pressureMultiplier);
  const scoreDelta = percentDelta(consequence.scoreMultiplier);
  const pressureSummary = pressureDelta < 0
    ? `${Math.abs(pressureDelta)}% less reinforcement pressure`
    : pressureDelta > 0
      ? `${pressureDelta}% more reinforcement pressure`
      : "Standard reinforcement pressure";
  const scoreSummary = scoreDelta > 0
    ? `${scoreDelta}% Operation score premium`
    : scoreDelta < 0
      ? `${Math.abs(scoreDelta)}% Operation score penalty`
      : "Base Operation score";
  const pressureAccessible = pressureDelta < 0
    ? `${Math.abs(pressureDelta)} percent less reinforcement pressure`
    : pressureDelta > 0
      ? `${pressureDelta} percent more reinforcement pressure`
      : "standard reinforcement pressure";
  const scoreAccessible = scoreDelta > 0
    ? `${scoreDelta} percent Operation score premium`
    : scoreDelta < 0
      ? `${Math.abs(scoreDelta)} percent Operation score penalty`
      : "base Operation score";
  return Object.freeze({
    pressureMultiplier: consequence.pressureMultiplier,
    scoreMultiplier: consequence.scoreMultiplier,
    pressurePercent: Math.round(consequence.pressureMultiplier * 100),
    scorePercent: Math.round(consequence.scoreMultiplier * 100),
    summary: `${pressureSummary} · ${scoreSummary}`,
    accessibleSummary: `${pressureAccessible}; ${scoreAccessible}.`,
  });
}

function findNextOperationEcho(operationId, routeId) {
  const targetOperation = OPERATIONS.find((candidate) => (
    candidate?.priorRouteConsequence?.sourceOperationId === operationId
    && candidate.priorRouteConsequence.routeId === routeId
  ));
  if (!targetOperation) return null;
  const authored = targetOperation.priorRouteConsequence;
  return Object.freeze({
    eligibility: "eligible-on-completion",
    targetOperationId: targetOperation.id,
    targetOperationTitle: targetOperation.title,
    consequenceId: String(authored.id),
    description: String(authored.description),
    condition: `Complete ${getOperation(operationId)?.title || operationId} via ${routeLabel(routeId)}`,
  });
}

/**
 * Returns the complete player-facing and machine-facing bargain for an authored
 * Operation route. Unknown operations/routes return null so callers cannot
 * invent a benefit while runtime route selection still fails closed.
 */
export function getOperationRouteIntel(operationId, routeId) {
  const operation = getOperation(operationId);
  const normalizedRouteId = String(routeId || "");
  const routeIndex = operation?.routeOptions?.indexOf(normalizedRouteId) ?? -1;
  const consequence = ROUTE_CONSEQUENCES[routeIndex];
  if (!operation || !consequence) return null;
  const immediate = buildImmediateBargain(consequence);
  const nextOperationEcho = findNextOperationEcho(operation.id, normalizedRouteId);
  const accessibleSummary = [
    `${routeLabel(normalizedRouteId)} immediate bargain: ${immediate.accessibleSummary}`,
    nextOperationEcho
      ? `Eligible next Operation echo in ${nextOperationEcho.targetOperationTitle}: ${nextOperationEcho.description}`
      : "No authored next Operation echo.",
  ].join(" ");
  return Object.freeze({
    schemaVersion: OPERATION_ROUTE_INTEL_SCHEMA,
    operationId: operation.id,
    routeId: normalizedRouteId,
    routeLabel: routeLabel(normalizedRouteId),
    consequence,
    immediate,
    nextOperationEcho,
    accessibleSummary,
  });
}

export function createOperationState({ operationId, seed } = {}) {
  const operation = getOperation(operationId);
  if (!operation) throw new RangeError(`Unknown operation: ${operationId || "(empty)"}`);
  return {
    schemaVersion: OPERATION_STATE_SCHEMA,
    operationId: operation.id,
    seed: (Number(seed ?? operation.seed) || 0) >>> 0,
    status: "active",
    currentEncounterIndex: 0,
    route: null,
    routeConsequence: null,
    campaignCarryIn: null,
    scoringContract: OPERATION_SCORE_SCHEMA,
    score: 0,
    lastResolutionKey: null,
    encounterReceipts: [],
  };
}

export function getCurrentEncounter(state) {
  if (state?.schemaVersion !== OPERATION_STATE_SCHEMA || state.status !== "active") return null;
  const operation = getOperation(state.operationId);
  return operation?.encounters?.[state.currentEncounterIndex] || null;
}

export function chooseOperationRoute(state, routeId) {
  if (state?.schemaVersion !== OPERATION_STATE_SCHEMA) throw new TypeError("Invalid Operation state");
  if (state.route) return state;
  const route = String(routeId || "");
  const routeIntel = getOperationRouteIntel(state.operationId, route);
  if (!routeIntel) throw new RangeError(`Unknown Operation route: ${route || "(empty)"}`);
  return {
    ...state,
    route,
    routeConsequence: routeIntel.consequence,
  };
}

export function resolveOperationEncounter(state, outcome = {}) {
  const encounter = getCurrentEncounter(state);
  if (!encounter) return state;
  const resolutionKey = outcome.resolutionKey == null ? null : String(outcome.resolutionKey).slice(0, 48);
  if (resolutionKey && state.lastResolutionKey === resolutionKey) return state;
  const operation = getOperation(state.operationId);
  const completed = outcome.completed !== false;
  const routeMultiplier = Number(state.routeConsequence?.scoreMultiplier) || 1;
  const scoreBreakdown = scoreOperationEncounter({
    operation,
    encounter,
    interactionBonus: outcome.bonusScore,
    elapsedMs: outcome.elapsedMs,
    reinforcementCount: outcome.reinforcementCount,
    routeMultiplier,
    completed,
  });
  const awardedScore = scoreBreakdown.awarded;
  const receiptBase = {
    encounterId: encounter.id,
    encounterIndex: state.currentEncounterIndex,
    verb: encounter.verb,
    completed,
    awardedScore,
    scoreBreakdown,
    route: state.route,
    arenaFingerprint: outcome.arenaFingerprint || null,
    directorReason: outcome.directorReason || null,
    objectiveEvidence: outcome.objectiveEvidence ? {
      targetId: String(outcome.objectiveEvidence.targetId || "").slice(0, 32),
      command: String(outcome.objectiveEvidence.command || "").slice(0, 24),
      arenaSequence: safeScore(outcome.objectiveEvidence.arenaSequence),
      transitionFingerprint: String(outcome.objectiveEvidence.transitionFingerprint || "").slice(0, 16) || null,
    } : null,
  };
  const encounterReceipt = { ...receiptBase, fingerprint: hash(receiptBase) };
  const nextIndex = state.currentEncounterIndex + 1;
  return {
    ...state,
    status: nextIndex >= operation.encounters.length ? "complete" : "active",
    currentEncounterIndex: nextIndex,
    score: state.score + awardedScore,
    lastResolutionKey: resolutionKey,
    encounterReceipts: [...state.encounterReceipts, encounterReceipt],
  };
}

export function buildOperationReceipt(state, extra = {}) {
  if (state?.schemaVersion !== OPERATION_STATE_SCHEMA) return null;
  const operation = getOperation(state.operationId);
  const scoreBreakdown = summarizeOperationScore(state.encounterReceipts);
  const hasV2Evidence = state.scoringContract === OPERATION_SCORE_SCHEMA
    && state.encounterReceipts.every((entry) => entry?.scoreBreakdown?.schemaVersion === OPERATION_SCORE_SCHEMA);
  const base = {
    schemaVersion: OPERATION_RECEIPT_SCHEMA,
    scoringContract: hasV2Evidence ? OPERATION_SCORE_SCHEMA : "operation-score-v1",
    operationId: state.operationId,
    mission: operation?.title || state.operationId,
    seed: state.seed,
    status: state.status,
    completed: state.status === "complete",
    score: safeScore(state.score + safeScore(extra.scoreBonus)),
    scoreBreakdown: hasV2Evidence ? scoreBreakdown : null,
    act: state.status === "complete" ? 3 : (getCurrentEncounter(state)?.act || 1),
    route: state.route || "uncommitted",
    routeConsequence: state.routeConsequence ? { id: state.routeConsequence.id, label: state.routeConsequence.label } : null,
    campaignCarryIn: state.campaignCarryIn ? {
      id: state.campaignCarryIn.id,
      sourceOperationId: state.campaignCarryIn.sourceOperationId,
      sourceRoute: state.campaignCarryIn.sourceRoute,
      sourceFingerprint: state.campaignCarryIn.sourceFingerprint,
    } : null,
    checkpoint: `${state.encounterReceipts.length}/${operation?.encounters?.length || 7} encounters`,
    encounterFingerprints: state.encounterReceipts.map((entry) => entry.fingerprint),
    trust: "local-deterministic-operation-receipt-not-server-authoritative",
  };
  return { ...base, fingerprint: hash(base) };
}
