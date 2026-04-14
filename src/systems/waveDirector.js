const WAVE_THEMES = [
  {
    id: "vanguard",
    label: "Vanguard Sweep",
    hint: "Fast flankers spike mid-wave before a cleanup lull.",
    eliteType: "fast",
    eventPool: ["fast_round", "fog_of_war"],
  },
  {
    id: "bulwark",
    label: "Bulwark Push",
    hint: "Armored pressure builds slowly, then locks the arena down.",
    eliteType: "armored",
    eventPool: ["siege", "elite_only"],
  },
  {
    id: "volatile",
    label: "Volatile Surge",
    hint: "Explosive threats arrive in a short, telegraphed spike.",
    eliteType: "explosive",
    eventPool: ["elite_only", "fast_round"],
  },
  {
    id: "crossfire",
    label: "Crossfire Loop",
    hint: "Pressure ramps into a brief ranged burst before recovery.",
    eliteType: "armored",
    eventPool: ["fog_of_war", "siege"],
  },
];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function createWaveDirectorPlan({
  wave,
  maxEnemies,
  nonBossWaveCount = 0,
  scoreAttackMode = false,
  gauntletMode = false,
  dailyChallengeMode = false,
  random = Math.random,
}) {
  const theme = WAVE_THEMES[(Math.max(0, wave - 2) + nonBossWaveCount) % WAVE_THEMES.length];
  const pressureBonus = wave >= 30 ? 2 : wave >= 20 ? 1 : 0;
  const climaxEliteEvery = wave >= 28 ? 2 : wave >= 16 ? 3 : wave >= 10 ? 4 : 0;
  const baseAliveBudget = clamp(Math.round(Math.min(maxEnemies * 0.34, 5 + wave * 0.28)), 5, 15) + pressureBonus;
  const eventEligible = wave > 2 && nonBossWaveCount > 0 && nonBossWaveCount % 3 === 0 && !scoreAttackMode && !gauntletMode && !dailyChallengeMode;
  const event = eventEligible ? theme.eventPool[Math.floor(random() * theme.eventPool.length)] : null;

  return {
    themeId: theme.id,
    label: theme.label,
    hint: theme.hint,
    eliteType: theme.eliteType,
    event,
    stages: [
      {
        id: "scouting",
        label: "SCOUTING",
        progressUntil: 0.24,
        spawnRateMult: 1.2,
        aliveBudget: baseAliveBudget - 1,
        eliteEvery: 0,
        telegraph: null,
      },
      {
        id: "pressure",
        label: "PRESSURE",
        progressUntil: 0.58,
        spawnRateMult: 0.96,
        aliveBudget: baseAliveBudget + 1,
        eliteEvery: 0,
        telegraph: `⚠ ${theme.label.toUpperCase()} BUILDING`,
      },
      {
        id: "climax",
        label: "CLIMAX",
        progressUntil: 0.88,
        spawnRateMult: wave >= 20 ? 0.72 : 0.8,
        aliveBudget: baseAliveBudget + 3,
        eliteEvery: climaxEliteEvery,
        telegraph: climaxEliteEvery
          ? `👑 ${theme.eliteType.toUpperCase()} ELITES INBOUND`
          : `⚠ ${theme.label.toUpperCase()} PEAK`,
      },
      {
        id: "recovery",
        label: "RECOVERY",
        progressUntil: 1,
        spawnRateMult: 1.12,
        aliveBudget: baseAliveBudget,
        eliteEvery: 0,
        telegraph: "🧹 CLEANUP WINDOW",
      },
    ],
  };
}

export function getWaveDirectorState(plan, enemiesSpawned, maxEnemies, aliveEnemies) {
  if (!plan || !maxEnemies) return null;
  const progress = clamp(enemiesSpawned / Math.max(1, maxEnemies), 0, 1);
  const stageIndex = plan.stages.findIndex((stage) => progress <= stage.progressUntil);
  const stage = plan.stages[stageIndex === -1 ? plan.stages.length - 1 : stageIndex];
  const pressureRatio = aliveEnemies / Math.max(1, stage.aliveBudget);
  let spawnRateMult = stage.spawnRateMult;

  if (pressureRatio > 1.0) spawnRateMult *= 1.4;
  else if (pressureRatio < 0.55 && progress > 0.18) spawnRateMult *= 0.88;

  return {
    progress,
    stageIndex: stageIndex === -1 ? plan.stages.length - 1 : stageIndex,
    stageId: stage.id,
    stageLabel: stage.label,
    aliveBudget: stage.aliveBudget,
    eliteEvery: stage.eliteEvery,
    telegraph: stage.telegraph,
    spawnRateMult: clamp(spawnRateMult, 0.55, 1.5),
    pressureRatio,
  };
}

export function getWaveSpawnRate(baseSpawnRate, state) {
  if (!state) return baseSpawnRate;
  return Math.max(6, Math.floor(baseSpawnRate * state.spawnRateMult));
}

export function getGuaranteedEliteType(plan, state, enemiesSpawned) {
  if (!plan || !state?.eliteEvery) return null;
  const spawnNumber = enemiesSpawned + 1;
  if (spawnNumber % state.eliteEvery !== 0) return null;
  return plan.eliteType;
}
