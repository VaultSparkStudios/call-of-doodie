export const COMMUNITY_STATS_CACHE_KEY = "cod-community-stats-cache-v1";
export const RUN_FACT_OUTBOX_KEY = "cod-run-fact-outbox-v1";
export const MAX_RUN_FACT_OUTBOX = 500;

function finiteInt(value, fallback = 0) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : fallback;
}

function cleanPayload(payload = {}) {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined),
  );
}

export function normalizeRunFactOutbox(value) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  return value.flatMap((entry) => {
    const payload = entry?.payload && typeof entry.payload === "object"
      ? cleanPayload(entry.payload)
      : {};
    const runToken = String(payload.runToken || entry?.runToken || "").trim();
    const summarySig = String(payload.summarySig || "").trim();
    if (!runToken || !summarySig || seen.has(runToken)) return [];
    seen.add(runToken);
    return [{
      runToken,
      payload: { ...payload, runToken, summarySig },
      queuedAt: finiteInt(entry?.queuedAt, Date.now()),
      updatedAt: finiteInt(entry?.updatedAt, Date.now()),
      attempts: finiteInt(entry?.attempts),
      lastAttemptAt: entry?.lastAttemptAt == null ? null : finiteInt(entry.lastAttemptAt),
      nextAttemptAt: entry?.nextAttemptAt == null ? 0 : finiteInt(entry.nextAttemptAt),
      lastError: entry?.lastError ? String(entry.lastError).slice(0, 160) : null,
    }];
  }).slice(0, MAX_RUN_FACT_OUTBOX);
}

export function upsertRunFactOutbox(value, payload, now = Date.now()) {
  const current = normalizeRunFactOutbox(value);
  const runToken = String(payload?.runToken || "").trim();
  const summarySig = String(payload?.summarySig || "").trim();
  if (!runToken || !summarySig) return current;
  const existing = current.find((entry) => entry.runToken === runToken);
  const merged = {
    runToken,
    payload: {
      ...(existing?.payload || {}),
      ...cleanPayload(payload),
      runToken,
      summarySig,
    },
    queuedAt: existing?.queuedAt || now,
    updatedAt: now,
    attempts: existing?.attempts || 0,
    lastAttemptAt: existing?.lastAttemptAt || null,
    nextAttemptAt: 0,
    lastError: null,
  };
  return [merged, ...current.filter((entry) => entry.runToken !== runToken)]
    .slice(0, MAX_RUN_FACT_OUTBOX);
}

export function selectRunnableRunFacts(value, { now = Date.now(), limit = 20, force = false } = {}) {
  return normalizeRunFactOutbox(value)
    .filter((entry) => force || entry.nextAttemptAt <= now)
    .sort((a, b) => a.queuedAt - b.queuedAt)
    .slice(0, Math.max(1, limit));
}

export function settleRunFactAttempt(value, runToken, result = {}, now = Date.now()) {
  const current = normalizeRunFactOutbox(value);
  if (result.ok) return current.filter((entry) => entry.runToken !== runToken);
  return current.map((entry) => {
    if (entry.runToken !== runToken) return entry;
    const attempts = entry.attempts + 1;
    const retryDelay = Math.min(6 * 60 * 60 * 1000, 15000 * (2 ** Math.min(attempts - 1, 10)));
    return {
      ...entry,
      attempts,
      lastAttemptAt: now,
      nextAttemptAt: now + retryDelay,
      lastError: String(result.error || "Run sync unavailable").slice(0, 160),
    };
  });
}

export function buildCommunityStatsCacheRecord(stats, now = Date.now()) {
  return {
    schemaVersion: 1,
    cachedAt: now,
    stats: stats && typeof stats === "object" ? stats : {},
  };
}

export function normalizeCommunityStatsCache(value) {
  if (!value || typeof value !== "object" || !value.stats || typeof value.stats !== "object") return null;
  const cachedAt = finiteInt(value.cachedAt);
  if (!cachedAt) return null;
  return { schemaVersion: 1, cachedAt, stats: value.stats };
}
