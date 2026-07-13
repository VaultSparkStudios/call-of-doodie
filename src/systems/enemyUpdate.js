/**
 * enemyUpdate.js — pure per-frame enemy ability logic (App.jsx slice 4).
 *
 * Functions here are pure transformations: take explicit state/inputs,
 * return updated values (bullets[]) or mutate only the entity object.
 * React state setters (setHealth, handlePlayerDeath) stay in App.jsx.
 */

import { getBossRangedBurstCount } from "./bossPhases.js";

// Returns wave ability scale factor (slows ability cadence at high waves).
export function getWaveAbilityScale(wave) {
  return wave >= 40 ? 1.4 : wave >= 30 ? 1.2 : 1.0;
}

/**
 * Advance ranged-enemy shoot timer; returns array of bullet objects to push
 * into gs.enemyBullets. Mutates e.shootTimer.
 */
export function stepEnemyRangedFire(e, player, { chainEnrageLevel = 0 } = {}) {
  if (!e.ranged) return [];
  e.shootTimer++;
  const thresh = chainEnrageLevel === 2 ? e.projRate * 0.80
    : chainEnrageLevel === 1 ? e.projRate * 0.85 : e.projRate;
  if (e.shootTimer < thresh) return [];
  e.shootTimer = 0;
  const pa = Math.atan2(player.y - e.y, player.x - e.x);
  const bCount = getBossRangedBurstCount(e);
  const bullets = [];
  for (let bi = 0; bi < bCount; bi++) {
    const angle = pa + (bi - Math.floor(bCount / 2)) * 0.28;
    bullets.push({ x: e.x, y: e.y, vx: Math.cos(angle) * e.projSpeed, vy: Math.sin(angle) * e.projSpeed, life: 90, size: 4, color: e.color, damage: 6 + e.typeIndex * 2 });
  }
  return bullets;
}

/**
 * Step shield-pulse timer/state. Mutates e.shieldPulseActive / shieldPulseCooldown /
 * shieldPulseTimer in place.
 * Callbacks: addText(x,y,t,c,big), addParticles(x,y,c,n), addScreenShake(amount)
 */
export function stepBossShieldPulse(e, { addText, addParticles, addScreenShake } = {}) {
  if (!e.hasShieldPulse) return;
  if (!e.shieldPulseActive) {
    e.shieldPulseCooldown--;
    if (e.shieldPulseCooldown <= 0) {
      e.shieldPulseActive = true;
      e.shieldPulseTimer  = 180;
      e.shieldPulseCooldown = 480;
      addText?.(e.x, e.y - 80, "🛡 SHIELD PULSE!", "#00BFFF", true);
      addParticles?.(e.x, e.y, "#00BFFF", 12);
      addScreenShake?.(5);
    }
  } else {
    if (--e.shieldPulseTimer <= 0) e.shieldPulseActive = false;
  }
}

/**
 * Trigger enrage at 33% HP (one-time). Mutates e.enrageTriggered / speed / projRate.
 */
export function stepBossEnrage(e, { addText, addParticles, addScreenShake } = {}) {
  if (!e.hasEnrage || e.enrageTriggered || e.health >= e.maxHealth * 0.33) return;
  e.enrageTriggered = true;
  e.speed    *= 1.8;
  e.projRate  = Math.max(30, Math.floor(e.projRate * 0.5));
  addText?.(e.x, e.y - 80, "⚡ ENRAGED!!", "#FF0000", true);
  addParticles?.(e.x, e.y, "#FF4400", 25);
  addScreenShake?.(12);
}

/**
 * Step teleport timer; teleports near player when ready.
 * Mutates e.x / e.y / e.teleportTimer.
 * setSharedCooldown(frames) — caller sets e.sharedAbilityCooldown.
 */
export function stepBossTeleport(e, player, {
  W = 800, H = 600, abilityReady = true, waveScale = 1.0,
  addText, addParticles, addScreenShake, setSharedCooldown,
} = {}) {
  if (!e.hasTeleport) return;
  e.teleportTimer++;
  if (!abilityReady || e.teleportTimer < Math.floor(480 * waveScale)) return;
  e.teleportTimer = 0;
  setSharedCooldown?.(90);
  const tAngle = Math.random() * Math.PI * 2;
  const tDist  = 110 + Math.random() * 70;
  e.x = Math.max(e.size, Math.min(W - e.size, player.x + Math.cos(tAngle) * tDist));
  e.y = Math.max(e.size, Math.min(H - e.size, player.y + Math.sin(tAngle) * tDist));
  addText?.(e.x, e.y - 65, "🌀 BLINKED!", "#FF1493", true);
  addParticles?.(e.x, e.y, "#FF1493", 15);
  addScreenShake?.(8);
}

