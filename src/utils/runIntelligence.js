function safeNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function completedMissionCount(missions = [], missionProgress = {}) {
  return missions.filter(mission => missionProgress?.[mission.id]).length;
}

function modeLabel(mode = "standard") {
  return String(mode || "standard").replace(/_/g, " ");
}

function recentWeakness(runHistory = []) {
  const recent = runHistory.slice(0, 5);
  if (recent.length < 2) return null;
  const avgWave = recent.reduce((sum, run) => sum + safeNumber(run.wave, 1), 0) / recent.length;
  const avgScore = recent.reduce((sum, run) => sum + safeNumber(run.score, 0), 0) / recent.length;
  if (avgWave < 8) return { focus: "early_survival_history", label: "recent runs are ending before wave 8", avgWave, avgScore };
  const sameSeed = recent.find(run => run.runSeed && recent.filter(other => other.runSeed === run.runSeed).length >= 2);
  if (sameSeed) return { focus: "seed_mastery_history", label: `seed #${sameSeed.runSeed} has repeat attempts`, avgWave, avgScore };
  if (avgScore < 20000) return { focus: "score_ceiling_history", label: "recent score ceiling is still low", avgWave, avgScore };
  return null;
}

export function buildMenuIntelligence({
  mode = "standard",
  selectedLoadout = { id: "standard", name: "Standard Issue" },
  missions = [],
  missionProgress = {},
  meta = null,
  career = null,
  challenge = null,
  dailyAlreadyPlayed = false,
  todaySeed = null,
  runHistory = [],
  rivalryHistory = [],
} = {}) {
  const completed = completedMissionCount(missions, missionProgress);
  const openMissions = Math.max(0, missions.length - completed);
  const careerPoints = safeNumber(meta?.careerPoints, 0);
  const totalKills = safeNumber(career?.totalKills, 0);
  const weakness = recentWeakness(runHistory);
  const unresolvedRivalry = rivalryHistory.find(item => item?.won === false && item.seed);

  if (challenge?.vsScore != null) {
    return {
      focus: "rivalry",
      directive: `Beat the posted score on seed #${challenge.seed}. Fixed-seed rivalry is the cleanest read on real improvement.`,
      recommendation: "Accept the challenge before changing loadout or mode.",
      telemetry: { focus: "rivalry", seed: challenge.seed, targetScore: challenge.vsScore },
    };
  }

  if (unresolvedRivalry) {
    return {
      focus: "rivalry_rematch",
      directive: `Seed #${unresolvedRivalry.seed} still has an unpaid rivalry gap of ${Math.abs(safeNumber(unresolvedRivalry.delta)).toLocaleString()} points.`,
      recommendation: "Replay the known loss before rolling a new anonymous run.",
      telemetry: { focus: "rivalry_rematch", seed: unresolvedRivalry.seed, targetScore: unresolvedRivalry.vsScore, delta: unresolvedRivalry.delta },
    };
  }

  if (!dailyAlreadyPlayed && todaySeed != null) {
    return {
      focus: "daily_seed",
      directive: `Use daily seed #${todaySeed} as the shared benchmark run.`,
      recommendation: "Run the daily before opening deeper systems.",
      telemetry: { focus: "daily_seed", seed: todaySeed },
    };
  }

  if (careerPoints >= 10) {
    return {
      focus: "meta_power",
      directive: `${careerPoints} career points are waiting. Spend power before asking execution to carry a weaker build.`,
      recommendation: "Open upgrades, then deploy.",
      telemetry: { focus: "meta_power", careerPoints },
    };
  }

  if (openMissions > 0 && totalKills < 500) {
    return {
      focus: "mission_progress",
      directive: `${openMissions} daily mission${openMissions === 1 ? "" : "s"} can turn the next run into guaranteed account progress.`,
      recommendation: "Review missions and route one early choice toward them.",
      telemetry: { focus: "mission_progress", openMissions },
    };
  }

  if (weakness) {
    return {
      focus: weakness.focus,
      directive: `Run history says ${weakness.label}.`,
      recommendation: weakness.focus === "early_survival_history"
        ? "Take a stabilizer and treat the opening as survival practice."
        : weakness.focus === "seed_mastery_history"
          ? "Repeat the known seed and prove the route is improving."
          : "Play for cleaner score conversion before adding more risk.",
      telemetry: { focus: weakness.focus, avgWave: Math.round(weakness.avgWave * 10) / 10, avgScore: Math.round(weakness.avgScore) },
    };
  }

  return {
    focus: "build_commitment",
    directive: `${selectedLoadout.name} in ${modeLabel(mode)} wants one clear doctrine by the first shop.`,
    recommendation: "Deploy and commit to a two-weapon identity early.",
    telemetry: { focus: "build_commitment", mode, loadout: selectedLoadout.id },
  };
}

