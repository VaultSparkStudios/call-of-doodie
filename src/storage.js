// ===== LEADERBOARD =====
import { supabaseUrl, supabaseAnonKey, getAuthUid, getOrCreateClientUid, getSupabaseClient } from "./supabase.js";
import { isSupporter } from "./utils/supporter.js";
import { WEAPON_EVOLVED_NAMES } from "./constants.js";
import { removeLocalState, writeLocalState } from "./utils/storageHealth.js";
import { normalizeCommunityStats } from "./utils/gameStats.js";
import {
  buildCommunityStatsCacheRecord,
  COMMUNITY_STATS_CACHE_KEY,
  normalizeCommunityStatsCache,
  normalizeRunFactOutbox,
  RUN_FACT_OUTBOX_KEY,
  selectRunnableRunFacts,
  settleRunFactAttempt,
  upsertRunFactOutbox,
} from "./utils/communityStatsReliability.js";
export { getAccountLevel } from "./utils/progressionCurve.js";

// ===== SUPABASE SQL MIGRATIONS =====
// Run these in the Supabase SQL console (one time, in order):
//
//   -- 1. Enable anonymous sign-ins in Supabase Auth > Settings > Anonymous sign-ins
//
//   -- 2. Add missing leaderboard columns:
//   ALTER TABLE leaderboard ADD COLUMN IF NOT EXISTS "customSettings" boolean;
//   ALTER TABLE leaderboard ADD COLUMN IF NOT EXISTS "inputDevice" text;
//   ALTER TABLE leaderboard ADD COLUMN IF NOT EXISTS "seed" integer;
//   ALTER TABLE leaderboard ADD COLUMN IF NOT EXISTS "accountLevel" integer;
//   ALTER TABLE leaderboard ADD COLUMN IF NOT EXISTS "mode" text;
//   ALTER TABLE leaderboard ADD COLUMN IF NOT EXISTS "game_id" text DEFAULT 'cod';
//   -- ✅ Migration complete — mode column live, no stripping needed
//
//   -- 3. Callsign ownership table (see below) ✅ DONE 2026-03-26
//

// ===== CALLSIGN OWNERSHIP =====
// ✅ SQL migration run 2026-03-26. callsign_claims table live, cod_verified_insert policy active.
//
//   CREATE TABLE IF NOT EXISTS callsign_claims (
//     name TEXT PRIMARY KEY,
//     uid  UUID NOT NULL DEFAULT auth.uid(),
//     claimed_at TIMESTAMPTZ DEFAULT NOW()
//   );
//   ALTER TABLE callsign_claims ENABLE ROW LEVEL SECURITY;
//   CREATE POLICY "public_read"  ON callsign_claims FOR SELECT USING (true);
//   CREATE POLICY "claim_new"    ON callsign_claims FOR INSERT
//     WITH CHECK (auth.uid() IS NOT NULL);
//
//   -- Update leaderboard INSERT policy to verify callsign ownership:
//   DROP POLICY IF EXISTS "allow_insert" ON leaderboard;
//   CREATE POLICY "verified_insert" ON leaderboard FOR INSERT WITH CHECK (
//     score BETWEEN 1 AND 10000000
//     AND (
//       NOT EXISTS (SELECT 1 FROM callsign_claims WHERE name = NEW.name)
//       OR EXISTS (SELECT 1 FROM callsign_claims WHERE name = NEW.name AND uid = auth.uid())
//     )
//   );
export async function claimCallsign(name) {
  if (!name) return false;
  try {
    const supabase = await getSupabaseClient();
    if (!supabase) return false;
    const uid = await getAuthUid(supabase);
    if (!uid) return false;
    const { error } = await supabase
      .from("callsign_claims")
      .upsert([{ name, uid }], { onConflict: "name", ignoreDuplicates: true });
    if (error) throw error;
    // Verify the claim is actually ours (ignoreDuplicates silently skips if name is taken)
    const { data: row } = await supabase
      .from("callsign_claims")
      .select("uid")
      .eq("name", name)
      .single();
    return row?.uid === uid;
  } catch (err) {
    // Fails silently until SQL migration is applied in Supabase console
    console.warn("[callsign] Claim failed (run SQL migration in Supabase console):", err.message);
    return false;
  }
}

const LB_KEY = "cod-lb-v5"; // kept as localStorage fallback key
const VALID_MODES = new Set(["score_attack", "daily_challenge", "boss_rush", "cursed", "speedrun", "gauntlet", "zombies", "normal"]);
const VALID_DIFFICULTIES = new Set(["easy", "normal", "hard", "insane"]);
const VALID_INPUT_DEVICES = new Set(["mouse", "mobile", "controller", "generic", "xbox", "ps"]);

function persistProgression(key, value) {
  return writeLocalState(key, value, { surface: "progression" }).ok;
}

function removeProgression(key) {
  return removeLocalState(key, { surface: "progression" }).ok;
}

function _clampInt(value, min, max, fallback = min) {
  const num = Number.parseInt(value, 10);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(max, Math.max(min, num));
}

function _cleanText(value, maxLen, fallback = "") {
  const text = String(value ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim();
  return text ? text.slice(0, maxLen) : fallback;
}

export function parseRunTime(value) {
  if (typeof value !== "string") return Number.POSITIVE_INFINITY;
  const match = value.trim().match(/^(\d+):([0-5]\d)$/);
  if (!match) return Number.POSITIVE_INFINITY;
  return Number.parseInt(match[1], 10) * 60 + Number.parseInt(match[2], 10);
}

export function compareLeaderboardEntries(a, b, mode = null) {
  const effectiveMode = mode || ((a?.mode && a?.mode === b?.mode) ? a.mode : null);
  if (effectiveMode === "speedrun") {
    const timeDelta = parseRunTime(a?.time) - parseRunTime(b?.time);
    if (timeDelta !== 0) return timeDelta;
    return (b?.score || 0) - (a?.score || 0);
  }
  return (b?.score || 0) - (a?.score || 0);
}

export function normalizeLeaderboardEntry(entry) {
  const mode = VALID_MODES.has(entry?.mode) ? entry.mode : null;
  const difficulty = VALID_DIFFICULTIES.has(entry?.difficulty) ? entry.difficulty : "normal";
  const inputDevice = VALID_INPUT_DEVICES.has(entry?.inputDevice) ? entry.inputDevice : "mouse";
  return {
    name: _cleanText(entry?.name, 24, "Anonymous"),
    lastWords: _cleanText(entry?.lastWords, 60, "..."),
    rank: _cleanText(entry?.rank, 40, "Noob Potato"),
    score: _clampInt(entry?.score, 0, 10000000, 0),
    kills: _clampInt(entry?.kills, 0, 1000000, 0),
    wave: _clampInt(entry?.wave, 1, 10000, 1),
    bestStreak: _clampInt(entry?.bestStreak, 0, 100000, 0),
    totalDamage: _clampInt(entry?.totalDamage, 0, 100000000, 0),
    level: _clampInt(entry?.level, 1, 9999, 1),
    achievements: _clampInt(entry?.achievements, 0, 999, 0),
    accountLevel: _clampInt(entry?.accountLevel, 1, 9999, 1),
    prestige: _clampInt(entry?.prestige, 0, 99, 0),
    time: _cleanText(entry?.time, 8, "0:00"),
    difficulty,
    inputDevice,
    starterLoadout: _cleanText(entry?.starterLoadout, 24, "standard"),
    mode,
    customSettings: Boolean(entry?.customSettings),
    supporter: Boolean(entry?.supporter),
    feedbackDifficulty: ["too_easy", "dialed_in", "brutal"].includes(entry?.feedback_difficulty ?? entry?.feedbackDifficulty)
      ? (entry.feedback_difficulty ?? entry.feedbackDifficulty)
      : null,
    totalShots: _clampInt(entry?.total_shots ?? entry?.totalShots, 0, 10000000, 0),
    totalHits: _clampInt(entry?.total_hits ?? entry?.totalHits, 0, 10000000, 0),
    totalCrits: _clampInt(entry?.total_crits ?? entry?.totalCrits, 0, 1000000, 0),
    bossKills: _clampInt(entry?.boss_kills ?? entry?.bossKills, 0, 100000, 0),
    seed: entry?.seed == null ? null : _clampInt(entry.seed, 0, 999999999, 0),
    ts: entry?.ts ?? null,
    created_at: entry?.created_at ?? null,
    game_id: entry?.game_id ?? "cod",
  };
}

async function getFunctionHeaders() {
  const headers = {
    apikey: supabaseAnonKey,
    "Content-Type": "application/json",
  };
  try {
    const supabase = await getSupabaseClient();
    const { data: { session } } = await supabase?.auth.getSession() || { data: { session: null } };
    if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
  } catch {}
  return headers;
}

async function invokeEdgeFunction(name, body) {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase function env missing");
  }

  const res = await fetch(`${supabaseUrl}/functions/v1/${name}`, {
    method: "POST",
    headers: await getFunctionHeaders(),
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text || null; }
  return { ok: res.ok, status: res.status, data };
}

export async function loadLeaderboard(offset = 0, limit = 50) {
  const supabase = await getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("leaderboard")
        .select("name,score,kills,wave,lastWords,rank,bestStreak,totalDamage,level,time,achievements,difficulty,ts,starterLoadout,customSettings,inputDevice,seed,accountLevel,mode,prestige,supporter,feedback_difficulty,total_shots,total_hits,total_crits,boss_kills")
        .eq("game_id", "cod")
        .order("score", { ascending: false })
        .range(offset, offset + limit - 1);
      if (error) throw error;
      return (data || []).map(normalizeLeaderboardEntry);
    } catch (err) {
      console.warn("[leaderboard] Supabase read failed, using local cache:", err.message);
    }
  }
  // Fallback: localStorage
  try {
    const raw = localStorage.getItem(LB_KEY);
    const all = raw ? JSON.parse(raw) : [];
    return all.map(normalizeLeaderboardEntry).slice(offset, offset + limit);
  } catch { return []; }
}

