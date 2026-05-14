function n(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function average(values) {
  const nums = values.map(v => n(v)).filter(v => Number.isFinite(v));
  return nums.length ? nums.reduce((sum, v) => sum + v, 0) / nums.length : 0;
}

export function buildRunBrain({ career = {}, runHistory = [], studioEvents = [], latestAdvice = null, latestRun = {} } = {}) {
  const recentRuns = Array.isArray(runHistory) ? runHistory.slice(0, 8) : [];
  const recentEvents = Array.isArray(studioEvents) ? studioEvents.slice(0, 80) : [];
  const avgWave = average(recentRuns.map(run => run.wave));
  const avgScore = average(recentRuns.map(run => run.score));
  const replayEvents = recentEvents.filter((event) => {
    const haystack = `${event?.type || ""} ${event?.payload?.actionId || ""} ${event?.payload?.source || ""}`;
    return /replay|rematch|history_replay/i.test(haystack);
  });
  const adviceViews = recentEvents.filter(event => event?.type === "debrief_intelligence");
  const abandons = recentEvents.filter(event => event?.type === "mode_abandon");
  const deaths = Array.isArray(career?.recentDeathsByEnemy) ? career.recentDeathsByEnemy.slice(0, 8) : [];
  const precisionStreak = n(latestRun?.bestPrecisionStreak);

  let archetype = "balanced";
  if (avgWave > 0 && avgWave < 8) archetype = "survival_gap";
  else if (replayEvents.length >= 2) archetype = "seed_grinder";
  else if (abandons.length >= 2) archetype = "friction_sensitive";
  else if (avgScore >= 40000) archetype = "score_chaser";

  const followThrough = adviceViews.length === 0
    ? "No coach loop yet — the next debrief becomes the baseline."
    : replayEvents.length > 0
      ? "Coach advice is converting into rematches."
      : "Coach advice is being seen, but not yet followed by rematches.";

  const pressure = deaths.length >= 3
    ? "Recent deaths are clustered enough to personalize warning windows."
    : recentRuns.length >= 3
      ? `Recent baseline: wave ${avgWave.toFixed(1)}, ${Math.round(avgScore).toLocaleString()} points.`
      : "Needs two more runs before pattern memory is reliable.";

  const nextExperiment = latestAdvice
    ? `Run the next seed as a test of: ${latestAdvice}`
    : precisionStreak >= 5
      ? "Run one precision route: keep the same aim discipline, then buy damage multipliers before spray weapons."
    : archetype === "survival_gap"
      ? "Run one safe opener: stabilizer perk first, greed second."
      : archetype === "seed_grinder"
        ? "Repeat the same seed until wave and score both improve."
        : archetype === "friction_sensitive"
          ? "Use Normal difficulty and a familiar loadout before chasing variants."
          : "Commit to one build doctrine before the first shop.";

  return {
    archetype,
    confidence: Math.min(1, (recentRuns.length + adviceViews.length + replayEvents.length) / 10),
    avgWave: Math.round(avgWave * 10) / 10,
    avgScore: Math.round(avgScore),
    followThrough,
    pressure,
    nextExperiment,
    precisionStreak,
  };
}
