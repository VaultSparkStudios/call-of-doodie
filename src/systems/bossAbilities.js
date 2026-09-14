export const BOSS_DECOY_FRAMES = 240;
export const BOSS_HEAL_FEEDBACK_FRAMES = 45;

function isLiveBoss(enemy) {
  return enemy?.isBossEnemy && Number.isFinite(enemy.health) && enemy.health > 0
    && !enemy._defeatPending && !enemy._defeatResolved;
}

function clampPosition(value, size, dimension) {
  // Keep the atlas silhouette and DECOY chip inside the arena, not just its ring.
  const margin = Math.min(Math.max(56, size * 1.05), dimension / 2);
  return Math.max(margin, Math.min(dimension - margin, value));
}

/** One presentation-only record per boss; no RNG, entity insertion or wall clock. */
export function stepBossDecoys(gs, world = {}) {
  const W = Number.isFinite(world.W) && world.W > 0 ? world.W : 1280;
  const H = Number.isFinite(world.H) && world.H > 0 ? world.H : 720;
  for (const boss of gs?.enemies || []) {
    if (!isLiveBoss(boss)) {
      if (boss) { delete boss.cloneDecoy; delete boss.lifestealFeedbackFrames; }
      continue;
    }
    if (boss.lifestealFeedbackFrames > 0) boss.lifestealFeedbackFrames--;
    if (boss.cloneDecoy) {
      boss.cloneDecoy.remainingFrames--;
      if (boss.cloneDecoy.remainingFrames <= 0) delete boss.cloneDecoy;
    }
    if (!boss.hasCloneDecoy || boss.cloneDecoySpawned || !(boss.maxHealth > 0)
      || boss.health > boss.maxHealth / 2) continue;
    boss.cloneDecoySpawned = true;
    const size = Number.isFinite(boss.size) ? Math.max(16, Math.min(160, boss.size)) : 48;
    const x = Number.isFinite(boss.x) ? boss.x : W / 2;
    const y = Number.isFinite(boss.y) ? boss.y : H / 2;
    boss.cloneDecoy = {
      x: clampPosition(x + (x < W / 2 ? 1 : -1) * (size + 36), size, W),
      y: clampPosition(y + (y < H / 2 ? 1 : -1) * 24, size, H),
      size,
      typeIndex: boss.typeIndex,
      emoji: boss.emoji,
      color: boss.color,
      remainingFrames: BOSS_DECOY_FRAMES,
    };
  }
}

/** Every damaging enemy bullet benefits every live Lifesteal boss. */
export function healBossesFromEnemyBullet(gs, observedDamage) {
  if (!Number.isFinite(observedDamage) || observedDamage <= 0) return 0;
  let healed = 0;
  for (const boss of gs?.enemies || []) {
    if (!isLiveBoss(boss) || !boss.hasLifesteal || !Number.isFinite(boss.maxHealth)
      || boss.maxHealth <= boss.health) continue;
    const amount = Math.min(2, boss.maxHealth - boss.health);
    boss.health += amount;
    boss.lifestealFeedbackAmount = amount;
    boss.lifestealFeedbackFrames = BOSS_HEAL_FEEDBACK_FRAMES;
    healed += amount;
  }
  return healed;
}
