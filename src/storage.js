// ===== LEADERBOARD =====
import { supabase } from "./supabase.js";

const LB_KEY = "cod-lb-v5"; // kept as localStorage fallback key

export async function loadLeaderboard() {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("leaderboard")
        .select("name,score,kills,wave,lastWords,rank,bestStreak,totalDamage,level,time,achievements,difficulty,ts")
        .order("score", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    } catch (err) {
      console.warn("[leaderboard] Supabase read failed, using local cache:", err.message);
    }
  }
  // Fallback: localStorage
  try {
    const raw = localStorage.getItem(LB_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export async function saveToLeaderboard(entry) {
  const row = { ...entry, ts: Date.now() };

  if (supabase) {
    try {
      const { error } = await supabase.from("leaderboard").insert([row]);
      if (error) throw error;
      return await loadLeaderboard();
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
    return top;
  } catch { return []; }
}

// ===== CAREER STATS =====
const CAREER_KEY = "cod-career-v1";

const DEFAULT_CAREER = {
  totalKills: 0,
  totalDeaths: 0,
  totalRuns: 0,
  bestScore: 0,
  bestWave: 0,
  bestStreak: 0,
  totalDamage: 0,
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
  { id: "kill_any",      icon: "☠️",  make: (n) => ({ text: `Kill ${n} enemies`,              goal: n, track: "kills"        }) },
  { id: "reach_wave",    icon: "🌊",  make: (n) => ({ text: `Reach wave ${n}`,                goal: n, track: "wave"         }) },
  { id: "combo",         icon: "🌪️", make: (n) => ({ text: `Land a ×${n} combo`,             goal: n, track: "maxCombo"     }) },
  { id: "damage",        icon: "⚔️",  make: (n) => ({ text: `Deal ${n.toLocaleString()} dmg`, goal: n, track: "totalDamage"  }) },
  { id: "dashes",        icon: "💨",  make: (n) => ({ text: `Dash ${n} times`,                goal: n, track: "dashes"       }) },
  { id: "crits",         icon: "🎯",  make: (n) => ({ text: `Land ${n} crits`,                goal: n, track: "crits"        }) },
  { id: "grenade_kills", icon: "💣",  make: (n) => ({ text: `Kill ${n} with grenades`,        goal: n, track: "grenadeKills" }) },
  { id: "survive",       icon: "⏱️",  make: (n) => ({ text: `Survive ${n}s`,                 goal: n, track: "timeSurvived" }) },
];
const MISSION_PARAMS = {
  kill_any: [15,20,25], reach_wave: [5,6,7], combo: [5,8,10],
  damage: [2000,5000,8000], dashes: [10,15,20], crits: [10,20,25],
  grenade_kills: [3,5,8], survive: [60,90,120],
};
function lcg(s) { return Math.abs((Math.imul(s, 1664525) + 1013904223) | 0); }

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
const META_KEY = "cod-meta-v1";
const DEFAULT_META = { careerPoints: 0, unlocks: [] };
export function loadMetaProgress() {
  try { const raw = localStorage.getItem(META_KEY); return raw ? { ...DEFAULT_META, ...JSON.parse(raw) } : { ...DEFAULT_META }; } catch { return { ...DEFAULT_META }; }
}
export function saveMetaProgress(meta) {
  try { localStorage.setItem(META_KEY, JSON.stringify(meta)); } catch {}
}
export function addCareerPoints(amount) {
  const meta = loadMetaProgress();
  meta.careerPoints = (meta.careerPoints || 0) + amount;
  saveMetaProgress(meta); return meta;
}
export function purchaseMetaUpgrade(upgradeId, cost) {
  const meta = loadMetaProgress();
  if ((meta.careerPoints || 0) < cost || (meta.unlocks || []).includes(upgradeId)) return { success: false, meta };
  meta.careerPoints -= cost;
  meta.unlocks = [...(meta.unlocks || []), upgradeId];
  saveMetaProgress(meta); return { success: true, meta };
}

export function updateCareerStats({ kills, deaths, score, wave, streak, damage, playTime, achievementIds }) {
  const career = loadCareerStats();
  career.totalRuns += 1;
  career.totalKills += (kills || 0);
  career.totalDeaths += (deaths || 0);
  career.bestScore = Math.max(career.bestScore, score || 0);
  career.bestWave = Math.max(career.bestWave, wave || 0);
  career.bestStreak = Math.max(career.bestStreak, streak || 0);
  career.totalDamage += Math.floor(damage || 0);
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