/**
 * Step bullet ring timer; returns bullets[] when ring fires.
 * Mutates e.bulletRingTimer / e.bulletRingWarning.
 */
export function stepBossBulletRing(e, {
  wave = 1, telegraphMult = {}, abilityReady = true, waveScale = 1.0,
  addText, addParticles, addScreenShake, setSharedCooldown,
} = {}) {
  if (!e.hasBulletRing) return [];
  e.bulletRingTimer++;
  const brCap  = Math.floor(360 * waveScale);
  const brWarn = Math.floor(60 * (telegraphMult[e.type] || 1));
  e.bulletRingWarning = abilityReady && e.bulletRingTimer >= brCap - brWarn && e.bulletRingTimer < brCap;
  if (!abilityReady || e.bulletRingTimer < brCap) return [];
  e.bulletRingTimer = 0;
  e.bulletRingWarning = false;
  setSharedCooldown?.(120);
  const brCount = wave >= 40 ? 12 : 8;
  const bullets = [];
  for (let ri = 0; ri < brCount; ri++) {
    const ba = (ri / brCount) * Math.PI * 2;
    bullets.push({ x: e.x, y: e.y, vx: Math.cos(ba) * 4.5, vy: Math.sin(ba) * 4.5, life: 120, size: 5, color: "#FF6600", damage: 12 });
  }
  addText?.(e.x, e.y - 80, "🔥 BULLET RING!", "#FF6600", true);
  addParticles?.(e.x, e.y, "#FF6600", 14);
  addScreenShake?.(6);
  return bullets;
}

/**
 * Step ground slam timer/warning/activation and radius expansion.
 * Returns true the frame the slam activates (so App.jsx can add the VFX).
 * Player damage on the shockwave ring remains in App.jsx (needs setHealth/handlePlayerDeath).
 * Mutates e.groundSlamTimer / groundSlamWarning / groundSlamActive / groundSlamRadius.
 */
export function stepBossGroundSlamTimer(e, {
  abilityReady = true, waveScale = 1.0, telegraphMult = {},
  addText, addParticles, addScreenShake, setSharedCooldown,
} = {}) {
  if (!e.hasGroundSlam) return false;
  if (e.groundSlamActive) {
    e.groundSlamRadius += 6;
    if (e.groundSlamRadius >= 230) e.groundSlamActive = false;
    return false;
  }
  e.groundSlamTimer++;
  const gsCap  = Math.floor(420 * waveScale);
  const gsWarn = Math.floor(90 * (telegraphMult[e.type] || 1));
  e.groundSlamWarning = abilityReady && e.groundSlamTimer >= gsCap - gsWarn && e.groundSlamTimer < gsCap;
  if (!abilityReady || e.groundSlamTimer < gsCap) return false;
  e.groundSlamTimer = 0;
  e.groundSlamWarning = false;
  e.groundSlamActive  = true;
  e.groundSlamRadius  = 0;
  setSharedCooldown?.(120);
  addText?.(e.x, e.y - 80, "💥 GROUND SLAM!", "#FF4400", true);
  addParticles?.(e.x, e.y, "#FF4400", 20);
  addScreenShake?.(14);
  return true;
}

/**
 * Shield regen: restore HP while not recently hit.
 * Resets timer each frame hitFlash > 0. Mutates e.health / e.shieldRegenTimer.
 */
export function stepBossShieldRegen(e) {
  if (!e.hasShieldRegen || e.maxHealth === undefined) return;
  if (e.hitFlash > 0) { e.shieldRegenTimer = 0; }
  else { e.shieldRegenTimer = (e.shieldRegenTimer || 0) + 1; }
  if (e.shieldRegenTimer > 120) {
    e.health = Math.min(e.maxHealth, (e.health || 0) + (e.shieldRegenRate || 0.5));
  }
}

/**
 * Speed surge: brief double-speed burst on cooldown.
 * Mutates e.speed / e.speedSurgeTimer / e.speedSurgeActive / e._baseSpeed.
 * Uses setTimeout for the 2-second deactivation (browser side-effect, not React state).
 */
export function stepBossSpeedSurge(e, { addText } = {}) {
  if (!e.hasSpeedSurge) return;
  e.speedSurgeTimer = (e.speedSurgeTimer || 0) + 1;
  if (e.speedSurgeTimer >= e.speedSurgeCooldown) {
    e.speedSurgeTimer  = 0;
    e.speedSurgeActive = true;
    setTimeout(() => { if (e) e.speedSurgeActive = false; }, 2000);
    addText?.(e.x, e.y - 50, "⚡ SPEED SURGE!", "#FF8800");
  }
  if (e.speedSurgeActive)   { e.speed = (e._baseSpeed || e.speed) * 2; }
  else if (e._baseSpeed)    { e.speed = e._baseSpeed; }
  else                      { e._baseSpeed = e.speed; }
}

