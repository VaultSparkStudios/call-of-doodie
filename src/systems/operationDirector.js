import { ENCOUNTER_VERBS, getOperation } from "./operationCampaign.js";

export const OPERATION_STATE_SCHEMA = "operation-state-v1";
export const OPERATION_RECEIPT_SCHEMA = "operation-receipt-v1";
export const OPERATION_ENCOUNTER_VERBS = ENCOUNTER_VERBS;

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
  const operation = getOperation(state.operationId);
  const route = String(routeId || "");
  const routeIndex = operation?.routeOptions?.indexOf(route) ?? -1;
  if (routeIndex < 0) throw new RangeError(`Unknown Operation route: ${route || "(empty)"}`);
  return {
    ...state,
    route,
    routeConsequence: routeIndex === 0 ? "tempo_bonus" : "score_bonus",
  };
}

export function resolveOperationEncounter(state, outcome = {}) {
  const encounter = getCurrentEncounter(state);
  if (!encounter) return state;
  const resolutionKey = outcome.resolutionKey == null ? null : String(outcome.resolutionKey).slice(0, 48);
  if (resolutionKey && state.lastResolutionKey === resolutionKey) return state;
  const operation = getOperation(state.operationId);
  const completed = outcome.completed !== false;
  const routeMultiplier = state.routeConsequence === "score_bonus" ? 1.1 : 1;
  const awardedScore = completed
    ? Math.floor((encounter.scoreValue + safeScore(outcome.bonusScore)) * routeMultiplier)
    : 0;
  const receiptBase = {
    encounterId: encounter.id,
    encounterIndex: state.currentEncounterIndex,
    verb: encounter.verb,
    completed,
    awardedScore,
    route: state.route,
    arenaFingerprint: outcome.arenaFingerprint || null,
    directorReason: outcome.directorReason || null,
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
  const base = {
    schemaVersion: OPERATION_RECEIPT_SCHEMA,
    operationId: state.operationId,
    mission: operation?.title || state.operationId,
    seed: state.seed,
    status: state.status,
    completed: state.status === "complete",
    score: safeScore(state.score + safeScore(extra.scoreBonus)),
    act: state.status === "complete" ? 3 : (getCurrentEncounter(state)?.act || 1),
    route: state.route || "uncommitted",
    checkpoint: `${state.encounterReceipts.length}/${operation?.encounters?.length || 7} encounters`,
    encounterFingerprints: state.encounterReceipts.map((entry) => entry.fingerprint),
    trust: "local-deterministic-operation-receipt-not-server-authoritative",
  };
  return { ...base, fingerprint: hash(base) };
}
