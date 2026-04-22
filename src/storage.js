// ===== LEADERBOARD =====
import { supabase, supabaseUrl, supabaseAnonKey, getAuthUid, getOrCreateClientUid } from "./supabase.js";
import { isSupporter } from "./utils/supporter.js";

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
  if (!supabase || !name) return false;
  try {
    const uid = await getAuthUid();
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
const VALID_MODES = new Set(["score_attack", "daily_challenge", "boss_rush", "cursed", "speedrun", "gauntlet", "normal"]);
const VALID_DIFFICULTIES = new Set(["easy", "normal", "hard", "insane"]);
const VALID_INPUT_DEVICES = new Set(["mouse", "mobile", "controller", "generic", "xbox", "ps"]);

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
    const { data: { session } } = await supabase.auth.getSession();
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
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("leaderboard")
        .select("name,score,kills,wave,lastWords,rank,bestStreak,totalDamage,level,time,achievements,difficulty,ts,starterLoadout,customSettings,inputDevice,seed,accountLevel,mode,prestige,supporter")
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

// Note: requires Supabase migration: ALTER TABLE leaderboard ADD COLUMN IF NOT EXISTS prestige integer DEFAULT 0;
// Online submit path expects the Supabase Edge Function `submit-score` to be deployed.
export async function saveToLeaderboard(entry) {
  const rawRunToken = typeof entry?.runToken === "string" ? entry.runToken.trim() : "";
  const safeEntry = normalizeLeaderboardEntry({ ...entry, supporter: isSupporter() });

  if (supabase && supabaseUrl && supabaseAnonKey) {
    try {
      const response = await invokeEdgeFunction("submit-score", {
        ...safeEntry,
        runToken: rawRunToken,
        clientUid: getOrCreateClientUid(),
        summarySig: typeof entry?.summarySig === "string" ? entry.summarySig.trim() : "",
        eventDigest: entry?.eventDigest && typeof entry.eventDigest === "object" ? entry.eventDigest : null,
      });
      if (!response.ok) {
        const failure = {
          board: await loadLeaderboard(),
          online: false,
          submission: "rejected",
          rejectionReason: response.data?.error || "Score submission rejected.",
          rejectionReasons: Array.isArray(response.data?.reasons) ? response.data.reasons : [],
        };
        if (response.status >= 400 && response.status < 500) {
          return failure;
        }
        throw new Error(failure.rejectionReason);
      }
      const board = await loadLeaderboard();
      return { board, online: true, submission: "online", rejectionReason: null, rejectionReasons: [] };
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
    localStorage.setItem(LB_KEY, JSON.stringify(top));
    return { board: top, online: false, submission: "local", rejectionReason: null, rejectionReasons: [] };
  } catch { return { board: [], online: false, submission: "local", rejectionReason: null, rejectionReasons: [] }; }
}

export async function issueRunToken({ mode = null, difficulty = "normal", seed = null, starterLoadout = "standard" } = {}) {
  if (!supabase || !supabaseUrl || !supabaseAnonKey) return null;
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

// ===== LEADERBOARD — TODAY / SEARCH / RANK =====

/** Fetch today's top 50 entries (since midnight UTC). Optional mode + difficulty filters. */
export async function loadLeaderboardToday(mode = null, difficulty = null) {
  if (!supabase) return [];
  try {
    const midnight = new Date(); midnight.setHours(0, 0, 0, 0);
    let q = supabase
      .from("leaderboard")
      .select("name,score,kills,wave,lastWords,rank,bestStreak,totalDamage,level,time,achievements,difficulty,ts,starterLoadout,customSettings,inputDevice,seed,accountLevel,mode,prestige,supporter,created_at")
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

/** Search leaderboard by player name (case-insensitive partial match). */
export async function searchLeaderboard(nameQuery) {
  if (!supabase || !nameQuery.trim()) return [];
  try {
    const { data, error } = await supabase
      .from("leaderboard")
      .select("name,score,kills,wave,difficulty,mode,ts,accountLevel,inputDevice,starterLoadout,seed,level,time,lastWords,bestStreak,totalDamage,achievements,rank,customSettings,prestige,supporter")
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
  if (!supabase || score == null) return null;
  try {
    if (mode === "speedrun" && time) {
      const timeRows = await supabase
        .from("leaderboard")
        .select("time,score", { count: "exact" })
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
  totalPlayTime: 0,
  achievementsEver: [],
};

export function loadCareerStats() {
  try {
    const raw = localStorage.getItem(CAREER_KEY);
    if (!raw) return { ...DEFAULT_CAREER };
    return { ...DEFAULT_CAREER, ...JSON.parse(raw) };
  } catch { return { ...DEFAULT_CAREER }; }
}

export function saveCareerStats(stats) {
  try { localStorage.setItem(CAREER_KEY, JSON.stringify(stats)); } catch {}
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
  localStorage.setItem("cod-daily-" + getTodayKey(), "1");
}

export function getTodayKey() {
  const d = new Date();
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
  try { localStorage.setItem("cod-missions-" + getTodayKey(), JSON.stringify(completed)); } catch {}
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
  try { localStorage.setItem(META_KEY, JSON.stringify(meta)); } catch {}
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

// Account level derived from total career kills (never resets on prestige).
export function getAccountLevel(totalKills) {
  return Math.floor(Math.sqrt((totalKills || 0) / 20)) + 1;
}

// ===== CALLSIGN LOCK =====
// Persists the player's chosen callsign so return visits skip the username screen.
const CALLSIGN_KEY = "cod-callsign-v1";

export function getLockedCallsign() {
  try { return localStorage.getItem(CALLSIGN_KEY) || null; } catch { return null; }
}

export function lockCallsign(name) {
  try { if (name) localStorage.setItem(CALLSIGN_KEY, name); } catch {}
}

export function clearLockedCallsign() {
  try { localStorage.removeItem(CALLSIGN_KEY); } catch {}
}

// ===== RUN HISTORY =====
const RUN_HISTORY_KEY = "cod-run-history-v1";

export function saveRunToHistory(run) {
  // run: { score, kills, wave, time, difficulty, mode, runSeed, modifier, ts }
  try {
    const history = JSON.parse(localStorage.getItem(RUN_HISTORY_KEY) || "[]");
    history.unshift({ ...run, ts: Date.now() });
    localStorage.setItem(RUN_HISTORY_KEY, JSON.stringify(history.slice(0, 10)));
  } catch {}
}

export function loadRunHistory() {
  try {
    return JSON.parse(localStorage.getItem(RUN_HISTORY_KEY) || "[]");
  } catch { return []; }
}

// ===== STUDIO EVENTS / RIVALRY HISTORY =====
const STUDIO_EVENTS_KEY = "cod-studio-events-v1";
const RIVALRY_HISTORY_KEY = "cod-rivalry-history-v1";

export function saveStudioGameEvent(event) {
  try {
    const events = JSON.parse(localStorage.getItem(STUDIO_EVENTS_KEY) || "[]");
    events.unshift(event);
    localStorage.setItem(STUDIO_EVENTS_KEY, JSON.stringify(events.slice(0, 100)));
  } catch {}
}

export function loadStudioGameEvents() {
  try { return JSON.parse(localStorage.getItem(STUDIO_EVENTS_KEY) || "[]"); }
  catch { return []; }
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
    localStorage.setItem(RIVALRY_HISTORY_KEY, JSON.stringify(history.slice(0, 20)));
  } catch {}
  return result;
}

export function loadRivalryHistory() {
  try { return JSON.parse(localStorage.getItem(RIVALRY_HISTORY_KEY) || "[]"); }
  catch { return []; }
}

export function updateCareerStats({ kills, deaths, score, wave, streak, damage, playTime, achievementIds, crits, grenades, dashes, level, combo, bossKills }) {
  const career = loadCareerStats();
  career.totalRuns += 1;
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
  career.totalPlayTime += Math.floor(playTime || 0);
  if (achievementIds?.length) {
    const all = new Set([...career.achievementsEver, ...achievementIds]);
    career.achievementsEver = [...all];
  }
  saveCareerStats(career);
  // Credit career points (1 per kill)
  if (kills > 0) addCareerPoints(kills);
  return career;
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
    localStorage.setItem(CUSTOM_LOADOUTS_KEY, JSON.stringify(slots));
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
  try { localStorage.setItem(META_TREE_KEY, JSON.stringify([...unlocked])); } catch {}
}

/**
 * Unlock a META_TREE node, deducting its cost from career points.
 * Returns { success, reason } — caller should re-load meta progress after success.
 */
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
