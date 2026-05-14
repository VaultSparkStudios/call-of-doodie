// combatResolution.js — pure combat math for player projectile resolution.
//
// This module deliberately avoids React refs, particles, sounds, analytics, and
// state setters. App.jsx still owns side effects, but the rules that determine
// hit geometry, crits, shield multipliers, lightning targets, and projectile
// consumption now live here so replay validation can converge on the same core.

/**
 * Returns true if the point (px, py) is inside the axis-aligned circle
 * defined by (cx, cy, r). Used by Hot Zones, sniper windows, lockdown radii.
 */
export function pointInCircle(px, py, cx, cy, r) {
  const dx = px - cx, dy = py - cy;
  return (dx * dx + dy * dy) <= r * r;
}

/**
 * Returns the squared distance between two points (avoids the sqrt in tight
 * inner loops; safe to compare with radius * radius).
 */
export function dist2(ax, ay, bx, by) {
  const dx = ax - bx, dy = ay - by;
  return dx * dx + dy * dy;
}

export function bulletEnemyCollision(bullet, enemy) {
  if (!bullet || !enemy) return { hit: false, radius: 0, distanceSq: Infinity };
  const radius = (enemy.size || 0) / 2 + (bullet.size || 0);
  const dx = (bullet.x || 0) - (enemy.x || 0);
  const dy = (bullet.y || 0) - (enemy.y || 0);
  if (Math.abs(dx) > radius || Math.abs(dy) > radius) {
    return { hit: false, radius, distanceSq: dx * dx + dy * dy };
  }
  const distanceSq = dx * dx + dy * dy;
  return { hit: distanceSq < radius * radius, radius, distanceSq };
}

/**
 * Returns true when the bullet landed near the enemy's core — within 35% of
 * the enemy radius (ignoring the bullet size component). Used for precision /
 * skill-shot bonus 💩 coin rewards.
 */
export function isPrecisionHit(bullet, enemy) {
  if (!bullet || !enemy || !enemy.size) return false;
  const coreRadius = (enemy.size / 2) * 0.35;
  const dx = (bullet.x || 0) - (enemy.x || 0);
  const dy = (bullet.y || 0) - (enemy.y || 0);
  return (dx * dx + dy * dy) < coreRadius * coreRadius;
}

export function rollCrit({ baseCrit = 0, perkCrit = 0, runCrit = 0, rng = Math.random } = {}) {
  const chance = Math.max(0, Math.min(1, baseCrit + perkCrit + runCrit));
  return { isCrit: rng() < chance, chance };
}

export function getShieldFacingMultiplier({ enemy, bullet, player }) {
  if (!enemy || enemy.typeIndex !== 11) return 1;
  const moveAngle = Math.atan2((player?.y || 0) - enemy.y, (player?.x || 0) - enemy.x);
  const bulletAngle = Math.atan2(bullet?.vy || 0, bullet?.vx || 0);
  const angleDiff = Math.abs(Math.atan2(Math.sin(bulletAngle - moveAngle), Math.cos(bulletAngle - moveAngle)));
  return angleDiff < Math.PI / 2 ? 0.20 : 1.60;
}

export function computeBulletDamage({
  bullet,
  enemy,
  player,
  comboCount = 0,
  critMult = 2,
  critMultBonus = 0,
  isCrit = false,
  lastResort = false,
  rageActive = false,
} = {}) {
  const comboMult = 1 + Math.max(0, comboCount) * 0.1;
  const lastResortMult = lastResort && player?.health < (player?.maxHealth || 0) * 0.25 ? 3.0 : 1.0;
  const shieldMult = getShieldFacingMultiplier({ enemy, bullet, player });
  const rageMult = rageActive ? 1.75 : 1.0;
  const jugShieldMult = enemy?.typeIndex === 17 && (enemy.jugShield || 0) > 0 ? 0.15 : 1.0;
  const damage = (bullet?.damage || 0)
    * comboMult
    * (isCrit ? critMult + critMultBonus : 1)
    * lastResortMult
    * shieldMult
    * (enemy?.dmgMult || 1)
    * rageMult
    * jugShieldMult;
  return { damage, comboMult, shieldMult, lastResortMult, rageMult, jugShieldMult };
}

export function computeJuggernautShieldDamage({ bulletDamage = 0, comboCount = 0, isCrit = false, critMult = 2 } = {}) {
  return bulletDamage * (1 + Math.max(0, comboCount) * 0.1) * (isCrit ? critMult : 1);
}

export function computeIncomingDamage({ baseDamage = 0, glassjaw = false, glassjawMult = 2, armorMult = 1 } = {}) {
  const glassMult = glassjaw ? glassjawMult || 2 : 1;
  return Math.max(0, baseDamage * glassMult * (armorMult || 1));
}

