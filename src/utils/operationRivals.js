export const OPERATION_RIVAL_SCHEMA = "operation-rival-receipt-v1";
export const MAX_OPERATION_SPLITS = 24;
export const MAX_OPERATION_BRANCHES = 12;
export const MAX_OPERATION_GHOST_SAMPLES = 180;
export const MAX_OPERATION_OBJECTIVES = 24;
export const MAX_OPERATION_RIVAL_BYTES = 24 * 1024;

export const OPERATION_RIVAL_BUDGETS = Object.freeze({
  privacy: {
    identifiers: "none",
    freeText: "none",
    locationOrDeviceData: "none",
    retention: "bounded-per-operation-seed",
  },
  cost: {
    maxReceiptBytes: MAX_OPERATION_RIVAL_BYTES,
    maxSplits: MAX_OPERATION_SPLITS,
    maxBranches: MAX_OPERATION_BRANCHES,
    maxGhostSamples: MAX_OPERATION_GHOST_SAMPLES,
    maxObjectives: MAX_OPERATION_OBJECTIVES,
    realtimeConnections: 0,
  },
});

function safeString(value, max = 48) {
  return String(value ?? "").replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, max);
}

function safeInteger(value, min = 0, max = Number.MAX_SAFE_INTEGER) {
  const number = Math.floor(Number(value));
  return Number.isFinite(number) ? Math.max(min, Math.min(max, number)) : 0;
}

function jsonBytes(value) {
  return new TextEncoder().encode(JSON.stringify(value)).byteLength;
}

function stableHash(value) {
  const text = JSON.stringify(value);
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function normalizeSplits(input) {
  return (Array.isArray(input) ? input : []).slice(0, MAX_OPERATION_SPLITS).map((split, index) => ({
    room: safeString(split?.room, 32) || `room_${index + 1}`,
    elapsedMs: safeInteger(split?.elapsedMs, 0, 60 * 60 * 1000),
    score: safeInteger(split?.score, 0, 1_000_000_000),
  }));
}

function normalizeBranches(input) {
  return (Array.isArray(input) ? input : []).slice(0, MAX_OPERATION_BRANCHES).map((branch, index) => ({
    fork: safeString(branch?.fork, 32) || `fork_${index + 1}`,
    choice: safeString(branch?.choice, 32) || "unknown",
    elapsedMs: safeInteger(branch?.elapsedMs, 0, 60 * 60 * 1000),
  }));
}

function normalizeGhostSamples(input) {
  return (Array.isArray(input) ? input : []).slice(0, MAX_OPERATION_GHOST_SAMPLES).map((sample) => ({
    elapsedMs: safeInteger(sample?.elapsedMs, 0, 60 * 60 * 1000),
    x: safeInteger(sample?.x, -10_000, 10_000),
    y: safeInteger(sample?.y, -10_000, 10_000),
    room: safeString(sample?.room, 32) || "unknown",
  }));
}

function normalizeObjectives(input) {
  const outcomes = new Set(["complete", "failed", "skipped"]);
  return (Array.isArray(input) ? input : []).slice(0, MAX_OPERATION_OBJECTIVES).map((objective, index) => ({
    id: safeString(objective?.id, 32) || `objective_${index + 1}`,
    outcome: outcomes.has(objective?.outcome) ? objective.outcome : "skipped",
    elapsedMs: safeInteger(objective?.elapsedMs, 0, 60 * 60 * 1000),
  }));
}

function normalizeRouteOptions(input) {
  return [...new Set((Array.isArray(input) ? input : []).map((route) => safeString(route, 32)).filter(Boolean))].slice(0, 8);
}

/**
 * Builds presentation evidence for asynchronous rivalry. It never contains
 * player identity, free text, inputs, projectiles, health, enemy, or spawn state.
 */
export function buildOperationReplayReceipt(input = {}) {
  const operationId = safeString(input.operationId, 48);
  const scoringContract = safeString(input.scoringContract, 48);
  if (!operationId || !scoringContract) return null;
  const receipt = {
    schemaVersion: OPERATION_RIVAL_SCHEMA,
    operationId,
    seed: safeInteger(input.seed, 0, 0xffffffff),
    routeOptions: normalizeRouteOptions(input.routeOptions),
    scoringContract,
    splits: normalizeSplits(input.splits),
    branchGhost: normalizeBranches(input.branchGhost),
    objectives: normalizeObjectives(input.objectives),
    ghostPath: normalizeGhostSamples(input.ghostPath),
    result: {
      finalScore: safeInteger(input.finalScore, 0, 1_000_000_000),
      completed: input.completed === true,
      durationMs: safeInteger(input.durationMs, 0, 60 * 60 * 1000),
    },
    trust: {
      source: "untrusted-player-claim",
      combatAuthority: "none",
      scoreAuthority: "server-verification-required",
      leaderboardEligible: false,
    },
    privacy: "no-identity-no-free-text-bounded-gameplay-evidence",
  };
  while (jsonBytes(receipt) > MAX_OPERATION_RIVAL_BYTES && receipt.ghostPath.length) receipt.ghostPath.pop();
  receipt.receiptFingerprint = stableHash(receipt);
  receipt.payloadBytes = jsonBytes(receipt);
  return receipt;
}

export function buildOperationRivalState(receipt, elapsedMs = 0) {
  if (receipt?.schemaVersion !== OPERATION_RIVAL_SCHEMA) return null;
  const now = safeInteger(elapsedMs, 0, 60 * 60 * 1000);
  const passed = receipt.splits.filter((split) => split.elapsedMs <= now);
  const next = receipt.splits.find((split) => split.elapsedMs > now) || null;
  return {
    schemaVersion: "operation-rival-presentation-v1",
    operationId: receipt.operationId,
    seed: receipt.seed,
    lastSplit: passed.at(-1) || null,
    nextSplit: next,
    branchGhost: receipt.branchGhost.filter((branch) => branch.elapsedMs <= now),
    combatAuthority: "none",
    canMutateWorld: false,
    canAuthorScore: false,
  };
}

export function buildOperationRematchCartridge(receipt) {
  if (receipt?.schemaVersion !== OPERATION_RIVAL_SCHEMA) return null;
  const cartridge = {
    schemaVersion: "operation-rematch-cartridge-v1",
    operationId: receipt.operationId,
    seed: receipt.seed,
    routeOptions: receipt.routeOptions,
    scoringContract: receipt.scoringContract,
    rivalReceiptFingerprint: receipt.receiptFingerprint,
    trust: "configuration-only-no-combat-or-score-authority",
  };
  return { ...cartridge, cartridgeFingerprint: stableHash(cartridge) };
}

export function inspectOperationRivalBudget(receipt) {
  const payloadBytes = receipt ? jsonBytes(receipt) : 0;
  return {
    payloadBytes,
    maxPayloadBytes: MAX_OPERATION_RIVAL_BYTES,
    withinPayloadBudget: payloadBytes <= MAX_OPERATION_RIVAL_BYTES,
    withinShapeBudget: Boolean(receipt
      && receipt.splits?.length <= MAX_OPERATION_SPLITS
      && receipt.branchGhost?.length <= MAX_OPERATION_BRANCHES
      && receipt.ghostPath?.length <= MAX_OPERATION_GHOST_SAMPLES
      && receipt.objectives?.length <= MAX_OPERATION_OBJECTIVES),
  };
}
