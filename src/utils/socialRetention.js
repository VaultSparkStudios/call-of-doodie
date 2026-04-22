function safeNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

export function summarizeRivalryHistory(rivalryHistory = []) {
  const settled = rivalryHistory.filter((entry) => entry?.won != null);
  const wins = settled.filter((entry) => entry.won).length;
  const losses = settled.filter((entry) => entry.won === false).length;
  const unresolved = rivalryHistory.find((entry) => entry?.won === false && entry.seed);
  const bestWin = settled
    .filter((entry) => entry.won && Number.isFinite(entry.delta))
    .sort((a, b) => b.delta - a.delta)[0] || null;
  const worstLoss = settled
    .filter((entry) => entry.won === false && Number.isFinite(entry.delta))
    .sort((a, b) => a.delta - b.delta)[0] || null;
  const streak = settled.reduce((memo, entry) => {
    if (!memo.current) return { current: entry.won ? 1 : -1 };
    if ((memo.current > 0 && entry.won) || (memo.current < 0 && entry.won === false)) {
      return { current: memo.current + (entry.won ? 1 : -1) };
    }
    return memo;
  }, { current: 0 }).current;
  return { wins, losses, unresolved, bestWin, worstLoss, streak };
}

export function buildWeeklyContract(runHistory = [], rivalryHistory = [], studioEvents = []) {
  const unresolved = rivalryHistory.find((entry) => entry?.won === false && entry.seed);
  if (unresolved) {
    return {
      id: "revenge_contract",
      title: "Revenge Contract",
      detail: `Replay seed #${unresolved.seed} and erase the ${Math.abs(unresolved.delta || 0).toLocaleString()} point gap.`,
      reward: "Turns stored rivalry data into a visible improvement loop.",
      progress: unresolved.delta != null ? `Gap: ${Math.abs(unresolved.delta).toLocaleString()} pts` : "Pending rematch",
    };
  }

  if (runHistory.length === 0) {
    return {
      id: "warm_body_contract",
      title: "Warm Body Contract",
      detail: "Deploy one scouting run and bank a real baseline seed.",
      reward: "Unlocks meaningful history, rivalry, and routing targets.",
      progress: "0 seeded runs banked",
    };
  }

  const recent = runHistory.slice(0, 5);
  const seededRuns = recent.filter((run) => Number(run?.runSeed) > 0);
  const avgScore = Math.round(recent.reduce((sum, run) => sum + safeNumber(run?.score, 0), 0) / recent.length);
  const bestWave = recent.reduce((max, run) => Math.max(max, safeNumber(run?.wave, 1)), 1);
  const recentContracts = studioEvents.filter((event) => event?.type === "weekly_contract_progress");
  const latestProgress = recentContracts[0]?.payload?.progressLabel || null;
  const featured = seededRuns[0];
  return {
    id: "studio_seed_contract",
    title: "Studio Seed Contract",
    detail: featured?.runSeed
      ? `Beat ${Math.max(avgScore + 5000, (avgScore * 1.15) | 0).toLocaleString()} on seed #${featured.runSeed} or push to wave ${bestWave + 2}.`
      : `Raise your next five-run average above ${Math.max(avgScore + 5000, 15000).toLocaleString()} and push to wave ${bestWave + 2}.`,
    reward: "A concrete weekly target keeps the home screen from becoming passive wallpaper.",
    progress: latestProgress || `${seededRuns.length} seeded run${seededRuns.length === 1 ? "" : "s"} banked this week`,
  };
}

export function buildFeaturedSeeds(runHistory = [], rivalryHistory = []) {
  const cards = [];
  const unresolved = rivalryHistory.find((entry) => entry?.won === false && entry.seed);
  if (unresolved) {
    cards.push({
      id: `revenge-${unresolved.seed}`,
      label: "Revenge Link",
      seed: unresolved.seed,
      detail: unresolved.vsName
        ? `Take back the board from @${unresolved.vsName}.`
        : "Replay the exact loss and close the known gap.",
      target: unresolved.vsScore != null ? `Beat ${unresolved.vsScore.toLocaleString()}` : "Set a clean rematch score",
      accent: "#FFB36B",
    });
  }

  const seededRuns = runHistory.filter((run) => Number(run?.runSeed) > 0);
  const highestScoreSeed = seededRuns
    .slice()
    .sort((a, b) => safeNumber(b?.score, 0) - safeNumber(a?.score, 0))[0];
  if (highestScoreSeed && !cards.find((card) => card.seed === highestScoreSeed.runSeed)) {
    cards.push({
      id: `featured-${highestScoreSeed.runSeed}`,
      label: "Featured Seed",
      seed: highestScoreSeed.runSeed,
      detail: "Promote a proven route as this week's async challenge.",
      target: `Banked score ${safeNumber(highestScoreSeed.score, 0).toLocaleString()}`,
      accent: "#7FE6FF",
    });
  }

  const latestSeeded = seededRuns[0];
  if (latestSeeded && !cards.find((card) => card.seed === latestSeeded.runSeed)) {
    cards.push({
      id: `fresh-${latestSeeded.runSeed}`,
      label: "Fresh Ghost",
      seed: latestSeeded.runSeed,
      detail: "The newest seeded run is the cleanest async rivalry target.",
      target: `Wave ${safeNumber(latestSeeded.wave, 1)} · ${safeNumber(latestSeeded.score, 0).toLocaleString()} pts`,
      accent: "#9CFFB8",
    });
  }

  return cards.slice(0, 3);
}

export function buildGhostBoard(runHistory = [], rivalryHistory = []) {
  const recentRuns = runHistory.filter((run) => Number(run?.runSeed) > 0).slice(0, 5);
  const rivalrySeeds = new Set(rivalryHistory.map((entry) => entry?.seed).filter(Boolean));
  return recentRuns.slice(0, 3).map((run, index) => ({
    id: `ghost-${run.runSeed}-${index}`,
    seed: run.runSeed,
    title: rivalrySeeds.has(run.runSeed) ? "Rival Ghost" : "Studio Ghost",
    subtitle: rivalrySeeds.has(run.runSeed)
      ? "Known scoreboard conflict"
      : "Seeded route ready for async competition",
    score: safeNumber(run.score, 0),
    wave: safeNumber(run.wave, 1),
    accent: rivalrySeeds.has(run.runSeed) ? "#FF8888" : "#8BD3FF",
  }));
}