const TOP_GHOSTS_KEY = "cod-top-ghosts-v1";
const WEEKLY_TOP_GHOST_KEY = "cod-weekly-top-ghost-v1";

/**
 * Loads top-3 leaderboard entries for a given mode/difficulty as persistent ghost opponents.
 * Fetches from Supabase if available, caches to localStorage, falls back to cache on error.
 * Returns [{name, score, wave, mode, difficulty}].
 */
export async function loadTopGhosts(mode = "standard", difficulty = "normal") {
  const cacheKey = `${TOP_GHOSTS_KEY}-${mode}-${difficulty}`;
  const supabase = await getSupabaseClient();
  if (supabase) {
    try {
      const modeFilter = mode === "standard" ? null : mode;
      let q = supabase
        .from("leaderboard")
        .select("name,score,wave,mode,difficulty,ts")
        .eq("difficulty", difficulty)
        .order("score", { ascending: false })
        .limit(3);
      if (modeFilter) q = q.eq("mode", modeFilter);
      else q = q.or("mode.is.null,mode.eq.standard");
      const { data, error } = await q;
      if (error) throw error;
      const ghosts = (data || []).map(r => ({ name: r.name || "Ghost", score: r.score || 0, wave: r.wave || 0, mode: r.mode || "standard", difficulty: r.difficulty || "normal" }));
      try { persistProgression(cacheKey, JSON.stringify(ghosts)); } catch {}
      return ghosts;
    } catch {}
  }
  // Fallback to cache
  try {
    const raw = localStorage.getItem(cacheKey);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function normalizeGhostEntry(row, fallbackMode = "standard", fallbackDifficulty = "normal") {
  const normalized = normalizeLeaderboardEntry({
    ...row,
    mode: row?.mode ?? fallbackMode,
    difficulty: row?.difficulty ?? fallbackDifficulty,
  });
  return {
    name: normalized.name || "Weekly Ghost",
    score: normalized.score || 0,
    wave: normalized.wave || 0,
    mode: normalized.mode || fallbackMode,
    difficulty: normalized.difficulty || fallbackDifficulty,
    ts: normalized.ts || normalized.created_at || null,
  };
}

export async function loadWeeklyTopGhost(mode = "standard", difficulty = "normal", { now = Date.now(), ttlMs = 3600000 } = {}) {
  const cacheKey = `${WEEKLY_TOP_GHOST_KEY}-${mode}-${difficulty}`;
  try {
    const cached = JSON.parse(sessionStorage.getItem(cacheKey) || "null");
    if (cached?.cachedAt && now - cached.cachedAt < ttlMs && cached.ghost) return cached.ghost;
  } catch {}

  const supabase = await getSupabaseClient();
  if (supabase) {
    try {
      const modeFilter = mode === "standard" ? null : mode;
      const sinceIso = new Date(now - 7 * 86400000).toISOString();
      let q = supabase
        .from("leaderboard")
        .select("name,score,wave,mode,difficulty,ts,created_at")
        .eq("difficulty", difficulty)
        .gte("created_at", sinceIso)
        .order("score", { ascending: false })
        .limit(1);
      if (modeFilter) q = q.eq("mode", modeFilter);
      else q = q.or("mode.is.null,mode.eq.standard");
      const { data, error } = await q;
      if (error) throw error;
      const ghost = data?.[0] ? normalizeGhostEntry(data[0], mode, difficulty) : null;
      try { sessionStorage.setItem(cacheKey, JSON.stringify({ cachedAt: now, ghost })); } catch {}
      return ghost;
    } catch (err) {
      console.warn("[leaderboard] Weekly rival lookup failed, using cache:", err?.message ?? String(err));
    }
  }

  try {
    const cached = JSON.parse(sessionStorage.getItem(cacheKey) || "null");
    return cached?.ghost || null;
  } catch { return null; }
}

// Returns up to `count` leaderboard entries whose score is within ±bandPct of myBestScore.
// Prioritises entries just above the player (the "next rung" to beat).
export function getProximityRivals(myBestScore, leaderboard = [], count = 3, bandPct = 0.10) {
  if (!myBestScore || myBestScore <= 0 || !leaderboard.length) return [];
  const lo = myBestScore * (1 - bandPct);
  const hi = myBestScore * (1 + bandPct);
  const above = leaderboard.filter(e => e.score > myBestScore && e.score <= hi).sort((a, b) => a.score - b.score);
  const below = leaderboard.filter(e => e.score >= lo && e.score <= myBestScore).sort((a, b) => b.score - a.score);
  return [...above, ...below].slice(0, count).map(e => ({ name: e.name, score: e.score, diff: e.score - myBestScore }));
}

export function buildSubmitScorePayload(safeEntry, rawEntry = {}) {
  const payload = {
    ...safeEntry,
    runToken: typeof rawEntry?.runToken === "string" ? rawEntry.runToken.trim() : "",
    clientUid: getOrCreateClientUid(),
    summarySig: typeof rawEntry?.summarySig === "string" ? rawEntry.summarySig.trim() : "",
    eventDigest: rawEntry?.eventDigest && typeof rawEntry.eventDigest === "object" ? rawEntry.eventDigest : null,
  };

  const traceDigest = typeof rawEntry?.traceDigest === "string" ? rawEntry.traceDigest.trim() : "";
  const traceLength = _clampInt(rawEntry?.traceLength, 0, 240, 0);
  const traceBody = typeof rawEntry?.traceBody === "string"
    ? rawEntry.traceBody.trim().replace(/[^a-z0-9._:~-]/gi, "").slice(0, 8192)
    : "";

  if (traceDigest) payload.traceDigest = traceDigest;
  if (traceLength > 0) payload.traceLength = traceLength;
  if (traceBody) payload.traceBody = traceBody;
  if (typeof rawEntry?.ghostPath === "string" && rawEntry.ghostPath) payload.ghostPath = rawEntry.ghostPath.replace(/[^a-z0-9.;]/gi, "").slice(0, 8192);
  if (rawEntry?.traceEvidence && typeof rawEntry.traceEvidence === "object") {
    payload.traceEvidence = {
      level: typeof rawEntry.traceEvidence.level === "string" ? rawEntry.traceEvidence.level : "none",
      count: _clampInt(rawEntry.traceEvidence.count, 0, 240, 0),
      durationFrames: _clampInt(rawEntry.traceEvidence.durationFrames, 0, 999999, 0),
      weaknessReasons: Array.isArray(rawEntry.traceEvidence.weaknessReasons)
        ? rawEntry.traceEvidence.weaknessReasons.filter(Boolean).map(String).slice(0, 6)
        : [],
    };
  }

  return payload;
}

// Note: requires Supabase migration: ALTER TABLE leaderboard ADD COLUMN IF NOT EXISTS prestige integer DEFAULT 0;
// Online submit path expects the Supabase Edge Function `submit-score` to be deployed.
export async function saveToLeaderboard(entry) {
  const rawRunToken = typeof entry?.runToken === "string" ? entry.runToken.trim() : "";
  const safeEntry = normalizeLeaderboardEntry({ ...entry, supporter: isSupporter(entry?.name) });

  if (supabaseUrl && supabaseAnonKey) {
    try {
      const response = await invokeEdgeFunction("submit-score", buildSubmitScorePayload(
        safeEntry,
        { ...entry, runToken: rawRunToken },
      ));
      if (!response.ok) {
        const rejectionReason = response.data?.error || "Score submission rejected.";
        const rejectionReasons = Array.isArray(response.data?.reasons) ? response.data.reasons : [];
        const traceEvidence = response.data?.traceEvidence || entry?.traceEvidence || null;
        if (response.status >= 400 && response.status < 500) {
          // Server-side check rejected this run (e.g. plausibility gate, expired token,
          // callsign-ownership conflict). Persist locally so the run isn't lost outright,
          // but keep the online board for display since this run never made it to Supabase.
          let localBoard = [];
          try {
            const board = JSON.parse(localStorage.getItem(LB_KEY) || "[]");
            board.push({ ...safeEntry, ts: Date.now(), game_id: "cod" });
            localBoard = board
              .map(normalizeLeaderboardEntry)
              .sort((a, b) => compareLeaderboardEntries(a, b, null))
              .slice(0, 100);
            persistProgression(LB_KEY, JSON.stringify(localBoard));
          } catch {}
          return {
            board: await loadLeaderboard(),
            localBoard,
            online: false,
            submission: "rejected",
            rejectionReason,
            rejectionReasons,
            traceEvidence,
          };
        }
        throw new Error(rejectionReason);
      }
      const board = await loadLeaderboard();
      return {
        board,
        online: true,
        submission: "online",
        rejectionReason: null,
        rejectionReasons: [],
        traceEvidence: response.data?.traceEvidence || entry?.traceEvidence || null,
      };
    } catch (err) {
      console.warn("[leaderboard] Edge submit failed, saving locally:", err?.message ?? String(err));
    }
  }
  // Fallback: localStorage
  try {
    const board = JSON.parse(localStorage.getItem(LB_KEY) || "[]");
    board.push({ ...safeEntry, ts: Date.now(), game_id: "cod" });
    const top = board
      .map(normalizeLeaderboardEntry)
      .sort((a, b) => compareLeaderboardEntries(a, b, null))
      .slice(0, 100);
    persistProgression(LB_KEY, JSON.stringify(top));
    return { board: top, online: false, submission: "local", rejectionReason: null, rejectionReasons: [], traceEvidence: entry?.traceEvidence || null };
  } catch { return { board: [], online: false, submission: "local", rejectionReason: null, rejectionReasons: [], traceEvidence: entry?.traceEvidence || null }; }
}

export async function issueRunToken({ mode = null, difficulty = "normal", seed = null, starterLoadout = "standard" } = {}) {
  if (!supabaseUrl || !supabaseAnonKey) return null;
  try {
    const response = await invokeEdgeFunction("issue-run-token", {
      mode: VALID_MODES.has(mode) ? mode : null,
      difficulty: VALID_DIFFICULTIES.has(difficulty) ? difficulty : "normal",
      seed: seed == null ? null : _clampInt(seed, 0, 999999999, 0),
      starterLoadout: _cleanText(starterLoadout, 24, "standard"),
      clientUid: getOrCreateClientUid(),
    });
    if (!response.ok) throw new Error(response.data?.error || "Run token issue failed.");
    return typeof response.data?.token === "string"
      ? {
          token: response.data.token,
          summarySig: typeof response.data?.summarySig === "string" ? response.data.summarySig : "",
        }
      : null;
  } catch (err) {
    console.warn("[leaderboard] Run token issue failed:", err?.message ?? String(err));
    return null;
  }
}

let runFactSyncPromise = null;
let runFactLastAttemptAt = 0;
const RUN_FACT_SYNC_THROTTLE_MS = 5000;

function persistCompletedRunFactOutbox(entries) {
  try {
    persistProgression(RUN_FACT_OUTBOX_KEY, JSON.stringify(normalizeRunFactOutbox(entries)));
  } catch {}
}

export function loadCompletedRunFactOutbox() {
  try {
    return normalizeRunFactOutbox(JSON.parse(localStorage.getItem(RUN_FACT_OUTBOX_KEY) || "[]"));
  } catch {
    return [];
  }
}

export function queueCompletedRunFactForRetry(run = {}) {
  const next = upsertRunFactOutbox(loadCompletedRunFactOutbox(), run);
  persistCompletedRunFactOutbox(next);
  return next;
}

function cacheCommunityStats(stats) {
  const normalized = normalizeCommunityStats(stats);
  try {
    persistProgression(
      COMMUNITY_STATS_CACHE_KEY,
      JSON.stringify(buildCommunityStatsCacheRecord(normalized)),
    );
  } catch {}
  return normalized;
}

export function loadCachedCommunityStats() {
  try {
    const record = normalizeCommunityStatsCache(
      JSON.parse(localStorage.getItem(COMMUNITY_STATS_CACHE_KEY) || "null"),
    );
    if (!record) return normalizeCommunityStats({ dataSource: "empty", checkedAt: null, cacheAgeMs: null });
    return normalizeCommunityStats({
      ...record.stats,
      dataSource: "cache",
      checkedAt: new Date(record.cachedAt).toISOString(),
      cacheAgeMs: Math.max(0, Date.now() - record.cachedAt),
    });
  } catch {
    return normalizeCommunityStats({ dataSource: "empty", checkedAt: null, cacheAgeMs: null });
  }
}

async function submitCompletedRunFact(run = {}) {
  if (!supabaseUrl || !supabaseAnonKey || !run?.runToken || !run?.summarySig) {
    return { ok: false, status: 0, stats: null, error: "Run sync configuration unavailable." };
  }
  try {
    const response = await invokeEdgeFunction("sync-game-run", {
      ...run,
      mode: run.mode === "standard" ? "standard" : (VALID_MODES.has(run.mode) ? run.mode : "standard"),
      difficulty: VALID_DIFFICULTIES.has(run.difficulty) ? run.difficulty : "normal",
      clientUid: getOrCreateClientUid(),
    });
    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        stats: null,
        error: response.data?.error || "Run fact sync failed.",
      };
    }
    const checkedAt = new Date().toISOString();
    const stats = cacheCommunityStats({
      ...response.data?.stats,
      dataSource: "live",
      checkedAt,
      cacheAgeMs: 0,
    });
    try {
      window.dispatchEvent(new CustomEvent("cod:community-stats-updated", { detail: { stats } }));
    } catch {}
    return { ok: true, status: response.status, stats, error: null };
  } catch (err) {
    console.warn("[game-stats] Run fact sync failed:", err?.message ?? String(err));
    return { ok: false, status: 0, stats: null, error: err?.message ?? String(err) };
  }
}