export function enemyProjectilePlayerCollision(projectile, player, { radius = 18 } = {}) {
  if (!projectile || !player) return { hit: false, radius, distanceSq: Infinity };
  const distanceSq = dist2(projectile.x || 0, projectile.y || 0, player.x || 0, player.y || 0);
  return { hit: distanceSq < radius * radius, radius, distanceSq };
}

export function resolvePlayerDamage({
  player,
  baseDamage = 0,
  invincibleFrames = 20,
  screenShake = 0,
  damageFlash = 0,
  glassjaw = false,
  glassjawMult = 2,
  armorMult = 1,
} = {}) {
  const damage = computeIncomingDamage({ baseDamage, glassjaw, glassjawMult, armorMult });
  const health = Math.max(0, (player?.health || 0) - damage);
  return {
    damage,
    health,
    dead: health <= 0,
    invincibleFrames,
    screenShake,
    damageFlash,
  };
}

export function resolveEnemyProjectilePlayerHit({ projectile, player, dashActive = false, ...damageArgs } = {}) {
  if (dashActive || (player?.invincible || 0) > 0) return { hit: false };
  const collision = enemyProjectilePlayerCollision(projectile, player);
  if (!collision.hit) return { hit: false, collision };
  return {
    hit: true,
    collision,
    projectileLife: 0,
    ...resolvePlayerDamage({
      player,
      baseDamage: projectile?.damage || 8,
      invincibleFrames: 20,
      screenShake: 5,
      damageFlash: 8,
      ...damageArgs,
    }),
  };
}

export function resolveEnemyContactPlayerHit({ enemy, player, dashActive = false, ...damageArgs } = {}) {
  if (dashActive || !enemy || !player || (player.invincible || 0) > 0) return { hit: false };
  const radius = (enemy.size || 0) / 2 + 15;
  const distanceSq = dist2(enemy.x || 0, enemy.y || 0, player.x || 0, player.y || 0);
  if (distanceSq >= radius * radius) return { hit: false, collision: { radius, distanceSq } };
  return {
    hit: true,
    collision: { radius, distanceSq },
    ...resolvePlayerDamage({
      player,
      baseDamage: 10 + (enemy.typeIndex || 0) * 5,
      invincibleFrames: 30,
      screenShake: 8,
      damageFlash: 10,
      ...damageArgs,
    }),
  };
}

export function resolveGrenadeEnemyDamage({
  grenade,
  enemy,
  radius = 130,
  baseDamage = 70,
  damageMult = 1,
} = {}) {
  if (!grenade || !enemy) return { hit: false, distance: Infinity, damage: 0, radius };
  const distance = Math.hypot((enemy.x || 0) - (grenade.x || 0), (enemy.y || 0) - (grenade.y || 0));
  if (distance >= radius) return { hit: false, distance, damage: 0, radius };
  return {
    hit: true,
    distance,
    radius,
    damage: baseDamage * (1 - distance / radius) * (damageMult || 1),
  };
}

export function findLightningChainTarget(enemies = [], sourceEnemy, { range = 200 } = {}) {
  if (!sourceEnemy) return null;
  const rangeSq = range * range;
  let best = null;
  let bestSq = rangeSq;
  for (const enemy of enemies) {
    if (!enemy || enemy === sourceEnemy || enemy.health <= 0) continue;
    const d = dist2(enemy.x, enemy.y, sourceEnemy.x, sourceEnemy.y);
    if (d < bestSq) {
      bestSq = d;
      best = enemy;
    }
  }
  return best;
}

export function resolvePierce({ pierceLeft = 0 } = {}) {
  const nextPierceLeft = Math.max(0, pierceLeft - 1);
  return { nextPierceLeft, consumeBullet: pierceLeft <= 0 };
}

export function resolveObstacleBounce(bullet, obstacle) {
  if (!bullet || !obstacle) return { bounced: false, consumed: false };
  const inside = bullet.x >= obstacle.x && bullet.x <= obstacle.x + obstacle.w
    && bullet.y >= obstacle.y && bullet.y <= obstacle.y + obstacle.h;
  if (!inside) return { bounced: false, consumed: false };
  if ((bullet.bouncesLeft || 0) <= 0) return { bounced: false, consumed: true };

  const prevX = bullet.x - bullet.vx;
  const prevY = bullet.y - bullet.vy;
  const hitVerticalFace = prevX < obstacle.x || prevX > obstacle.x + obstacle.w;
  return {
    bounced: true,
    consumed: false,
    x: prevX + (hitVerticalFace ? -bullet.vx : bullet.vx),
    y: prevY + (hitVerticalFace ? bullet.vy : -bullet.vy),
    vx: hitVerticalFace ? -bullet.vx : bullet.vx,
    vy: hitVerticalFace ? bullet.vy : -bullet.vy,
    bouncesLeft: bullet.bouncesLeft - 1,
    life: Math.max(bullet.life || 0, 35),
  };
}
