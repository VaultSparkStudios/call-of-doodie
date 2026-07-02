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

const BOSS_GUIDANCE = {
  4: {
    title: "Karen",
    verb: "Strafe wide and break line of fire before the complaint volley stacks up.",
    pressure: "Escort pressure matters more than greed damage on Karen waves.",
  },
  9: {
    title: "Landlord",
    verb: "Keep moving diagonally so rent shots miss while you clear escorts.",
    pressure: "Do not face-tank rent volleys just to keep DPS uptime.",
  },
  16: {
    title: "Splitter",
    verb: "Save space before the split. Finishing damage is only safe if the arena has room for shards.",
    pressure: "Treat low-health splitter phases as a spacing check, not a victory lap.",
  },
  17: {
    title: "Juggernaut",
    verb: "Respect the charge lane. Dodge first, punish second.",
    pressure: "If Juggernaut is on screen, movement discipline beats greedy close-range damage.",
  },
  18: {
    title: "Summoner",
    verb: "Delete summons fast, then collapse back onto the boss while the arena is clean.",
    pressure: "Summoner waves fail when adds stay alive longer than your burst window.",
  },
  20: {
    title: "Algorithm",
    verb: "Break the projectile rhythm with short lateral cuts instead of long panic drifts.",
    pressure: "Algorithm pressure scales when you let bullet patterns own the center lane.",
  },
  21: {
    title: "Developer",
    verb: "Play patient and survive the gimmicks. The joke boss still kills sloppy runs.",
    pressure: "Treat the spectacle as a real boss check, not a free wave.",
  },
};

const NEMESIS_WEAPON_RECOMMENDATIONS = {
  4: "Shotgun",
  9: "Crossbow",
  16: "Laser",
  17: "Minigun",
  18: "Rocket Launcher",
  20: "Sniper",
  21: "Flamethrower",
};

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
    wave,
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

export function getSpawnFormationPlan(plan, state, enemiesSpawned) {
  if (!plan || !state) return null;
  const spawnNumber = enemiesSpawned + 1;
  const sign = spawnNumber % 2 === 0 ? 1 : -1;
  const lateWave = plan.wave >= 20;
  if (lateWave && state.stageId === "pressure") {
    if (spawnNumber % 5 === 0) {
      return { id: "escort", label: "ESCORT", offset: sign * 36, lane: "center", role: "guard" };
    }
    return { id: "pincer", label: "PINCER", offset: sign * 104, lane: sign > 0 ? "right" : "left", role: "encircle" };
  }
  if (lateWave && state.stageId === "climax") {
    const lane = spawnNumber % 3 === 0 ? "center" : sign > 0 ? "right" : "left";
    return { id: "flank", label: "FLANK", offset: sign * 118, lane, role: "collapse" };
  }
  if (state.stageId === "scouting" && spawnNumber % 3 === 0) {
    return { id: "flank", label: "FLANK", offset: sign * 64, lane: sign > 0 ? "right" : "left", role: "probe" };
  }
  if (state.stageId === "pressure") {
    return { id: "pincer", label: "PINCER", offset: sign * 78, lane: sign > 0 ? "right" : "left", role: "encircle" };
  }
  if (state.stageId === "climax") {
    return { id: "surge", label: "SURGE", offset: sign * 42, lane: "center", role: "rush" };
  }
  return null;
}

export function applySpawnFormation(enemy, formation, W, H, margin = 24) {
  if (!enemy || !formation) return enemy;
  const x = Number(enemy.x) || 0;
  const y = Number(enemy.y) || 0;
  const amount = formation.offset || 0;
  const nearVerticalEdge = x < W * 0.2 || x > W * 0.8;
  const nearHorizontalEdge = y < H * 0.2 || y > H * 0.8;
  if (nearVerticalEdge && !nearHorizontalEdge) {
    enemy.y = clamp(y + amount, margin, H - margin);
  } else {
    enemy.x = clamp(x + amount, margin, W - margin);
  }
  enemy.formation = formation.id;
  enemy.formationLane = formation.lane || null;
  enemy.formationRole = formation.role || null;
  return enemy;
}

export function getPressureBand(state) {
  if (!state) return "stable";
  if (state.pressureRatio >= 1.15) return "overrun";
  if (state.pressureRatio <= 0.55) return "light";
  return "stable";
}

export function buildWaveTelemetrySnapshot(plan, state, wave) {
  return {
    wave,
    themeId: plan?.themeId ?? null,
    stageId: state?.stageId ?? null,
    stageLabel: state?.stageLabel ?? null,
    pressureBand: getPressureBand(state),
    pressureRatio: state ? Number(state.pressureRatio.toFixed(2)) : null,
    aliveBudget: state?.aliveBudget ?? null,
    eliteEvery: state?.eliteEvery ?? 0,
    event: plan?.event ?? null,
    formationSet: plan?.wave >= 20 ? "coordinated" : "loose",
  };
}

export function getBossWaveGuidance(primaryBossType, secondaryBossType = null) {
  const primary = BOSS_GUIDANCE[primaryBossType] || {
    title: "Boss",
    verb: "Dodge first, then cash in on the recovery window.",
    pressure: "Boss waves punish greed faster than normal waves do.",
  };
  const secondary = secondaryBossType != null ? BOSS_GUIDANCE[secondaryBossType] : null;

  return {
    headline: secondary
      ? `${primary.title} + ${secondary.title}`
      : primary.title,
    verb: secondary
      ? `${primary.verb} ${secondary.verb}`
      : primary.verb,
    pressure: secondary
      ? `${primary.pressure} ${secondary.pressure}`
      : primary.pressure,
  };
}

export function getNemesisWeaponRecommendation(bossType) {
  return NEMESIS_WEAPON_RECOMMENDATIONS[bossType] || "your best weapon";
}

export function getKnownBossGuidanceTypes() {
  return Object.keys(BOSS_GUIDANCE).map(Number).sort((a, b) => a - b);
}

// Returns a 1–5 danger rating for a non-boss wave.
export function computeWaveThreatRating({ maxEnemies = 10, eliteType = null, event = null } = {}) {
  let score = 1;
  score += Math.min(2, Math.floor(maxEnemies / 10));
  if (event === "elite_only") score += 2;
  else if (event === "siege" || event === "fast_round") score += 1;
  if (eliteType) score += 1;
  return Math.max(1, Math.min(5, score));
}

// Upgrades the base formation based on how hot the current heat tier is.
// At heat 2 (overdrive) all spawns become pincer encirclements.
// At heat 1 (warm), loose flanks are promoted to pincer.
export function heatBiasedFormation(heatTierValue, baseFormation, spawnNumber) {
  if (!baseFormation) return null;
  const sign = spawnNumber % 2 === 0 ? 1 : -1;
  if (heatTierValue >= 2) {
    return { id: "pincer", label: "PINCER", offset: sign * 78, lane: sign > 0 ? "right" : "left", role: "encircle" };
  }
  if (heatTierValue === 1 && baseFormation.id === "flank") {
    return { id: "pincer", label: "PINCER", offset: sign * 78, lane: sign > 0 ? "right" : "left", role: "encircle" };
  }
  return baseFormation;
}
