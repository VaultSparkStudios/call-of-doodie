const ZERO_COMMUNITY_STATS = Object.freeze({
  scope: "verified_completed_runs",
  runs: 0,
  runners: 0,
  hours: 0,
  kills: 0,
  score: 0,
  damage: 0,
  shots: 0,
  hits: 0,
  accuracy: null,
  bosses: 0,
  bestScore: 0,
  bestKills: 0,
  bestWave: 0,
  runs24h: 0,
  kills24h: 0,
  modes: {},
  feedback: { too_easy: 0, dialed_in: 0, brutal: 0 },
  updatedAt: null,
});

function number(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function normalizeCommunityStats(value = {}) {
  const source = value && typeof value === "object" ? value : {};
  const shots = Math.max(0, number(source.shots));
  const hits = Math.max(0, number(source.hits));
  return {
    ...ZERO_COMMUNITY_STATS,
    ...source,
    runs: Math.max(0, Math.floor(number(source.runs))),
    runners: Math.max(0, Math.floor(number(source.runners))),
    hours: Math.max(0, number(source.hours)),
    kills: Math.max(0, Math.floor(number(source.kills))),
    score: Math.max(0, Math.floor(number(source.score))),
    damage: Math.max(0, Math.floor(number(source.damage))),
    shots,
    hits,
    accuracy: shots > 0 ? Math.round((hits / shots) * 1000) / 10 : null,
    bosses: Math.max(0, Math.floor(number(source.bosses))),
    bestScore: Math.max(0, Math.floor(number(source.bestScore ?? source.best_score))),
    bestKills: Math.max(0, Math.floor(number(source.bestKills ?? source.best_kills))),
    bestWave: Math.max(0, Math.floor(number(source.bestWave ?? source.best_wave))),
    runs24h: Math.max(0, Math.floor(number(source.runs24h ?? source.runs_24h))),
    kills24h: Math.max(0, Math.floor(number(source.kills24h ?? source.kills_24h))),
    modes: source.modes && typeof source.modes === "object" ? source.modes : {},
    feedback: {
      too_easy: Math.max(0, Math.floor(number(source.feedback?.too_easy))),
      dialed_in: Math.max(0, Math.floor(number(source.feedback?.dialed_in))),
      brutal: Math.max(0, Math.floor(number(source.feedback?.brutal))),
    },
    updatedAt: source.updatedAt ?? source.updated_at ?? null,
  };
}

export function buildPersonalStats(career = {}, history = []) {
  const shots = Math.max(0, number(career.totalShots));
  const hits = Math.max(0, number(career.totalHits));
  return {
    runs: Math.max(0, Math.floor(number(career.totalRuns))),
    hours: Math.round((Math.max(0, number(career.totalPlayTime)) / 3600) * 10) / 10,
    kills: Math.max(0, Math.floor(number(career.totalKills))),
    score: Math.max(0, Math.floor(number(career.totalScore))),
    damage: Math.max(0, Math.floor(number(career.totalDamage))),
    bosses: Math.max(0, Math.floor(number(career.totalBossKills))),
    shots,
    hits,
    accuracy: shots > 0 ? Math.round((hits / shots) * 1000) / 10 : null,
    bestScore: Math.max(0, Math.floor(number(career.bestScore))),
    bestKills: Math.max(0, Math.floor(number(career.bestKills))),
    bestWave: Math.max(0, Math.floor(number(career.bestWave))),
    recentRuns: Array.isArray(history) ? history.length : 0,
  };
}

export function formatStat(value) {
  return Number(value || 0).toLocaleString();
}