export async function syncCompletedRunFactOutbox({ limit = 20, force = false } = {}) {
  const current = loadCompletedRunFactOutbox();
  if (current.length === 0) {
    return { ok: true, synced: 0, pending: 0, failed: 0, syncedTokens: [], stats: null, reason: "empty" };
  }
  if (!supabaseUrl || !supabaseAnonKey) {
    return { ok: false, synced: 0, pending: current.length, failed: 0, syncedTokens: [], stats: null, reason: "env_missing" };
  }
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return { ok: false, synced: 0, pending: current.length, failed: 0, syncedTokens: [], stats: null, reason: "offline" };
  }

  const runnable = selectRunnableRunFacts(current, { limit, force });
  if (runnable.length === 0) {
    return { ok: true, synced: 0, pending: current.length, failed: 0, syncedTokens: [], stats: null, reason: "backoff" };
  }

  let outbox = current;
  let stats = null;
  const syncedTokens = [];
  let failed = 0;
  for (const entry of runnable) {
    const result = await submitCompletedRunFact(entry.payload);
    outbox = settleRunFactAttempt(outbox, entry.runToken, result);
    persistCompletedRunFactOutbox(outbox);
    if (result.ok) {
      syncedTokens.push(entry.runToken);
      stats = result.stats || stats;
    } else {
      failed += 1;
      if (result.status === 429 || result.status >= 500 || result.status === 0) break;
    }
  }
  return {
    ok: failed === 0,
    synced: syncedTokens.length,
    pending: outbox.length,
    failed,
    syncedTokens,
    stats,
    reason: failed ? "retry_scheduled" : "synced",
  };
}

export function requestCompletedRunFactSync({ limit = 20, force = false } = {}) {
  if (runFactSyncPromise) return runFactSyncPromise;
  const now = Date.now();
  if (!force && now - runFactLastAttemptAt < RUN_FACT_SYNC_THROTTLE_MS) {
    return Promise.resolve({
      ok: true,
      synced: 0,
      pending: loadCompletedRunFactOutbox().length,
      failed: 0,
      syncedTokens: [],
      stats: null,
      reason: "throttled",
    });
  }
  runFactLastAttemptAt = now;
  runFactSyncPromise = syncCompletedRunFactOutbox({ limit, force })
    .finally(() => { runFactSyncPromise = null; });
  return runFactSyncPromise;
}