export function buildPostRunIntelligence({
  score = 0,
  kills = 0,
  wave = 1,
  bestStreak = 0,
  grenades = 0,
  crits = 0,
  timeSurvived = 0,
  vsScore = null,
  runSeed = 0,
  mode = "standard",
} = {}) {
  const safeScore = safeNumber(score);
  const safeKills = safeNumber(kills);
  const safeWave = Math.max(1, safeNumber(wave, 1));
  const safeTime = Math.max(1, safeNumber(timeSurvived, 1));
  const targetDelta = vsScore == null ? null : safeScore - safeNumber(vsScore);

  let cause = "pressure_conversion";
  if (safeWave < 8) cause = "early_survival";
  else if (safeNumber(bestStreak) < Math.min(25, Math.max(8, safeKills * 0.25))) cause = "chain_control";
  else if (safeNumber(grenades) === 0) cause = "cooldown_hoarding";
  else if (safeNumber(crits) < Math.max(4, safeKills * 0.1)) cause = "elite_damage";
  else if (targetDelta != null && targetDelta < 0) cause = "rivalry_gap";

  const drillByCause = {
    early_survival: "Open with safer spacing and one stabilizer pick before greed.",
    chain_control: "Play the next run as a streak-preservation drill.",
    cooldown_hoarding: "Spend grenades on the first crowd spike of each wave.",
    elite_damage: "Route into faster elite deletion through crit or burst support.",
    rivalry_gap: "Replay the same seed and solve the exact score gap.",
    pressure_conversion: "Convert strong openings into cleaner wave exits.",
  };

  const calloutByCause = {
    early_survival: "The opening waves filed a formal complaint about your confidence.",
    chain_control: "The streak meter did not betray you; it was abandoned in public.",
    cooldown_hoarding: "Those grenades are not family heirlooms. Spend them.",
    elite_damage: "The elites had enough time to complete onboarding paperwork.",
    rivalry_gap: "The rival is beatable. Annoyingly, the scoreboard wants evidence.",
    pressure_conversion: "Great opener. Then the arena asked a follow-up question.",
  };

  return {
    cause,
    drill: drillByCause[cause],
    callout: calloutByCause[cause],
    rivalry: runSeed > 0 ? {
      seed: runSeed,
      targetScore: vsScore,
      delta: targetDelta,
      prompt: targetDelta == null
        ? `Seed #${runSeed} is worth saving as a mastery route.`
        : targetDelta >= 0
          ? `Defend seed #${runSeed}; you are ahead by ${targetDelta.toLocaleString()} points.`
          : `Replay seed #${runSeed}; the gap is ${Math.abs(targetDelta).toLocaleString()} points.`,
    } : null,
    telemetry: {
      mode,
      cause,
      score: safeScore,
      kills: safeKills,
      wave: safeWave,
      scorePerMinute: Math.round((safeScore / safeTime) * 60),
      killsPerMinute: Math.round((safeKills / safeTime) * 60),
      targetDelta,
    },
  };
}

export function buildRunEventDigest({
  mode = "standard",
  difficulty = "normal",
  seed = null,
  wave = 1,
  score = 0,
  kills = 0,
  level = 1,
  bestStreak = 0,
  totalDamage = 0,
  time = "0:00",
  starterLoadout = "standard",
  perkCount = 0,
  achievementCount = 0,
  cause = null,
  actionCount = 0,
} = {}) {
  const timeline = [
    `m:${mode || "standard"}`,
    `d:${difficulty}`,
    `w:${Math.floor(safeNumber(wave, 1) / 5)}`,
    `s:${Math.floor(safeNumber(score) / 5000)}`,
    `k:${Math.floor(safeNumber(kills) / 10)}`,
    `l:${safeNumber(level, 1)}`,
    `p:${safeNumber(perkCount)}`,
    `a:${safeNumber(achievementCount)}`,
    cause ? `c:${cause}` : "",
  ].filter(Boolean).join("|");
  return {
    v: 2,
    mode: mode || "standard",
    difficulty,
    seed: seed ?? null,
    wave: safeNumber(wave, 1),
    scoreBand: Math.floor(safeNumber(score) / 5000),
    killBand: Math.floor(safeNumber(kills) / 10),
    level: safeNumber(level, 1),
    streakBand: Math.floor(safeNumber(bestStreak) / 10),
    damageBand: Math.floor(safeNumber(totalDamage) / 25000),
    time,
    starterLoadout,
    perkCount: safeNumber(perkCount),
    achievementCount: safeNumber(achievementCount),
    actionCount: safeNumber(actionCount),
    cause: cause || null,
    timeline,
  };
}

export function buildStudioGameEvent(type, payload = {}) {
  return {
    schema: "vaultspark.game-event.v1",
    game: "call-of-doodie",
    type,
    createdAt: new Date().toISOString(),
    payload,
  };
}
