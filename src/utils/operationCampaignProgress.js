import { getOperation } from "../systems/operationCampaign.js";

export const OPERATION_CAMPAIGN_PROGRESS_SCHEMA = "operation-campaign-progress-v1";
export const OPERATION_CAMPAIGN_PROGRESS_KEY = "cod-operation-campaign-progress-v1";
const MAX_COMPLETIONS = 12;

export function createOperationCampaignProgress() {
  return { schemaVersion: OPERATION_CAMPAIGN_PROGRESS_SCHEMA, completions: [] };
}

function sanitizeCompletion(receipt = {}) {
  const operation = getOperation(receipt.operationId);
  const route = String(receipt.route || "");
  const fingerprint = String(receipt.fingerprint || "").slice(0, 16);
  if (!operation || !operation.routeOptions.includes(route) || !/^[A-Fa-f0-9]{8,16}$/.test(fingerprint)) return null;
  return {
    operationId: operation.id,
    route,
    fingerprint: fingerprint.toUpperCase(),
    score: Math.max(0, Math.min(99999999, Math.floor(Number(receipt.score) || 0))),
  };
}

export function normalizeOperationCampaignProgress(value) {
  const entries = Array.isArray(value?.completions) ? value.completions : [];
  return {
    schemaVersion: OPERATION_CAMPAIGN_PROGRESS_SCHEMA,
    completions: entries.map(sanitizeCompletion).filter(Boolean).slice(-MAX_COMPLETIONS),
  };
}

export function recordOperationCompletion(progress, receipt) {
  const current = normalizeOperationCampaignProgress(progress);
  const completion = sanitizeCompletion(receipt);
  if (!completion || current.completions.some((entry) => entry.fingerprint === completion.fingerprint)) return current;
  return { ...current, completions: [...current.completions, completion].slice(-MAX_COMPLETIONS) };
}

export function deriveOperationCampaignCarryIn(progress, operationId) {
  const operation = getOperation(operationId);
  const authored = operation?.priorRouteConsequence;
  if (!authored) return null;
  const source = normalizeOperationCampaignProgress(progress).completions
    .findLast((entry) => entry.operationId === authored.sourceOperationId && entry.route === authored.routeId);
  if (!source) return null;
  return {
    id: String(authored.id).slice(0, 32),
    sourceOperationId: authored.sourceOperationId,
    sourceRoute: source.route,
    sourceFingerprint: source.fingerprint,
    description: String(authored.description).slice(0, 160),
    transition: { targetId: String(authored.targetId).slice(0, 32), command: String(authored.command).slice(0, 24) },
  };
}

export function loadOperationCampaignProgress(storage = globalThis.localStorage) {
  try { return normalizeOperationCampaignProgress(JSON.parse(storage?.getItem(OPERATION_CAMPAIGN_PROGRESS_KEY) || "null")); }
  catch { return createOperationCampaignProgress(); }
}

export function saveOperationCampaignProgress(progress, storage = globalThis.localStorage) {
  const safe = normalizeOperationCampaignProgress(progress);
  try { storage?.setItem(OPERATION_CAMPAIGN_PROGRESS_KEY, JSON.stringify(safe)); } catch {}
  return safe;
}
