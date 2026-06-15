function safeNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

export function computeWavePercentile(leaderboard = [], wave = 0, { minEntries = 5 } = {}) {
  const rows = Array.isArray(leaderboard) ? leaderboard : [];
  if (rows.length < minEntries) return null;
  const safeWave = safeNumber(wave, 0);
  const below = rows.filter((entry) => safeNumber(entry?.wave, 0) < safeWave).length;
  return Math.round((below / rows.length) * 100);
}

export function buildRunDnaSharePayload({
  weaponKills = [],
  weapons = [],
  leaderboard = [],
  wave = 0,
  score = 0,
  kills = 0,
  runNarrative = null,
  buildGrade = null,
  replayProofPresenter = null,
} = {}) {
  const receipt = replayProofPresenter?.receipt || null;
  return {
    weaponKills: Array.isArray(weaponKills) ? weaponKills.map((killCount) => safeNumber(killCount, 0)) : [],
    weaponColors: weapons.map((weapon) => weapon?.color || "#888"),
    weaponEmojis: weapons.map((weapon) => weapon?.emoji || ""),
    wave: safeNumber(wave, 0),
    score: safeNumber(score, 0),
    kills: safeNumber(kills, 0),
    runArc: runNarrative?.act || "",
    moments: Array.isArray(runNarrative?.moments) ? runNarrative.moments.slice(0, 2) : [],
    buildGrade: buildGrade?.grade || "?",
    replayProofTier: receipt?.status || receipt?.level || null,
    wavePercentile: computeWavePercentile(leaderboard, wave),
  };
}
