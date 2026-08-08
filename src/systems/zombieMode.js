const SURGE_INTERVAL = 3;

export function getZombieOutbreakPlan(wave = 1) {
  const normalizedWave = Math.max(1, Math.floor(Number(wave) || 1));
  const tier = Math.min(5, 1 + Math.floor((normalizedWave - 1) / 4));
  const surge = normalizedWave > 1 && normalizedWave % SURGE_INTERVAL === 0;
  return {
    wave: normalizedWave,
    tier,
    surge,
    label: surge ? "SEWER SURGE" : `OUTBREAK TIER ${tier}`,
    enemyCountMult: surge ? 1.85 : 1.25 + tier * 0.09,
    spawnRateMult: surge ? 0.52 : Math.max(0.62, 0.9 - tier * 0.05),
    healthMult: 1.08 + tier * 0.08,
    speedMult: 0.92 + tier * 0.04,
  };
}

export function getZombieWaveEnemyCount(baseCount, wave = 1) {
  const plan = getZombieOutbreakPlan(wave);
  return Math.min(96, Math.max(1, Math.ceil((Number(baseCount) || 1) * plan.enemyCountMult)));
}

export function mutateEnemyForZombieMode(enemy, { wave = 1, ordinal = 0 } = {}) {
  if (!enemy || enemy.isZombie) return enemy;
  const plan = getZombieOutbreakPlan(wave);
  const variant = Math.abs((Math.floor(Number(wave) || 1) * 31 + Math.floor(Number(ordinal) || 0) * 17)) % 4;
  const variantName = ["Shambler", "Rotter", "Sprinter", "Bloater"][variant];
  const variantHealth = variant === 3 ? 1.35 : variant === 2 ? 0.82 : 1;
  const variantSpeed = variant === 2 ? 1.42 : variant === 3 ? 0.72 : 1;
  enemy.isZombie = true;
  enemy.zombieVariant = variantName.toLowerCase();
  enemy.originalName = enemy.name;
  enemy.name = `${variantName} ${enemy.name}`;
  enemy.emoji = enemy.isBossEnemy ? `🧟${enemy.emoji || "☠"}` : "🧟";
  enemy.color = variant === 3 ? "#86A84C" : variant === 2 ? "#9CFF57" : "#6FCF72";
  enemy.health *= plan.healthMult * variantHealth;
  enemy.maxHealth = enemy.health;
  enemy.speed *= plan.speedMult * variantSpeed;
  enemy.points = Math.round((enemy.points || 0) * (plan.surge ? 1.35 : 1.18));
  return enemy;
}

export function describeZombieOutbreak(wave = 1) {
  const plan = getZombieOutbreakPlan(wave);
  return plan.surge
    ? `Wave ${plan.wave}: sewer surge — the horde is nearly twice as dense.`
    : `Wave ${plan.wave}: outbreak tier ${plan.tier} — denser undead, faster reinforcement.`;
}
