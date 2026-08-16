/**
 * bossPhases.js — boss phase transitions and phase-sensitive projectile helpers.
 */

export function getBossRangedBurstCount(enemy) {
  if (!enemy?.isBossEnemy) return 1;
  return enemy.typeIndex === 4 && enemy.health < enemy.maxHealth * 0.5 ? 5 : 1;
}

const PHASE_TWO_WARNINGS = {
  4: "Strafe wide: Karen's phase-two volley spreads hard.",
  9: "Cut diagonally: rent shots accelerate in phase two.",
  16: "Save arena space: Splitter is about to shed shards.",
  17: "Dodge the lane first: Juggernaut charges faster now.",
  18: "Clear summons first: phase two floods the room.",
  20: "Use short lateral cuts: Algorithm patterns tighten.",
  21: "Stay patient: Developer gimmicks speed up after half health.",
};

export function getBossPhaseTwoWarning(enemyOrType) {
  const typeIndex = typeof enemyOrType === "object" ? enemyOrType?.typeIndex : enemyOrType;
  return PHASE_TWO_WARNINGS[typeIndex] || "Dodge first: phase two punishes greedy damage.";
}

export function triggerBossPhaseTwoTransition({
  enemy,
  gs,
  addText,
  addParticles,
  soundPhaseTwo,
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
  addText(gs, enemy.x, enemy.y - 66, getBossPhaseTwoWarning(enemy), "#FFD7A0", true);
  gs.screenShake = Math.max(gs.screenShake, 18);
  addParticles(gs, enemy.x, enemy.y, "#FF2200", 35);
  addParticles(gs, enemy.x, enemy.y, "#FF8800", 20);
  soundPhaseTwo();
  return true;
}
