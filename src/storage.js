// ===== LEADERBOARD =====
import { supabase, getAuthUid } from "./supabase.js";

// ── Score integrity checksum ──────────────────────────────────────────────────
// Lightweight fingerprint — not cryptographically secure (key is client-visible)
// but raises the bar significantly against casual devtools manipulation.
const _SIG_KEY = "c0d-v1-integrity";
async function _signRow(row) {
  const payload = `${row.score}|${row.kills}|${row.wave}|${row.seed ?? ""}|${row.ts}`;
  try {
    const enc = new TextEncoder();
    const keyMat = await crypto.subtle.importKey("raw", enc.encode(_SIG_KEY), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const sig = await crypto.subtle.sign("HMAC", keyMat, enc.encode(payload));
    return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("").slice(0, 16);
  } catch { return "00000000"; }
}

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
//   ALTER TABLE leaderboard ADD COLUMN IF NOT EXISTS "sig" text;
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
    return true;
  } catch (err) {
    // Fails silently until SQL migration is applied in Supabase console
    console.warn("[callsign] Claim failed (run SQL migration in Supabase console):", err.message);
    return false;
  }
}

const LB_KEY = "cod-lb-v5"; // kept as localStorage fallback key

export async function loadLeaderboard(offset = 0, limit = 50) {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("leaderboard")
        .select("name,score,kills,wave,lastWords,rank,bestStreak,totalDamage,level,time,achievements,difficulty,ts,starterLoadout,customSettings,inputDevice,seed,accountLevel,mode")
        .order("score", { ascending: false })
        .range(offset, offset + limit - 1);
      if (error) throw error;
      return data || [];
    } catch (err) {
      console.warn("[leaderboard] Supabase read failed, using local cache:", err.message);
    }
  }
  // Fallback: localStorage
  try {
    const raw = localStorage.getItem(LB_KEY);
    const all = raw ? JSON.parse(raw) : [];
    return all.slice(offset, offset + limit);
  } catch { return []; }
}

// ── Vault Member integration (silent, non-blocking) ─────────────────────────
// If the player has a Vault Member session on this domain, their game session
// is recorded and they earn vault points. No redirect, no login prompt.
// Vault Members are players who registered at vaultsparkstudios.com/vault-member/
async function _tryAwardVaultPoints(entry) {
  if (!supabase) return;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    // Only award points to real vault members (not anonymous sessions)
    if (session.user.is_anonymous) return;

    const { data: member } = await supabase
      .from('vault_members')
      .select('id')
      .eq('id', session.user.id)
      .maybeSingle();
    if (!member) return;

    // Write game session
    await supabase.from('game_sessions').insert([{
      user_id:    session.user.id,
      game_slug:  'call-of-doodie',
      score:      entry.score      || 0,
      duration_s: entry.timeSurvived || 0,
      metadata: {
        kills:       entry.kills,
        wave:        entry.wave,
        level:       entry.level,
        difficulty:  entry.difficulty,
        mode:        entry.mode || 'standard',
        bestStreak:  entry.bestStreak,
        achievements: entry.achievements,
      },
    }]);

    // Award vault points (3 pts per game session)
    await supabase.rpc('award_vault_points', {
      p_user_id:    session.user.id,
      p_event_type: 'game_session',
      p_points:     3,
      p_metadata:   { game: 'call-of-doodie', score: entry.score, wave: entry.wave },
    });
  } catch {
    // Non-critical — never surface vault errors to the player
  }
}

export async function saveToLeaderboard(entry) {
  const ts = Date.now();
  const sig = await _signRow({ ...entry, ts });
  const row = { ...entry, ts, game_id: 'cod', sig };

  // Fire vault integration in parallel — does not block leaderboard submit
  _tryAwardVaultPoints(entry);

  if (supabase) {
    try {
      const { error } = await supabase.from("leaderboard").insert([row]);
      if (error) throw error;
      const board = await loadLeaderboard();
      return { board, online: true };
    } catch (err) {
      console.warn("[leaderboard] Supabase write failed, saving locally:", err.message);
    }
  }
  // Fallback: localStorage
  try {
    const board = JSON.parse(localStorage.getItem(LB_KEY) || "[]");
    board.push(row);
    board.sort((a, b) => b.score - a.score);
    const top = board.slice(0, 100);
    localStorage.setItem(LB_KEY, JSON.stringify(top));
    return { board: top, online: false };
  } catch { return { board: [], online: false }; }
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