/**
 * Bullet spray ring: 8 bullets in a 360° pattern on cooldown.
 * Returns bullets[].
 */
export function stepBossBulletSpray(e, { mutEnemyProjSpeed = 1 } = {}) {
  if (!e.hasBulletSpray) return [];
  e.bulletSprayTimer = (e.bulletSprayTimer || 0) + 1;
  if (e.bulletSprayTimer < e.bulletSprayCooldown) return [];
  e.bulletSprayTimer = 0;
  const bullets = [];
  for (let ang = 0; ang < Math.PI * 2; ang += Math.PI / 4) {
    bullets.push({ x: e.x, y: e.y, vx: Math.cos(ang) * mutEnemyProjSpeed * 4, vy: Math.sin(ang) * mutEnemyProjSpeed * 4, damage: 8, life: 60, size: 5, color: "#FF4400" });
  }
  return bullets;
}

/**
 * Permanent enrage below 40% HP (one-time).
 * Mutates e.enrageThresholdFired / e.enraged / e.speed.
 */
export function stepBossEnrageThreshold(e, { addText, addScreenShake } = {}) {
  if (!e.hasEnrageThreshold || e.enrageThresholdFired || e.health >= e.maxHealth * 0.4) return;
  e.enrageThresholdFired = true;
  e.enraged = true;
  e.speed  *= 1.4;
  addText?.(e.x, e.y - 60, "🔥 ENRAGED!", "#FF0000", true);
  addScreenShake?.(10);
}

/**
 * Drop proximity mines below 60% HP on cooldown.
 * Mutates gs.pickups.
 */
export function stepBossGroundMines(e, gs) {
  if (!e.hasGroundMines || e.health >= e.maxHealth * 0.6) return;
  e.mineDropTimer = (e.mineDropTimer || 0) + 1;
  if (e.mineDropTimer < e.mineDropCooldown) return;
  e.mineDropTimer = 0;
  gs.pickups.push({
    x: e.x + (Math.random() - 0.5) * 100,
    y: e.y + (Math.random() - 0.5) * 100,
    type: "mine",
    life: 600,
  });
}

/**
 * Magnet pull: deflect nearby player bullets tangentially.
 * Mutates gs.bullets vx/vy.
 */
export function stepBossMagnetPull(e, gs) {
  if (!e.hasMagnetPull || !e.magnetRadius) return;
  gs.bullets.forEach(b => {
    const md = Math.hypot(b.x - e.x, b.y - e.y);
    if (md < e.magnetRadius) {
      const ma = Math.atan2(b.y - e.y, b.x - e.x);
      b.vx += Math.cos(ma + Math.PI / 2) * 0.8;
      b.vy += Math.sin(ma + Math.PI / 2) * 0.8;
    }
  });
}

/**
 * Algorithm 3-shot spread (replaces standard ranged fire for typeIndex 20).
 * Returns bullets[]. Mutates e.shootTimer.
 */
export function stepAlgorithmSpread(e, player) {
  if (!e.ranged || e.shootTimer < e.projRate) return [];
  e.shootTimer = 0;
  const pa = Math.atan2(player.y - e.y, player.x - e.x);
  const bullets = [];
  for (let bi = -1; bi <= 1; bi++) {
    const ang = pa + bi * 0.32;
    bullets.push({ x: e.x, y: e.y, vx: Math.cos(ang) * e.projSpeed, vy: Math.sin(ang) * e.projSpeed, life: 100, size: 5, color: "#1DA1F2", damage: 8 });
  }
  return bullets;
}

/**
 * Developer merge conflict: 9 bullets in 3×3 spread pattern on cooldown.
 * Returns bullets[]. Mutates e.mergeConflictTimer.
 */
export function stepDeveloperMergeConflict(e, { addText } = {}) {
  if (!e.hasMergeConflict) return [];
  e.mergeConflictTimer = (e.mergeConflictTimer || 0) + 1;
  if (e.mergeConflictTimer < e.mergeConflictCooldown) return [];
  e.mergeConflictTimer = 0;
  addText?.(e.x, e.y - 55, "⚠️ MERGE CONFLICT!", "#FF8800");
  const bullets = [];
  for (let set = 0; set < 3; set++) {
    const baseAng = (set / 3) * Math.PI * 2;
    for (let spread = -1; spread <= 1; spread++) {
      const ang = baseAng + spread * 0.3;
      bullets.push({ x: e.x, y: e.y, vx: Math.cos(ang) * 5, vy: Math.sin(ang) * 5, damage: 12, life: 80, size: 5, color: "#FF8800" });
    }
  }
  return bullets;
}
