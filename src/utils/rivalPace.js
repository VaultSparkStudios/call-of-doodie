export function buildRivalPace({ score = 0, wave = 1, topGhosts = [], weeklyRival = null } = {}) {
  const candidates = [];
  if (weeklyRival) candidates.push({ ...weeklyRival, source: "weekly" });
  if (Array.isArray(topGhosts)) {
    topGhosts.slice(0, 3).forEach((ghost, index) => {
      candidates.push({ ...ghost, source: index === 0 ? "leader" : "ghost" });
    });
  }
  const rival = candidates
    .map((candidate) => ({
      name: candidate.name || "Ghost",
      score: Math.max(0, Number(candidate.score || 0)),
      wave: Math.max(1, Number(candidate.wave || 1)),
      source: candidate.source,
    }))
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => Math.abs(a.score - score) - Math.abs(b.score - score))[0];

  if (!rival) return null;

  const delta = score - rival.score;
  const waveDelta = Number(wave || 1) - rival.wave;
  return {
    name: rival.name,
    source: rival.source,
    targetScore: rival.score,
    targetWave: rival.wave,
    delta,
    waveDelta,
    ahead: delta >= 0,
    label: delta >= 0
      ? `RIVAL PACE +${delta.toLocaleString()}`
      : `RIVAL PACE -${Math.abs(delta).toLocaleString()}`,
    detail: `${rival.name.slice(0, 14)} · W${rival.wave}${waveDelta === 0 ? "" : waveDelta > 0 ? ` · +${waveDelta}W` : ` · ${waveDelta}W`}`,
  };
}
