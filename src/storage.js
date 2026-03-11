// ===== LEADERBOARD =====
const LB_KEY = "cod-lb-v5";

function hasWindowStorage() {
  try { return typeof window.storage !== "undefined" && window.storage && typeof window.storage.get === "function"; }
  catch { return false; }
}

export async function loadLeaderboard() {
  try {
    if (hasWindowStorage()) {
      const r = await window.storage.get(LB_KEY, true);
      return r ? JSON.parse(r.value) : [];
    }
    const raw = localStorage.getItem(LB_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export async function saveToLeaderboard(entry) {
  try {
    const board = await loadLeaderboard();
    board.push({ ...entry, ts: Date.now() });
    board.sort((a, b) => b.score - a.score);
    const top = board.slice(0, 100);
    if (hasWindowStorage()) { await window.storage.set(LB_KEY, JSON.stringify(top), true); }
    else { localStorage.setItem(LB_KEY, JSON.stringify(top)); }
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
  return career;
}