export async function syncCompletedRunFact(run = {}) {
  if (!run?.runToken || !run?.summarySig) return { ok: false, stats: null, submission: "skipped", pending: loadCompletedRunFactOutbox().length };
  queueCompletedRunFactForRetry(run);
  const result = await requestCompletedRunFactSync({ limit: 20, force: true });
  const ok = result.syncedTokens.includes(String(run.runToken).trim());
  return {
    ok,
    stats: result.stats,
    submission: ok ? "synced" : "queued",
    pending: result.pending,
  };
}

export async function loadCommunityStats() {
  const supabase = await getSupabaseClient();
  if (!supabase) return loadCachedCommunityStats();
  try {
    const { data, error } = await supabase.rpc("get_cod_community_stats");
    if (error) throw error;
    const checkedAt = new Date().toISOString();
    return cacheCommunityStats({
      ...data,
      dataSource: "live",
      checkedAt,
      cacheAgeMs: 0,
    });
  } catch (err) {
    console.warn("[game-stats] Community aggregate unavailable:", err?.message ?? String(err));
    return loadCachedCommunityStats();
  }
}

// ===== LEADERBOARD — TODAY / SEARCH / RANK =====

/** Fetch today's top 50 entries (since midnight UTC). Optional mode + difficulty filters. */
export async function loadLeaderboardToday(mode = null, difficulty = null) {
  const supabase = await getSupabaseClient();
  if (!supabase) return [];
  try {
    const midnight = new Date(); midnight.setHours(0, 0, 0, 0);
    let q = supabase
      .from("leaderboard")
      .select("name,score,kills,wave,lastWords,rank,bestStreak,totalDamage,level,time,achievements,difficulty,ts,starterLoadout,customSettings,inputDevice,seed,accountLevel,mode,prestige,supporter,created_at")
      .eq("game_id", "cod")
      .gte("created_at", midnight.toISOString())
      .order("score", { ascending: false })
      .limit(50);
    if (mode) q = q.eq("mode", mode);
    if (difficulty) q = q.eq("difficulty", difficulty);
    const { data, error } = await q;
    if (error) throw error;
    return (data || []).map(normalizeLeaderboardEntry);
  } catch (err) {
    console.warn("[leaderboard] Today query failed:", err.message);
    return [];
  }
}

/** Today's #1 daily-challenge entry (the 👑 Crown holder). Returns null if none. */
export async function getDailyChampion() {
  const supabase = await getSupabaseClient();
  if (!supabase) return null;
  try {
    const midnight = new Date(); midnight.setHours(0, 0, 0, 0);
    const todaySeed = String(getDailyChallengeSeed());
    const { data, error } = await supabase
      .from("leaderboard")
      .select("name,score,wave,kills,supporter,prestige,accountLevel,seed,mode,created_at")
      .eq("game_id", "cod")
      .eq("mode", "daily_challenge")
      .eq("seed", Number(todaySeed))
      .gte("created_at", midnight.toISOString())
      .order("score", { ascending: false })
      .limit(1);
    if (error) throw error;
    return (data && data[0]) ? normalizeLeaderboardEntry(data[0]) : null;
  } catch (err) {
    console.warn("[crown] daily champion lookup failed:", err.message);
    return null;
  }
}

/** Search leaderboard by player name (case-insensitive partial match). */
export async function searchLeaderboard(nameQuery) {
  const supabase = await getSupabaseClient();
  if (!supabase || !nameQuery.trim()) return [];
  try {
    const { data, error } = await supabase
      .from("leaderboard")
      .select("name,score,kills,wave,difficulty,mode,ts,accountLevel,inputDevice,starterLoadout,seed,level,time,lastWords,bestStreak,totalDamage,achievements,rank,customSettings,prestige,supporter")
      .eq("game_id", "cod")
      .ilike("name", `%${nameQuery.trim()}%`)
      .order("score", { ascending: false })
      .limit(20);
    if (error) throw error;
    return (data || []).map(normalizeLeaderboardEntry);
  } catch (err) {
    console.warn("[leaderboard] Search failed:", err.message);
    return [];
  }
}

/** Returns the global rank for a given score (1-based). */
export async function getPlayerGlobalRank(score, mode = null, time = null) {
  const supabase = await getSupabaseClient();
  if (!supabase || score == null) return null;
  try {
    if (mode === "speedrun" && time) {
      const timeRows = await supabase
        .from("leaderboard")
        .select("time,score", { count: "exact" })
        .eq("game_id", "cod")
        .eq("mode", "speedrun")
        .limit(2000);
      if (timeRows.error) throw timeRows.error;
      const sorted = (timeRows.data || [])
        .map(normalizeLeaderboardEntry)
        .sort((a, b) => compareLeaderboardEntries(a, b, "speedrun"));
      const idx = sorted.findIndex(row => row.time === time && row.score === score);
      return (idx === -1 ? sorted.length : idx) + 1;
    }

    let query = supabase
      .from("leaderboard")
      .select("*", { count: "exact", head: true })
      .eq("game_id", "cod")
      .gt("score", score);
    if (mode) query = query.eq("mode", mode);
    const { count, error } = await query;
    if (error) throw error;
    return (count || 0) + 1;
  } catch (err) {
    console.warn("[leaderboard] Rank query failed:", err.message);
    return null;
  }
}

// ===== CAREER STATS =====
const CAREER_KEY = "cod-career-v1";

const DEFAULT_CAREER = {
  totalKills: 0,
  totalDeaths: 0,
  totalRuns: 0,
  bestScore: 0,
  totalScore: 0,
  bestWave: 0,
  bestStreak: 0,
  bestKills: 0,
  bestCombo: 0,
  bestLevel: 0,
  totalDamage: 0,
  totalCrits: 0,
  totalGrenades: 0,
  totalDashes: 0,
  totalBossKills: 0,
  totalShots: 0,
  totalHits: 0,
  totalPlayTime: 0,
  achievementsEver: [],
  enemyKillBests: {}, // typeIndex → { waveMax, careerKills, killedByCount }
};

export function loadCareerStats() {
  try {
    const raw = localStorage.getItem(CAREER_KEY);
    if (!raw) return { ...DEFAULT_CAREER };
    return { ...DEFAULT_CAREER, ...JSON.parse(raw) };
  } catch { return { ...DEFAULT_CAREER }; }
}

export function saveCareerStats(stats) {
  try { persistProgression(CAREER_KEY, JSON.stringify(stats)); } catch {}
}

