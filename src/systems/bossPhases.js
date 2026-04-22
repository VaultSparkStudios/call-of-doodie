/**
 * bossPhases.js — boss phase transitions and phase-sensitive projectile helpers.
 */

export function getBossRangedBurstCount(enemy) {
  if (!enemy?.isBossEnemy) return 1;
  return enemy.typeIndex === 4 && enemy.health < enemy.maxHealth * 0.5 ? 5 : 1;
}

export function triggerBossPhaseTwoTransition({
  enemy,
  gs,
  addText,
  addParticles,
  soundWaveClear,
}) {
  if (!enemy?.isBossEnemy || enemy.bossPhase2 || enemy.health <= 0 || enemy.health >= enemy.maxHealth * 0.5) {
    return false;
  }

  enemy.bossPhase2 = true;
  enemy.speed *= 1.35;
  if (enemy._baseSpeed) enemy._baseSpeed *= 1.35;
  if (enemy._baseSpeed2) enemy._baseSpeed2 *= 1.35;
  if (enemy.projRate) enemy.projRate = Math.max(25, Math.floor(enemy.projRate * 0.7));

  addText(gs, enemy.x, enemy.y - 90, "⚡ PHASE 2!", "#FF2200", true);
  gs.screenShake = Math.max(gs.screenShake, 18);
  addParticles(gs, enemy.x, enemy.y, "#FF2200", 35);
  addParticles(gs, enemy.x, enemy.y, "#FF8800", 20);
  soundWaveClear();
  return true;
}
