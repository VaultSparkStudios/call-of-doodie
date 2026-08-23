import { getOperation } from "./operationCampaign.js";
import { getDominantArchetype } from "../utils/buildArchetypes.js";

export const OPERATION_MISSION_SNAPSHOT_SCHEMA = "operation-mission-snapshot-v1";

function finite(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}
function recentDamageSource(gs) {
  const event = gs?.damageSequence?.events?.at?.(-1);
  if (!event) return null;
  return String(event.kind || event.sourceName || "unknown").slice(0, 32);
}

export function deriveOperationScorePace({ operationId, score = 0, elapsedMs = 0 } = {}) {
  const operation = getOperation(operationId);
  const authoredScore = operation?.encounters?.reduce((sum, encounter) => sum + Math.max(0, finite(encounter.scoreValue)), 0) || 0;
  const authoredMaxMs = Math.max(1, finite(operation?.durationMinutes?.[1], 18) * 60_000);
  const elapsed = Math.max(0, finite(elapsedMs));
  if (!operation || authoredScore <= 0 || elapsed < 5_000) return 1;
  const expectedByNow = authoredScore * Math.min(1, elapsed / authoredMaxMs);
  if (expectedByNow <= 0) return 1;
  return Math.round(Math.max(0, Math.min(2, finite(score) / expectedByNow)) * 100) / 100;
}

export function buildOperationMissionSnapshot({
  encounter,
  operationState,
  objectiveState,
  gs,
  activePerks = [],
  elapsedMs = 0,
} = {}) {
  const player = gs?.player || {};
  const maxHealth = Math.max(1, finite(player.maxHealth, 100));
  const dominant = getDominantArchetype(activePerks);
  const objectiveHistory = Array.isArray(operationState?.encounterReceipts)
    ? operationState.encounterReceipts.map((entry) => String(entry?.verb || "")).filter(Boolean).slice(-6)
    : [];
  return Object.freeze({
    schemaVersion: OPERATION_MISSION_SNAPSHOT_SCHEMA,
    encounter,
    healthRatio: Math.max(0, Math.min(1, finite(player.health, maxHealth) / maxHealth)),
    routeChosen: Boolean(operationState?.route),
    routeChoice: operationState?.route || null,
    routeConsequence: operationState?.routeConsequence?.id || null,
    interactionComplete: Boolean(objectiveState?.actionComplete),
    scorePace: deriveOperationScorePace({
      operationId: operationState?.operationId,
      score: operationState?.score,
      elapsedMs,
    }),
    buildArchetype: dominant?.id || null,
    recentDamageSource: recentDamageSource(gs),
    objectiveHistory,
  });
}