// ===== DAILY MISSIONS =====
const MISSION_DEFS = [
  { id: "kill_any",      icon: "☠️",  make: (n) => ({ text: `Kill ${n} enemies`,                     goal: n, track: "kills"        }) },
  { id: "reach_wave",    icon: "🌊",  make: (n) => ({ text: `Reach wave ${n}`,                       goal: n, track: "wave"         }) },
  { id: "combo",         icon: "🌪️", make: (n) => ({ text: `Land a ×${n} combo`,                   goal: n, track: "maxCombo"     }) },
  { id: "damage",        icon: "⚔️",  make: (n) => ({ text: `Deal ${n.toLocaleString()} dmg`,        goal: n, track: "totalDamage"  }) },
  { id: "dashes",        icon: "💨",  make: (n) => ({ text: `Dash ${n} times`,                       goal: n, track: "dashes"       }) },
  { id: "crits",         icon: "🎯",  make: (n) => ({ text: `Land ${n} crits`,                       goal: n, track: "crits"        }) },
  { id: "grenade_kills", icon: "💣",  make: (n) => ({ text: `Kill ${n} with grenades`,               goal: n, track: "grenadeKills" }) },
  { id: "survive",       icon: "⏱️",  make: (n) => ({ text: `Survive ${n}s`,                        goal: n, track: "timeSurvived" }) },
  { id: "boss_kills",    icon: "👹",  make: (n) => ({ text: `Slay ${n} boss${n > 1 ? "es" : ""}`,   goal: n, track: "bossKills"    }) },
  { id: "killstreak",    icon: "🔥",  make: (n) => ({ text: `Land a ×${n} killstreak`,               goal: n, track: "bestStreak"   }) },
  { id: "dash_kills",    icon: "💨",  make: (n) => ({ text: `Kill ${n} enemies while dashing`,       goal: n, track: "dashKills"    }) },
  { id: "perk_collector",icon: "✨",  make: (n) => ({ text: `Pick up ${n} perks`,                    goal: n, track: "perksSelected" }) },
  { id: "nuke_user",     icon: "☢️",  make: (n) => ({ text: `Use ${n} tactical nuke${n>1?"s":""}`,   goal: n, track: "nukes"         }) },
  { id: "high_roller",   icon: "🎰",  make: (n) => ({ text: `Score ${n.toLocaleString()} points`,    goal: n, track: "score"         }) },
  { id: "arms_race",     icon: "🔧",  make: (n) => ({ text: `Collect ${n} weapon upgrade${n>1?"s":""}`, goal: n, track: "weaponUpgradesCollected" }) },
  { id: "no_hit_wave",   icon: "🛡️", make: (n) => ({ text: `Clear ${n} wave${n>1?"s":""} without taking damage`, goal: n, track: "noHitWaves" }) },
  { id: "single_weapon", icon: "🎯",  make: (n) => ({ text: `Get ${n} kills with a single weapon`,            goal: n, track: "singleWeaponKills" }) },
  { id: "level_reach",   icon: "⬆️",  make: (n) => ({ text: `Reach level ${n}`,                       goal: n, track: "level"            }) },
  { id: "boss_clear",    icon: "☠️",  make: (n) => ({ text: `Clear ${n} boss wave${n>1?"s":""}`,        goal: n, track: "bossWavesCleared" }) },
  { id: "max_weapon",    icon: "⭐",  make: (n) => ({ text: `Max out ${n} weapon${n>1?"s":""}`,          goal: n, track: "maxWeaponLevel"   }) },
  // ── Score Attack–specific missions ──
  { id: "sa_score",  icon: "⏱️", make: (n) => ({ text: `Score ${n.toLocaleString()} pts in Score Attack`,  goal: n, track: "saScore"  }) },
  { id: "sa_kills",  icon: "⏱️", make: (n) => ({ text: `Kill ${n} enemies in Score Attack`,                goal: n, track: "saKills"  }) },
  { id: "sa_wave",   icon: "⏱️", make: (n) => ({ text: `Reach wave ${n} in Score Attack`,                  goal: n, track: "saWave"   }) },
];
const MISSION_PARAMS = {
  kill_any: [15,20,25], reach_wave: [5,6,7], combo: [5,8,10],
  damage: [2000,5000,8000], dashes: [10,15,20], crits: [10,20,25],
  grenade_kills: [3,5,8], survive: [60,90,120],
  boss_kills: [1,2,3], killstreak: [5,8,10], dash_kills: [3,5,8],
  perk_collector: [3,5,7], nuke_user: [1,2,3], high_roller: [5000,10000,25000], arms_race: [1,2,3],
  no_hit_wave: [1,2,3], single_weapon: [5,10,20],
  level_reach: [5, 8, 12], boss_clear: [1, 2, 3], max_weapon: [1, 2, 3],
  sa_score: [5000, 15000, 30000], sa_kills: [30, 60, 100], sa_wave: [3, 5, 7],
};
function lcg(s) { return Math.abs((Math.imul(s, 1664525) + 1013904223) | 0); }

// ── Daily Challenge ──────────────────────────────────────────────────────────
export function getDailyChallengeSeed() {
  const d = new Date();
  let s = d.getFullYear() * 10000 + (d.getMonth()+1) * 100 + d.getDate();
  s = lcg(s); s = lcg(s); s = lcg(s); // 3 rounds for better distribution
  return s % 999999;
}
export function hasDailyChallengeSubmitted() {
  return !!localStorage.getItem("cod-daily-" + getTodayKey());
}
export function markDailyChallengeSubmitted() {
  persistProgression("cod-daily-" + getTodayKey(), "1");
}

export function getTodayKey() {
  return getMissionDayKey(new Date());
}

