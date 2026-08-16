// Pure compatibility contract for the eight pre-Operation game modes.
// Values intentionally mirror the legacy App.jsx branches so a later caller can
// migrate orchestration without changing player-visible behavior.

export const LEGACY_MODE_IDS = Object.freeze([
  "standard", "score_attack", "daily_challenge", "cursed",
  "boss_rush", "speedrun", "gauntlet", "zombies",
]);

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}

function mode(overrides) {
  return deepFreeze({
    timer: { direction: "none", limitFrames: null, timeoutEndsRun: false },
    seedPolicy: "run",
    scoreMultiplier: 1,
    perkPool: "standard",
    fixedOpeningKit: false,
    draft: true,
    awardLevelPerks: true,
    routes: true,
    mutations: true,
    shop: true,
    waveDirectorEvents: true,
    zombies: false,
    boss: { interval: 5, firstWave: 5, allowDeveloperBoss: true },
    escalations: [],
    ...overrides,
  });
}

export const MODE_RULES = Object.freeze({
  standard: mode({}),
  score_attack: mode({
    timer: { direction: "down", limitFrames: 300 * 60, timeoutEndsRun: true },
    routes: false, mutations: false, waveDirectorEvents: false,
  }),
  daily_challenge: mode({
    seedPolicy: "daily_fixed", draft: false, routes: false,
    mutations: false, waveDirectorEvents: false,
  }),
  cursed: mode({
    scoreMultiplier: 3,
    perkPool: "fully_cursed",
    escalations: [
      { wave: 5, field: "mutAlwaysEnraged", value: true, code: "ENEMIES_ENRAGED" },
      { wave: 10, field: "cursedHideScore", value: true, code: "SCORE_HIDDEN" },
      { wave: 15, field: "cursedAcidTrails", value: true, code: "ACID_TRAILS" },
      { wave: 20, field: "mutAllExplosive", value: true, code: "ALL_EXPLOSIVE" },
      { wave: 25, field: "waveEnemyMult", multiplier: 2, code: "SPAWNS_DOUBLED" },
    ],
  }),
  boss_rush: mode({
    boss: { interval: 1, firstWave: 4, allowDeveloperBoss: false },
    routes: false, mutations: false,
  }),
  speedrun: mode({ timer: { direction: "up", limitFrames: null, timeoutEndsRun: false } }),
  gauntlet: mode({
    seedPolicy: "weekly_fixed", fixedOpeningKit: true, draft: false,
    awardLevelPerks: false, shop: false, mutations: false, waveDirectorEvents: false,
  }),
  zombies: mode({ zombies: true }),
});

export function getModeRules(modeId = "standard") {
  return MODE_RULES[LEGACY_MODE_IDS.includes(modeId) ? modeId : "standard"];
}

export function resolveModeId(flags = {}) {
  if (flags.zombies || flags.zombiesMode) return "zombies";
  if (flags.bossRush || flags.bossRushMode) return "boss_rush";
  if (flags.cursed || flags.cursedRunMode) return "cursed";
  if (flags.scoreAttack || flags.scoreAttackMode) return "score_attack";
  if (flags.dailyChallenge || flags.dailyChallengeMode) return "daily_challenge";
  if (flags.speedrun || flags.speedrunMode) return "speedrun";
  if (flags.gauntlet || flags.gauntletMode) return "gauntlet";
  return "standard";
}

export function getExclusiveModeFlags(modeId = "standard") {
  const selected = LEGACY_MODE_IDS.includes(modeId) ? modeId : "standard";
  return {
    scoreAttackMode: selected === "score_attack",
    dailyChallengeMode: selected === "daily_challenge",
    cursedRunMode: selected === "cursed",
    bossRushMode: selected === "boss_rush",
    speedrunMode: selected === "speedrun",
    gauntletMode: selected === "gauntlet",
    zombiesMode: selected === "zombies",
  };
}

export function applyModeRules(gameState = {}, modeId = "standard") {
  const id = LEGACY_MODE_IDS.includes(modeId) ? modeId : "standard";
  const rules = getModeRules(id);
  return {
    ...gameState,
    ...getExclusiveModeFlags(id),
    mode: id,
    scoreAttackTimeLeft: id === "score_attack" ? rules.timer.limitFrames : 0,
    killScoreMult: (Number(gameState.killScoreMult) || 1) * rules.scoreMultiplier,
  };
}

export function isBossWaveForMode(modeId, wave, routeForceBoss = false) {
  if (routeForceBoss) return true;
  const normalizedWave = Math.max(1, Math.floor(Number(wave) || 1));
  const boss = getModeRules(modeId).boss;
  return normalizedWave >= boss.firstWave
    && (boss.interval === 1 || normalizedWave % boss.interval === 0);
}

export function getModeRewardFlow(modeId, wave, { bossWave = false } = {}) {
  const rules = getModeRules(modeId);
  const normalizedWave = Math.max(1, Math.floor(Number(wave) || 1));
  return {
    showRoute: rules.routes && !bossWave && normalizedWave >= 2,
    showMutation: rules.mutations && !bossWave && normalizedWave % 5 === 0,
    showShop: rules.shop && !bossWave && (normalizedWave < 5 || normalizedWave % 2 === 0),
    awardLevelPerks: rules.awardLevelPerks,
  };
}

export function getModeWaveEffects(modeId, wave, gameState = {}) {
  return getModeRules(modeId).escalations
    .filter((entry) => entry.wave === Number(wave))
    .reduce((next, effect) => {
      next[effect.field] = effect.multiplier != null
        ? (Number(next[effect.field]) || 1) * effect.multiplier
        : effect.value;
      return next;
    }, { ...gameState });
}