export function getMissionDayKey(value = new Date()) {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
export function getDailyMissions() {
  const d = new Date();
  let seed = d.getFullYear() * 10000 + (d.getMonth()+1) * 100 + d.getDate();
  const used = new Set(), missions = [];
  let attempts = 0;
  while (missions.length < 3 && attempts < 40) {
    attempts++; seed = lcg(seed);
    const tmpl = MISSION_DEFS[Math.abs(seed) % MISSION_DEFS.length];
    if (used.has(tmpl.id)) continue;
    used.add(tmpl.id); seed = lcg(seed);
    const params = MISSION_PARAMS[tmpl.id];
    const n = params[Math.abs(seed) % params.length];
    missions.push({ ...tmpl.make(n), id: tmpl.id, icon: tmpl.icon });
  }
  return missions;
}
export function loadMissionProgress() {
  try { const raw = localStorage.getItem("cod-missions-" + getTodayKey()); return raw ? JSON.parse(raw) : {}; } catch { return {}; }
}
export function saveMissionProgress(completed) {
  try { persistProgression("cod-missions-" + getTodayKey(), JSON.stringify(completed)); } catch {}
}
export function isMissionCompleted(missionProgress = {}, mission = null, index = null) {
  if (!missionProgress || typeof missionProgress !== "object") return false;
  const byIndex = index != null && !!missionProgress[index];
  const byId = mission?.id != null && !!missionProgress[mission.id];
  return byIndex || byId;
}
export function countIncompleteMissions(missions = [], missionProgress = {}) {
  return (missions || []).filter((mission, index) => !isMissionCompleted(missionProgress, mission, index)).length;
}

// ===== DAILY MISSION STREAK =====
const MISSION_STREAK_KEY = "cod-mission-streak-v1";

export function getMissionStreak() {
  try {
    const raw = localStorage.getItem(MISSION_STREAK_KEY);
    return raw ? JSON.parse(raw) : { streak: 0, lastCompleted: null };
  } catch { return { streak: 0, lastCompleted: null }; }
}

export function buildMissionStreakState(state, now = new Date()) {
  const today = getMissionDayKey(now);
  if (!today) return { streak: 0, lastCompleted: null };

  const previous = state && typeof state === "object" ? state : {};
  const previousStreak = Number.isFinite(Number(previous.streak))
    ? Math.max(0, Math.floor(Number(previous.streak)))
    : 0;
  if (previous.lastCompleted === today) {
    return { streak: previousStreak, lastCompleted: today };
  }

  const yesterdayDate = new Date(now);
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = getMissionDayKey(yesterdayDate);
  return {
    streak: previous.lastCompleted === yesterday ? previousStreak + 1 : 1,
    lastCompleted: today,
  };
}

export function advanceMissionStreak(now = new Date()) {
  try {
    const state = getMissionStreak();
    const next = buildMissionStreakState(state, now);
    if (state.lastCompleted === next.lastCompleted && Number(state.streak) === next.streak) return next;
    persistProgression(MISSION_STREAK_KEY, JSON.stringify(next));
    return next;
  } catch { return { streak: 0, lastCompleted: null }; }
}

export function resetMissionStreak() {
  try { persistProgression(MISSION_STREAK_KEY, JSON.stringify({ streak: 0, lastCompleted: null })); } catch {}
}

// ===== META PROGRESSION =====
const META_KEY = "cod-meta-v2";
const DEFAULT_META = { careerPoints: 0, upgradeTiers: {}, prestige: 0, playerSkin: "" };

export function loadMetaProgress() {
  try {
    const raw = localStorage.getItem(META_KEY);
    if (!raw) return { ...DEFAULT_META };
    const parsed = JSON.parse(raw);
    // migrate old v1 schema (unlocks array → upgradeTiers tier 1)
    if (parsed.unlocks && !parsed.upgradeTiers) {
      const ut = {};
      ["veteran","field_medic","swift_boots","deep_mag","hardened","scavenger"].forEach(id => {
        if ((parsed.unlocks || []).includes(id)) ut[id] = 1;
      });
      parsed.upgradeTiers = ut;
      delete parsed.unlocks;
    }
    return { ...DEFAULT_META, ...parsed };
  } catch { return { ...DEFAULT_META }; }
}

export function saveMetaProgress(meta) {
  try { persistProgression(META_KEY, JSON.stringify(meta)); } catch {}
}

export function addCareerPoints(amount) {
  const meta = loadMetaProgress();
  meta.careerPoints = (meta.careerPoints || 0) + amount;
  saveMetaProgress(meta); return meta;
}

// Purchase the next sequential tier (1, 2, or 3) of a tiered upgrade group.
export function purchaseMetaUpgrade(groupId, tier, cost) {
  const meta = loadMetaProgress();
  const currentTier = (meta.upgradeTiers || {})[groupId] || 0;
  if (tier !== currentTier + 1) return { success: false, meta };
  if ((meta.careerPoints || 0) < cost) return { success: false, meta };
  meta.careerPoints -= cost;
  meta.upgradeTiers = { ...(meta.upgradeTiers || {}), [groupId]: tier };
  saveMetaProgress(meta);
  return { success: true, meta };
}

// Prestige: resets career points + all upgrade tiers. Increments prestige counter.
// Career kill records and achievements are preserved separately.
export function prestigeAccount() {
  const meta = loadMetaProgress();
  meta.prestige = (meta.prestige || 0) + 1;
  meta.upgradeTiers = {};
  meta.careerPoints = 0;
  saveMetaProgress(meta);
  return meta;
}

// ===== CALLSIGN LOCK =====
// Persists the player's chosen callsign so return visits skip the username screen.
const CALLSIGN_KEY = "cod-callsign-v1";

export function getLockedCallsign() {
  try { return localStorage.getItem(CALLSIGN_KEY) || null; } catch { return null; }
}

export function lockCallsign(name) {
  try { if (name) persistProgression(CALLSIGN_KEY, name); } catch {}
}

export function clearLockedCallsign() {
  try { removeProgression(CALLSIGN_KEY); } catch {}
}

// ===== DOCTRINE ARCHIVE =====
// Permanent record of which build archetypes have ever reached "DOCTRINE FORGED"
// status (src/utils/buildArchetypes.js doctrineForgeAt). Unlike the per-run
// archetypeUnlocksRef in App.jsx, this persists across runs like achievements.
const DOCTRINE_ARCHIVE_KEY = "cod-doctrine-archive-v1";

export function loadDoctrineArchive() {
  try {
    const raw = JSON.parse(localStorage.getItem(DOCTRINE_ARCHIVE_KEY) || "{}");
    return raw && typeof raw === "object" ? raw : {};
  } catch { return {}; }
}

export function isDoctrineForged(archetypeId, archive = null) {
  const record = archive || loadDoctrineArchive();
  return Boolean(record[archetypeId]);
}

export function recordDoctrineForge(archetypeId) {
  if (!archetypeId) return loadDoctrineArchive();
  try {
    const archive = loadDoctrineArchive();
    if (!archive[archetypeId]) {
      archive[archetypeId] = { firstForgedAt: Date.now() };
      persistProgression(DOCTRINE_ARCHIVE_KEY, JSON.stringify(archive));
    }
    return archive;
  } catch { return loadDoctrineArchive(); }
}

// ===== RUN HISTORY =====
const RUN_HISTORY_KEY = "cod-run-history-v1";

export function saveRunToHistory(run) {
  // run: { score, kills, wave, time, difficulty, mode, runSeed, modifier, ts }
  try {
    const history = JSON.parse(localStorage.getItem(RUN_HISTORY_KEY) || "[]");
    history.unshift({ ...run, ts: Date.now() });
    persistProgression(RUN_HISTORY_KEY, JSON.stringify(history.slice(0, 50)));
  } catch {}
}

const FIELD_REPORTS_KEY = "cod-field-reports-v1";

export function loadFieldReports(limit = 20) {
  try {
    const reports = JSON.parse(localStorage.getItem(FIELD_REPORTS_KEY) || "[]");
    return Array.isArray(reports) ? reports.slice(0, Math.max(1, limit)) : [];
  } catch { return []; }
}

export function saveFieldReport(report = {}) {
  const feedback = ["too_easy", "dialed_in", "brutal"].includes(report.feedback) ? report.feedback : null;
  if (!feedback) return loadFieldReports();
  const reports = loadFieldReports(50);
  const next = [{
    feedback,
    mode: VALID_MODES.has(report.mode) ? report.mode : "standard",
    difficulty: VALID_DIFFICULTIES.has(report.difficulty) ? report.difficulty : "normal",
    score: _clampInt(report.score, 0, 10000000, 0),
    kills: _clampInt(report.kills, 0, 1000000, 0),
    wave: _clampInt(report.wave, 1, 10000, 1),
    runSeed: report.runSeed == null ? null : _clampInt(report.runSeed, 0, 999999999, 0),
    ts: Date.now(),
  }, ...reports].slice(0, 50);
  persistProgression(FIELD_REPORTS_KEY, JSON.stringify(next));
  return next;
}

export function loadRunHistory() {
  try {
    return JSON.parse(localStorage.getItem(RUN_HISTORY_KEY) || "[]");
  } catch { return []; }
}

// ===== STUDIO EVENTS / RIVALRY HISTORY =====
const STUDIO_EVENTS_KEY = "cod-studio-events-v1";
const RIVALRY_HISTORY_KEY = "cod-rivalry-history-v1";
const MAX_STUDIO_EVENTS = 100;
const STUDIO_SYNC_THROTTLE_MS = 15000;
let studioEventSyncPromise = null;
let studioEventLastAttemptAt = 0;

function makeStudioEventId() {
  try {
    if (typeof crypto?.randomUUID === "function") return crypto.randomUUID();
  } catch {}
  return `studio-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeStudioGameEvent(event = {}) {
  const syncStatus = event?.syncedAt
    ? "synced"
    : event?.syncStatus === "failed"
      ? "failed"
      : "pending";
  return {
    schema: event?.schema || "vaultspark.game-event.v1",
    contractVersion: _clampInt(event?.contractVersion, 1, 99, 1),
    game: event?.game || "call-of-doodie",
    type: _cleanText(event?.type, 40, "unknown"),
    category: _cleanText(event?.category, 24, "system"),
    surface: _cleanText(event?.surface, 40, "gameplay"),
    createdAt: _cleanText(event?.createdAt, 40, new Date().toISOString()),
    summary: _cleanText(event?.summary, 140, ""),
    payload: event?.payload && typeof event.payload === "object" ? event.payload : {},
    clientEventId: _cleanText(event?.clientEventId, 80, makeStudioEventId()),
    syncStatus,
    syncAttempts: _clampInt(event?.syncAttempts, 0, 999, 0),
    lastSyncAttemptAt: event?.lastSyncAttemptAt || null,
    syncedAt: event?.syncedAt || null,
    lastSyncError: event?.lastSyncError ? _cleanText(event.lastSyncError, 160, "") : null,
  };
}

function persistStudioGameEvents(events) {
  try {
    persistProgression(STUDIO_EVENTS_KEY, JSON.stringify(events.slice(0, MAX_STUDIO_EVENTS)));
  } catch {}
}

function getPendingStudioGameEvents(limit = 25) {
  return loadStudioGameEvents()
    .filter((event) => event.syncStatus === "pending")
    .slice()
    .reverse()
    .slice(0, limit);
}

function serializeStudioEventForSync(event) {
  return {
    clientEventId: event.clientEventId,
    schema: event.schema,
    contractVersion: event.contractVersion,
    game: event.game,
    type: event.type,
    category: event.category,
    surface: event.surface,
    createdAt: event.createdAt,
    summary: event.summary,
    payload: event.payload,
  };
}

export function saveStudioGameEvent(event) {
  const normalized = normalizeStudioGameEvent(event);
  try {
    const events = loadStudioGameEvents();
    events.unshift(normalized);
    persistStudioGameEvents(events);
  } catch {}
  return normalized;
}

export function loadStudioGameEvents() {
  try {
    return JSON.parse(localStorage.getItem(STUDIO_EVENTS_KEY) || "[]")
      .map((event) => normalizeStudioGameEvent(event));
  }
  catch { return []; }
}

export async function syncStudioGameEvents({ limit = 25 } = {}) {
  const pending = getPendingStudioGameEvents(limit);
  if (pending.length === 0) {
    return { ok: true, synced: 0, pending: 0, failed: 0, reason: "empty" };
  }
  if (!supabaseUrl || !supabaseAnonKey) {
    return { ok: false, synced: 0, pending: pending.length, failed: 0, reason: "env_missing" };
  }
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return { ok: false, synced: 0, pending: pending.length, failed: 0, reason: "offline" };
  }

  const attemptAt = new Date().toISOString();
  const pendingIds = new Set(pending.map((event) => event.clientEventId));
  const attempted = loadStudioGameEvents().map((event) => (
    pendingIds.has(event.clientEventId)
      ? {
          ...event,
          syncAttempts: event.syncAttempts + 1,
          lastSyncAttemptAt: attemptAt,
          lastSyncError: null,
        }
      : event
  ));
  persistStudioGameEvents(attempted);

  try {
    const response = await invokeEdgeFunction("sync-studio-events", {
      clientUid: getOrCreateClientUid(),
      events: pending.map(serializeStudioEventForSync),
    });
    if (!response.ok) {
      throw new Error(response.data?.error || "Studio event sync failed.");
    }

    const syncedAt = new Date().toISOString();
    const updated = loadStudioGameEvents().map((event) => (
      pendingIds.has(event.clientEventId)
        ? {
            ...event,
            syncStatus: "synced",
            syncedAt,
            lastSyncError: null,
          }
        : event
    ));
    persistStudioGameEvents(updated);
    const failed = updated.filter((event) => event.syncStatus === "failed").length;
    const remainingPending = updated.filter((event) => event.syncStatus !== "synced").length;
    return {
      ok: true,
      synced: pending.length,
      pending: remainingPending,
      failed,
      inserted: _clampInt(response.data?.inserted, 0, pending.length, pending.length),
      deduped: _clampInt(response.data?.deduped, 0, pending.length, 0),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Studio event sync failed.";
    const updated = loadStudioGameEvents().map((event) => (
      pendingIds.has(event.clientEventId)
        ? {
            ...event,
            syncStatus: "failed",
            lastSyncError: _cleanText(message, 160, "Studio event sync failed."),
          }
        : event
    ));
    persistStudioGameEvents(updated);
    return {
      ok: false,
      synced: 0,
      pending: updated.filter((event) => event.syncStatus === "pending").length,
      failed: updated.filter((event) => event.syncStatus === "failed").length,
      reason: message,
    };
  }
}

export function requestStudioEventSync({ limit = 25, force = false } = {}) {
  if (studioEventSyncPromise) return studioEventSyncPromise;
  const now = Date.now();
  if (!force && now - studioEventLastAttemptAt < STUDIO_SYNC_THROTTLE_MS) {
    const pending = loadStudioGameEvents().filter((event) => event.syncStatus !== "synced").length;
    return Promise.resolve({ ok: true, synced: 0, pending, failed: 0, reason: "throttled" });
  }
  studioEventLastAttemptAt = now;
  studioEventSyncPromise = syncStudioGameEvents({ limit })
    .finally(() => { studioEventSyncPromise = null; });
  return studioEventSyncPromise;
}

export function recordRivalryResult({ seed, vsScore = null, vsName = null, score = 0, wave = 1, mode = "standard", difficulty = "normal" } = {}) {
  if (!seed) return null;
  const result = {
    seed,
    vsScore,
    vsName,
    score,
    wave,
    mode,
    difficulty,
    won: vsScore == null ? null : score >= vsScore,
    delta: vsScore == null ? null : score - vsScore,
    ts: Date.now(),
  };
  try {
    const history = JSON.parse(localStorage.getItem(RIVALRY_HISTORY_KEY) || "[]");
    history.unshift(result);
    persistProgression(RIVALRY_HISTORY_KEY, JSON.stringify(history.slice(0, 20)));
  } catch {}
  return result;
}

export function loadRivalryHistory() {
  try { return JSON.parse(localStorage.getItem(RIVALRY_HISTORY_KEY) || "[]"); }
  catch { return []; }
}

/**
 * Record an enemy-type death in the rolling "recent deaths" window used by
 * adaptive enemy telegraphing (#7). Caller passes the enemy type id (string
 * or number from ENEMY_TYPES). We keep the last 20 deaths.
 */
export function recordDeathByEnemy(typeId) {
  if (typeId == null) return;
  const career = loadCareerStats();
  const arr = Array.isArray(career.recentDeathsByEnemy) ? career.recentDeathsByEnemy : [];
  arr.unshift({ t: String(typeId), ts: Date.now() });
  career.recentDeathsByEnemy = arr.slice(0, 20);
  if (!career.enemyKillBests) career.enemyKillBests = {};
  const kbRec = career.enemyKillBests[typeId] || { waveMax: 0, careerKills: 0, killedByCount: 0 };
  kbRec.killedByCount = (kbRec.killedByCount || 0) + 1;
  career.enemyKillBests[typeId] = kbRec;
  try { persistProgression(CAREER_KEY, JSON.stringify(career)); } catch {}
}

export function updateEnemyCareerStatsBatch(killsByType) {
  if (!killsByType || !Object.keys(killsByType).length) return;
  const career = loadCareerStats();
  if (!career.enemyKillBests) career.enemyKillBests = {};
  for (const [typeIdx, waveKills] of Object.entries(killsByType)) {
    const rec = career.enemyKillBests[typeIdx] || { waveMax: 0, careerKills: 0, killedByCount: 0 };
    rec.careerKills = (rec.careerKills || 0) + waveKills;
    rec.waveMax = Math.max(rec.waveMax || 0, waveKills);
    career.enemyKillBests[typeIdx] = rec;
  }
  saveCareerStats(career);
}

/**
 * Returns spawn-weight damp factors for the top-2 killer enemy types when
 * the player has died to them 3+ times in the last 20 deaths. Each entry is
 * { [typeId]: dampFactor } where dampFactor 0.15 means a 15% chance to
 * substitute that type with a basic enemy on spawn. Cap: top-2 types only.
 */
export function getAdaptiveSpawnMods(career) {
  try {
    const arr = Array.isArray(career?.recentDeathsByEnemy) ? career.recentDeathsByEnemy : [];
    if (arr.length < 3) return {};
    const counts = {};
    arr.forEach(d => { counts[d.t] = (counts[d.t] || 0) + 1; });
    const eligible = Object.entries(counts)
      .filter(([, n]) => n >= 3)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2);
    const mods = {};
    eligible.forEach(([typeId]) => { mods[typeId] = 0.15; });
    return mods;
  } catch { return {}; }
}

/**
 * Returns a multiplier (1.0 → 2.0) applied to enemy ability warning windows.
 * 1.0 = no help (player is fine vs this enemy); 2.0 = double the warning
 * window because the player has died to this type 3+ times in last 5 runs.
 * Always returns 1.0 if the player has < 3 recent deaths to this type.
 */
export function getTelegraphMultiplier(typeId) {
  if (typeId == null) return 1;
  try {
    const career = loadCareerStats();
    const arr = Array.isArray(career.recentDeathsByEnemy) ? career.recentDeathsByEnemy : [];
    const matches = arr.filter(d => d.t === String(typeId)).length;
    if (matches >= 3) return 2.0;
    if (matches >= 2) return 1.5;
    return 1;
  } catch { return 1; }
}

const LEGEND_THRESHOLDS = [
  { min: 1000, label: "LEGEND", color: "#FF6B35" },
  { min: 500,  label: "ELITE",  color: "#FFD700" },
  { min: 200,  label: "VETERAN", color: "#C0C0C0" },
  { min: 50,   label: "RECRUIT", color: "#CD7F32" },
];
export function getWeaponLegendRank(kills) {
  for (const t of LEGEND_THRESHOLDS) { if ((kills || 0) >= t.min) return t; }
  return null;
}

export function updateCareerStats({ kills, deaths, score, wave, streak, damage, playTime, achievementIds, crits, grenades, dashes, level, combo, bossKills, weaponKills, totalShots = 0, totalHits = 0, practiceRun = false }) {
  const career = loadCareerStats();
  career.totalRuns += 1;
  if (practiceRun) {
    // REMATCH is a correction drill, not a second progression economy. Keep
    // only honest session bookkeeping; every unlock/record/mastery input is
    // deliberately ignored so a high-wave restart cannot farm the career.
    career.totalDeaths += (deaths || 0);
    career.totalPlayTime += Math.floor(playTime || 0);
    saveCareerStats(career);
    return { career, weaponMilestones: [], practiceExcluded: true };
  }
  career.totalKills += (kills || 0);
  career.totalDeaths += (deaths || 0);
  career.totalScore = (career.totalScore || 0) + (score || 0);
  career.bestScore = Math.max(career.bestScore, score || 0);
  career.bestWave = Math.max(career.bestWave, wave || 0);
  career.bestStreak = Math.max(career.bestStreak, streak || 0);
  career.bestKills = Math.max(career.bestKills || 0, kills || 0);
  career.bestCombo = Math.max(career.bestCombo || 0, combo || 0);
  career.bestLevel = Math.max(career.bestLevel || 0, level || 0);
  career.totalDamage += Math.floor(damage || 0);
  career.totalCrits = (career.totalCrits || 0) + (crits || 0);
  career.totalGrenades = (career.totalGrenades || 0) + (grenades || 0);
  career.totalDashes = (career.totalDashes || 0) + (dashes || 0);
  career.totalBossKills = (career.totalBossKills || 0) + (bossKills || 0);
  career.totalShots = (career.totalShots || 0) + Math.max(0, Math.floor(totalShots || 0));
  career.totalHits = (career.totalHits || 0) + Math.max(0, Math.floor(totalHits || 0));
  career.totalPlayTime += Math.floor(playTime || 0);
  if (achievementIds?.length) {
    const all = new Set([...career.achievementsEver, ...achievementIds]);
    career.achievementsEver = [...all];
  }
  // Per-weapon legend kill tracking — detect threshold crossings this run
  const weaponMilestones = [];
  if (Array.isArray(weaponKills) && weaponKills.length > 0) {
    if (!Array.isArray(career.weaponLegendKills)) career.weaponLegendKills = [];
    while (career.weaponLegendKills.length < weaponKills.length) career.weaponLegendKills.push(0);
    weaponKills.forEach((k, i) => {
      const prev = career.weaponLegendKills[i] || 0;
      const next = prev + (k || 0);
      career.weaponLegendKills[i] = next;
      // Did this run push through a threshold?
      for (const t of LEGEND_THRESHOLDS) {
        if (prev < t.min && next >= t.min) { weaponMilestones.push({ weaponIdx: i, ...t }); break; }
      }
    });
  }
  saveCareerStats(career);
  // Credit career points (1 per kill)
  if (kills > 0) addCareerPoints(kills);
  return { career, weaponMilestones };
}

// ===== RHYTHM MASTERY =====
// Persistent career stat: total beat-precision hits (on-beat precision shots).
// Stored inside career stats under `rhythmMasteryHits`.

export function trackRhythmMasteryHit() {
  try {
    const career = loadCareerStats();
    career.rhythmMasteryHits = (career.rhythmMasteryHits || 0) + 1;
    saveCareerStats(career);
    return career.rhythmMasteryHits;
  } catch { return 0; }
}

export function getRhythmMastery() {
  try {
    const career = loadCareerStats();
    return career.rhythmMasteryHits || 0;
  } catch { return 0; }
}

// ===== CUSTOM LOADOUTS =====
const CUSTOM_LOADOUTS_KEY = "cod-custom-loadouts-v1";

export function loadCustomLoadouts() {
  try { return JSON.parse(localStorage.getItem(CUSTOM_LOADOUTS_KEY) || "[null,null,null]"); }
  catch { return [null, null, null]; }
}

export function saveCustomLoadout(idx, loadout) {
  // loadout: { name, weaponIdx, starterLoadout } | null (to clear)
  try {
    const slots = loadCustomLoadouts();
    slots[idx] = loadout;
    persistProgression(CUSTOM_LOADOUTS_KEY, JSON.stringify(slots));
  } catch {}
}

// ===== META PROGRESSION TREE =====
const META_TREE_KEY = "cod-meta-tree-v1";

/** Returns Set of unlocked node IDs. */
export function loadMetaTree() {
  try {
    const raw = localStorage.getItem(META_TREE_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch { return new Set(); }
}

/** Saves a Set of unlocked node IDs. */
function _saveMetaTree(unlocked) {
  try { persistProgression(META_TREE_KEY, JSON.stringify([...unlocked])); } catch {}
}

/**
 * Unlock a META_TREE node, deducting its cost from career points.
 * Returns { success, reason } — caller should re-load meta progress after success.
 */
const BOSS_KILLS_KEY = "cod-boss-kills-v1";
const NEMESIS_THRESHOLD_DEATHS = 3;

export function getBossKillRecord(bossType) {
  try {
    const all = JSON.parse(localStorage.getItem(BOSS_KILLS_KEY) || "{}");
    const t = String(bossType);
    return { kills: Number(all[t]?.kills || 0), deaths: Number(all[t]?.deaths || 0) };
  } catch { return { kills: 0, deaths: 0 }; }
}

export function saveBossKillRecord(bossType, { kills = 0, deaths = 0 } = {}) {
  try {
    const all = JSON.parse(localStorage.getItem(BOSS_KILLS_KEY) || "{}");
    const t = String(bossType);
    all[t] = { kills, deaths };
    persistProgression(BOSS_KILLS_KEY, JSON.stringify(all));
    return all[t];
  } catch { return null; }
}

export function isNemesis(bossType) {
  const rec = getBossKillRecord(bossType);
  return rec.deaths >= NEMESIS_THRESHOLD_DEATHS && rec.kills === 0;
}

const EXPERIMENT_INTENT_KEY = "cod-last-experiment-v1";

export function saveExperimentIntent(suggestion) {
  if (!suggestion) return;
  try { persistProgression(EXPERIMENT_INTENT_KEY, JSON.stringify({ suggestion, ts: Date.now() })); } catch {}
}

export function loadExperimentIntent() {
  try {
    const raw = localStorage.getItem(EXPERIMENT_INTENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.suggestion ? parsed : null;
  } catch { return null; }
}

export function clearExperimentIntent() {
  try { removeProgression(EXPERIMENT_INTENT_KEY); } catch {}
}

export function getWeaponEvolutionState(idx) {
  try {
    const career = loadCareerStats();
    const kills = career.weaponLegendKills?.[idx] || 0;
    const evolved = kills >= 1000;
    return {
      evolved,
      kills,
      name: evolved ? (WEAPON_EVOLVED_NAMES[idx] || null) : null,
      damageMult: evolved ? 1.05 : 1,
    };
  } catch { return { evolved: false, kills: 0, name: null, damageMult: 1 }; }
}

export function getWaveDeathCounts() {
  try {
    const raw = localStorage.getItem(LB_KEY);
    const all = raw ? JSON.parse(raw) : [];
    const counts = {};
    for (const entry of all) {
      const w = entry?.wave;
      if (w != null && w > 0) counts[w] = (counts[w] || 0) + 1;
    }
    return counts;
  } catch { return {}; }
}

// Returns a Set of wave numbers that are community choke points (≥3× the median death count).
// Uses the same leaderboard snapshot as getWaveDeathCounts(); both read the same key so callers
// should batch them or reuse results to avoid double parsing.
export function getCommunityChokePoints(counts) {
  try {
    const src = counts || getWaveDeathCounts();
    const vals = Object.values(src);
    if (!vals.length) return new Set();
    const sorted = [...vals].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    const threshold = median * 3;
    const chokes = new Set();
    for (const [w, c] of Object.entries(src)) {
      if (c >= threshold && threshold > 0) chokes.add(Number(w));
    }
    return chokes;
  } catch { return new Set(); }
}

export function unlockMetaNode(nodeId, cost) {
  const unlocked = loadMetaTree();
  if (unlocked.has(nodeId)) return { success: false, reason: "already_unlocked" };
  const meta = loadMetaProgress();
  const points = meta.careerPoints || 0;
  if (points < cost) return { success: false, reason: "insufficient_points" };
  meta.careerPoints = points - cost;
  saveMetaProgress(meta);
  unlocked.add(nodeId);
  _saveMetaTree(unlocked);
  return { success: true };
}

// ── S163 Sewer Extraction stash ─────────────────────────────────────────────
const STASH_KEY = "cod-stash-v1";
export function loadStash() {
  try { const v = JSON.parse(localStorage.getItem(STASH_KEY) || "null"); if (v && typeof v === "object") return { total: Number(v.total) || 0, runs: Number(v.runs) || 0, best: Number(v.best) || 0, last: v.last || null }; } catch {}
  return { total: 0, runs: 0, best: 0, last: null };
}
export function saveStash(stash) {
  try { localStorage.setItem(STASH_KEY, JSON.stringify(stash)); } catch {}
  return stash;
}

// ── S163 progress backup (guest-safe export/import + cloud blob) ────────────
const BACKUP_SCHEMA = "cod-progress-backup-v1";
export function exportProgressBackup(storage = globalThis.localStorage) {
  const entries = {};
  try {
    for (let i = 0; i < storage.length; i += 1) {
      const key = storage.key(i);
      if (key && key.startsWith("cod-")) entries[key] = storage.getItem(key);
    }
  } catch {}
  return { schema: BACKUP_SCHEMA, exportedAt: new Date().toISOString(), keys: Object.keys(entries).length, entries };
}
export function importProgressBackup(backup, storage = globalThis.localStorage) {
  const parsed = typeof backup === "string" ? JSON.parse(backup) : backup;
  if (!parsed || parsed.schema !== BACKUP_SCHEMA || typeof parsed.entries !== "object") throw new Error("Not a Call of Doodie progress backup");
  let restored = 0;
  for (const [key, value] of Object.entries(parsed.entries)) {
    if (!key.startsWith("cod-") || typeof value !== "string" || value.length > 2_000_000) continue;
    try { storage.setItem(key, value); restored += 1; } catch {}
  }
  return { restored, exportedAt: parsed.exportedAt || null };
}

// ── S163 live ghost race: the top scorer's downsampled path for a board ──────
export async function loadTopGhostPath(mode = "standard", difficulty = "normal", { sinceMs = 7 * 86400000, now = Date.now() } = {}) {
  const supabase = await getSupabaseClient();
  if (!supabase) return null;
  try {
    const sinceIso = new Date(now - sinceMs).toISOString();
    let q = supabase.from("leaderboard").select("name,score,wave,ghost_path,created_at").eq("difficulty", difficulty).not("ghost_path", "is", null).gte("created_at", sinceIso).order("score", { ascending: false }).limit(1);
    q = mode === "standard" ? q.or("mode.is.null,mode.eq.standard") : q.eq("mode", mode);
    const { data, error } = await q;
    if (error || !data?.length || !data[0].ghost_path) return null;
    return { name: data[0].name, score: data[0].score, wave: data[0].wave, path: data[0].ghost_path };
  } catch { return null; }
}
