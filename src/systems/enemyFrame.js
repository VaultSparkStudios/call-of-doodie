import { ENEMY_TYPES } from "../constants.js";
import { cosmeticRandom, getRunRng } from "./runRng.js";
import { addParticles, addText, MAX_PARTICLES } from "./transientPresentation.js";
import { applyObservedPlayerDamage } from "./damageSequence.js";
import { rumbleGamepad, vibrate } from "../utils/haptics.js";
import { soundBossPhase2 } from "../sounds.js";
import { getBossRangedBurstCount, triggerBossPhaseTwoTransition } from "./bossPhases.js";
import { retireEnemyWithoutDefeat } from "./enemyDefeatLifecycle.js";
import { applySergeantAura, buildEnemyFrameIndex, countSummonsFor, createEnemyFrameIndex } from "./frameIndex.js";
import { buildFlowField, sampleFlowField } from "./flowField.js";

const MAX_DYING_ANIM = 20;

/**
 * Pick the unit an enemy steers toward and fires at.
 *
 * Today that is the player. Allies (S163+) register as `gs.allies` with a
 * `faction` field; enemies target the nearest live unit. Mode-declared
 * structures/zones can be added to the candidate list by the mode definition
 * via `gs._targetables` (array of {x,y,alive?}).
 */
export function pickTarget(e, gs, player) {
  let best = player;
  let bestD = Math.hypot(player.x - e.x, player.y - e.y);
  if (e.fleeing) return best;
  const allies = gs.allies || [];
  for (let i = 0; i < allies.length; i += 1) {
    const a = allies[i];
    if (!a || a.downed || a.untargetable) continue;
    const d = Math.hypot(a.x - e.x, a.y - e.y);
    if (d < bestD) { best = a; bestD = d; }
  }
  const extra = gs._targetables || [];
  for (let i = 0; i < extra.length; i += 1) {
    const s = extra[i];
    if (!s || s.alive === false) continue;
    const d = Math.hypot(s.x - e.x, s.y - e.y);
    if (d < bestD) { best = s; bestD = d; }
  }
  return best;
}

/**
 * Advance every enemy-owned part of one deterministic combat frame:
 * flow-field steering, aura, movement, ranged fire, boss abilities, contact
 * damage, and hazard tiles. Extracted verbatim from App.jsx (S163) in the
 * same callback-bag shape as `stepProjectileFrame` so it can later run
 * headless inside `stepSim`.
 */
export function stepEnemyFrame({
  gs,
  player,
  world,
  frame,
  dashActiveFrames = 0,
  spawnEnemy = () => {},
  setHealth = () => {},
  handlePlayerDeath = () => {},
} = {}) {
  if (!gs || !player || !world) return { ok: false, reason: "missing-runtime" };
  const p = player;
  const W = Number.isFinite(world.W) ? world.W : 1280;
  const H = Number.isFinite(world.H) ? world.H : 720;
  // ── Flow field rebuild (every 30 frames or on significant player movement) ──
  gs._ffTimer = (gs._ffTimer || 0) + 1;
  const _ffPx = gs._ffPx || 0, _ffPy = gs._ffPy || 0;
  if (gs._ffTimer >= 30 || Math.hypot(p.x - _ffPx, p.y - _ffPy) > 48) {
    gs._ffTimer = 0; gs._ffPx = p.x; gs._ffPy = p.y;
    gs.flowField = buildFlowField(W, H, p.x, p.y, gs.obstacles || []);
  }

  // ── Sergeant Karen aura ──
  gs._enemyFrameIndex = buildEnemyFrameIndex(gs.enemies, gs._enemyFrameIndex || createEnemyFrameIndex());
  applySergeantAura(gs.enemies, gs._enemyFrameIndex);

  // ── Enemy movement & melee ──
  gs.enemies.forEach(e => {
    const t = pickTarget(e, gs, p);
    // Phantom elite: toggle visibility every 90 frames
    if (e.eliteType === "phantom") {
      e.phantomTimer = (e.phantomTimer || 0) + 1;
      if (e.phantomTimer >= 90) { e.phantomTimer = 0; e.phantomVisible = !e.phantomVisible; }
    }
    e.wobble += 0.1;
    const zigzag = e.typeIndex === 10 ? Math.sin(e.wobble * 3) * 3 : 0;
    const freezeMult = (gs.freezeTimer || 0) > 0 ? 0.35 : 1;
    const timeDilMult = (gs.timeDilationTimer || 0) > 0 ? 0.18 : 1;
    const _enrageMult = gs._chainEnrageLevel === 2 ? 1.20 : gs._chainEnrageLevel === 1 ? 1.10 : 1.0;
    const buffedSpeed = e.speed * (e.buffed ? 1.35 : 1) * (gs.enemySpeedMult || 1) * freezeMult * timeDilMult * _enrageMult;
    // Flow field steering: sample flow field, fall back to direct angle if no cell data
    const ff = gs.flowField;
    let sx, sy;
    // The flow field is built toward the player; when the chosen target is an
    // ally, zone, or structure, steer directly at it instead (S163).
    if (ff && !e.chargeActive && t === p) {
      const sampled = sampleFlowField(ff, e.x, e.y);
      if (sampled) {
        sx = sampled.sx; sy = sampled.sy;
      } else {
        const a = Math.atan2(t.y - e.y, t.x - e.x);
        sx = Math.cos(a); sy = Math.sin(a);
      }
    } else {
      const a = Math.atan2(t.y - e.y, t.x - e.x);
      sx = Math.cos(a); sy = Math.sin(a);
    }
    // HUNT objective: a marked target runs away from the player instead of toward it.
    if (e.fleeing) { sx = -sx; sy = -sy; }
    // Wall-avoidance steering: repulse from close walls (keeps enemies from clipping)
    if (!e.chargeActive) {
      (gs.obstacles || []).forEach(ob => {
        const nx = Math.max(ob.x, Math.min(e.x, ob.x + ob.w));
        const ny = Math.max(ob.y, Math.min(e.y, ob.y + ob.h));
        const rdx = e.x - nx, rdy = e.y - ny;
        const rdist = Math.hypot(rdx, rdy);
        const AVOID_R = e.size / 2 + 32;
        if (rdist < AVOID_R && rdist > 0) {
          const str = (AVOID_R - rdist) / AVOID_R;
          sx += (rdx / rdist) * str * 3.5;
          sy += (rdy / rdist) * str * 3.5;
        }
      });
      const slen = Math.hypot(sx, sy);
      if (slen > 0) { sx /= slen; sy /= slen; }
    }
    // Doomscroller: periodically freezes while doomscrolling (every 280 frames, stops for 70)
    if (e.typeIndex === 19 && !e.isBossEnemy) {
      e.doomscrollTimer = (e.doomscrollTimer || 0) + 1;
      e.doomscrolling = (e.doomscrollTimer % 280) < 70;
      if ((e.doomscrollTimer % 280) === 0) addParticles(gs, e.x, e.y - 20, "#7B68EE", 3);
    }
    // Skip regular movement for Juggernaut during charge/stun, or Doomscroller while frozen
    const _skipMove = (e.typeIndex === 17 && (e.jugCharging || (e.jugStunned || 0) > 0)) || (e.typeIndex === 19 && e.doomscrolling);
    if (!_skipMove) {
      e.x += sx * buffedSpeed + Math.sin(e.wobble) * 0.5 + (-sy) * zigzag;
      e.y += sy * buffedSpeed + Math.cos(e.wobble) * 0.5 + sx * zigzag;
      // Cursed Run: acid trail particles
      if (gs.cursedAcidTrails && !e.isBossEnemy && cosmeticRandom() < 0.15) {
        if ((gs.particles?.length || 0) < MAX_PARTICLES) {
          gs.particles.push({ x: e.x, y: e.y, vx: (cosmeticRandom() - 0.5) * 0.5, vy: (cosmeticRandom() - 0.5) * 0.5, life: 50, color: "#44FF44", size: 3 });
        }
      }
    }
    if (e.hitFlash > 0) e.hitFlash--;
    if ((e._spawnFlashTimer || 0) > 0) e._spawnFlashTimer--;
    if ((e._tauntCooldown || 0) > 0) e._tauntCooldown--;
    // Combat taunt: alive enemy quips at player (0.4%/frame, per-enemy 180f + global 60f cooldown)
    if (!e.isBossEnemy && !(gs._globalTauntCooldown > 0) && !(e._tauntCooldown > 0) && cosmeticRandom() < 0.004) {
      const _taunts = ENEMY_TYPES[e.typeIndex]?.combatTaunts;
      if (_taunts) {
        addText(gs, e.x, e.y - e.size - 10, _taunts[Math.floor(cosmeticRandom() * _taunts.length)], e.color);
        e._tauntCooldown = 180;
        gs._globalTauntCooldown = 60;
      }
    }
    if (e.ranged) {
      e.shootTimer++;
      const _enrageFireThresh = gs._chainEnrageLevel === 2 ? e.projRate * 0.80 : gs._chainEnrageLevel === 1 ? e.projRate * 0.85 : e.projRate;
      if (e.shootTimer >= _enrageFireThresh) {
        e.shootTimer = 0;
        const pa = Math.atan2(t.y - e.y, t.x - e.x);
        // Mega Karen phase 2: 5-bullet spread
        const bCount = getBossRangedBurstCount(e);
        for (let bi = 0; bi < bCount; bi++) {
          const angle = pa + (bi - Math.floor(bCount / 2)) * 0.28;
          gs.enemyBullets.push({ x: e.x, y: e.y, vx: Math.cos(angle) * e.projSpeed, vy: Math.sin(angle) * e.projSpeed, life: 90, size: 4, color: e.color, damage: 6 + e.typeIndex * 2, sourceType: e.typeIndex, sourceName: ENEMY_TYPES[e.typeIndex]?.name || e.name, sourceId: e.id ?? null });
        }
      }
    }
    // ── Boss special mechanics ──────────────────────────────────────────────
    if (e.isBossEnemy) {
      if (e.typeIndex === 4) { // Mega Karen: charge attack
        const phaseTwo = e.health < e.maxHealth * 0.5;
        e.chargeTimer++;
        if (!e.chargeActive && e.chargeTimer >= (phaseTwo ? 150 : 280)) {
          e.chargeTimer = 0; e.chargeActive = true; e.chargeDuration = 20;
          const ca = Math.atan2(t.y - e.y, t.x - e.x);
          e.chargeDx = Math.cos(ca); e.chargeDy = Math.sin(ca);
          addText(gs, e.x, e.y - 65, phaseTwo ? "⚡ ULTRA RAGE!!" : "I WANT YOUR MANAGER!", "#FF1493", true);
          gs.screenShake = 10; addParticles(gs, e.x, e.y, "#FF1493", 15);
        }
        if (e.chargeActive) {
          e.x += e.chargeDx * 11; e.y += e.chargeDy * 11;
          if (--e.chargeDuration <= 0) e.chargeActive = false;
        }
      }
      if (e.typeIndex === 9) { // Landlord: summon tenants
        e.summonTimer++;
        const summonCD    = e.hasMinionSurge ? 240 : 360;
        const summonCount = e.hasMinionSurge ? 4 : (gs.currentWave >= 12 ? 2 : 1);
        if (e.summonTimer >= summonCD) {
          e.summonTimer = 0;
          for (let _si = 0; _si < summonCount; _si++) spawnEnemy(gs);
          const summonMsg = e.hasMinionSurge ? "RENT STRIKE! ALL TENANTS, ATTACK!" : "PAY RENT OR VACATE!";
          addText(gs, e.x, e.y - 65, summonMsg, "#8B6914", true);
          gs.screenShake = 6; addParticles(gs, e.x, e.y, "#8B6914", 12);
        }
        if (e.hasRentNuke) {
          e.rentNukeTimer++;
          if (e.rentNukeTimer >= 600) { // every 10 seconds
            e.rentNukeTimer = 0;
            addText(gs, e.x, e.y - 80, "💸 RENT IS DUE!!", "#FFD700", true);
            addParticles(gs, e.x, e.y, "#FFD700", 20);
            gs.screenShake = 15;
            const rentDist = Math.hypot(p.x - e.x, p.y - e.y);
            if (rentDist < 220 && p.invincible <= 0) {
              applyObservedPlayerDamage(gs, { damage: 25 * (gs._treeArmorMult || 1), frame: frame, kind: "boss", sourceType: e.typeIndex, sourceName: `${ENEMY_TYPES[e.typeIndex]?.name || "Landlord"} rent nuke` }); p.invincible = 30; gs.damageFlash = 12;
              gs.damageThisWave = (gs.damageThisWave || 0) + 1;
              setHealth(Math.max(0, p.health));
              addText(gs, p.x, p.y - 30, "-25 RENT DUE!", "#FFD700");
              rumbleGamepad(0.4, 0.6, 150);
              if (p.health <= 0) handlePlayerDeath(gs);
            }
          }
        }
      }
      // ── Shared ability stagger: prevents multiple abilities firing simultaneously ──
      if ((e.sharedAbilityCooldown || 0) > 0) e.sharedAbilityCooldown--;
      const _abilityReady = (e.sharedAbilityCooldown || 0) <= 0;
      // At high waves (40+) scale ability timers up so they're less frequent
      const _waveScale = gs.currentWave >= 40 ? 1.4 : gs.currentWave >= 30 ? 1.2 : 1.0;
      // ── Shared boss abilities (scale per wave) ──────────────────────────
      if (e.hasShieldPulse) {
        if (!e.shieldPulseActive) {
          e.shieldPulseCooldown--;
          if (e.shieldPulseCooldown <= 0) {
            e.shieldPulseActive = true;
            e.shieldPulseTimer  = 180; // active 3 seconds
            e.shieldPulseCooldown = 480; // recharge 8 seconds
            addText(gs, e.x, e.y - 80, "🛡 SHIELD PULSE!", "#00BFFF", true);
            addParticles(gs, e.x, e.y, "#00BFFF", 12);
            gs.screenShake = 5;
          }
        } else {
          if (--e.shieldPulseTimer <= 0) e.shieldPulseActive = false;
        }
      }
      if (e.hasEnrage && !e.enrageTriggered && e.health < e.maxHealth * 0.33) {
        e.enrageTriggered = true;
        e.speed    *= 1.8;
        e.projRate  = Math.max(30, Math.floor(e.projRate * 0.5));
        addText(gs, e.x, e.y - 80, "⚡ ENRAGED!!", "#FF0000", true);
        addParticles(gs, e.x, e.y, "#FF4400", 25);
        gs.screenShake = 12;
      }
      if (e.hasTeleport) {
        e.teleportTimer++;
        if (_abilityReady && e.teleportTimer >= Math.floor(480 * _waveScale)) {
          e.teleportTimer = 0;
          e.sharedAbilityCooldown = 90;
          const teleportRng = getRunRng(gs, "hazards");
          const tAngle = teleportRng() * Math.PI * 2;
          const tDist  = 110 + teleportRng() * 70;
          e.x = Math.max(e.size, Math.min(W - e.size, p.x + Math.cos(tAngle) * tDist));
          e.y = Math.max(e.size, Math.min(H - e.size, p.y + Math.sin(tAngle) * tDist));
          addText(gs, e.x, e.y - 65, "🌀 BLINKED!", "#FF1493", true);
          addParticles(gs, e.x, e.y, "#FF1493", 15);
          gs.screenShake = 8;
        }
      }
      // ── Bullet Ring (wave 10+): fires 8 bullets in 360° pattern ──────────
      if (e.hasBulletRing) {
        e.bulletRingTimer++;
        const _brCap = Math.floor(360 * _waveScale);
        // Warning flash: 1 second (60 frames) before the ring fires
        // Adaptive widen if player has been dying to this enemy type recently
        const _brWarn = Math.floor(60 * (gs._telegraphMult?.[e.type] || 1));
        e.bulletRingWarning = _abilityReady && e.bulletRingTimer >= _brCap - _brWarn && e.bulletRingTimer < _brCap;
        if (_abilityReady && e.bulletRingTimer >= _brCap) {
          e.bulletRingTimer = 0;
          e.bulletRingWarning = false;
          e.sharedAbilityCooldown = 120;
          const _brCount = gs.currentWave >= 40 ? 12 : 8;
          for (let _ri = 0; _ri < _brCount; _ri++) {
            const ba = (_ri / _brCount) * Math.PI * 2;
            gs.enemyBullets.push({ x: e.x, y: e.y, vx: Math.cos(ba) * 4.5, vy: Math.sin(ba) * 4.5, life: 120, size: 5, color: "#FF6600", damage: 12, sourceType: e.typeIndex, sourceName: `${ENEMY_TYPES[e.typeIndex]?.name || "Boss"} bullet ring` });
          }
          addText(gs, e.x, e.y - 80, "🔥 BULLET RING!", "#FF6600", true);
          addParticles(gs, e.x, e.y, "#FF6600", 14);
          gs.screenShake = 6;
        }
      }
      // ── Ground Slam (wave 15+): expanding shockwave ring ─────────────────
      if (e.hasGroundSlam) {
        if (!e.groundSlamActive) {
          e.groundSlamTimer++;
          const _gsCap = Math.floor(420 * _waveScale);
          // Warning flash: 1.5 seconds (90 frames) before the slam triggers
          const _gsWarn = Math.floor(90 * (gs._telegraphMult?.[e.type] || 1));
          e.groundSlamWarning = _abilityReady && e.groundSlamTimer >= _gsCap - _gsWarn && e.groundSlamTimer < _gsCap;
          if (_abilityReady && e.groundSlamTimer >= _gsCap) {
            e.groundSlamTimer = 0; e.groundSlamWarning = false; e.groundSlamActive = true; e.groundSlamRadius = 0;
            e.sharedAbilityCooldown = 120;
            addText(gs, e.x, e.y - 80, "💥 GROUND SLAM!", "#FF4400", true);
            addParticles(gs, e.x, e.y, "#FF4400", 20);
            gs.screenShake = 14;
          }
        } else {
          e.groundSlamRadius += 6;
          const slamDist = Math.hypot(p.x - e.x, p.y - e.y);
          if (e.groundSlamRadius > 40 && slamDist > e.groundSlamRadius - 28 && slamDist < e.groundSlamRadius + 18 && p.invincible <= 0) {
            const _slamBase = (gs.currentWave >= 40 ? 25 : 18) * (gs._treeArmorMult || 1);
            const _slamDmg = gs.glassjaw ? Math.round(_slamBase * (gs.glassjawMult || 2)) : _slamBase;
            applyObservedPlayerDamage(gs, { damage: _slamDmg, frame: frame, kind: "boss", sourceType: e.typeIndex, sourceName: `${ENEMY_TYPES[e.typeIndex]?.name || "Boss"} ground slam` }); p.invincible = 25; gs.damageFlash = 10;
            gs.damageThisWave = (gs.damageThisWave || 0) + 1;
            setHealth(Math.max(0, p.health));
            addText(gs, p.x, p.y - 30, "-" + _slamDmg + " SLAM!", "#FF4400");
            rumbleGamepad(0.4, 0.65, 150);
            if (p.health <= 0) handlePlayerDeath(gs);
          }
          if (e.groundSlamRadius >= 230) e.groundSlamActive = false;
        }
      }
    }
    // ── Procedural boss abilities (bonus abilities assigned on spawn) ──────
    if (e.isBossEnemy) {
      // Shield regen: restore HP while not recently hit (reset timer on any hit)
      if (e.hasShieldRegen && e.maxHealth !== undefined) {
        if (e.hitFlash > 0) { e.shieldRegenTimer = 0; }
        else { e.shieldRegenTimer = (e.shieldRegenTimer || 0) + 1; }
        if (e.shieldRegenTimer > 120) {
          e.health = Math.min(e.maxHealth, (e.health || 0) + (e.shieldRegenRate || 0.5));
        }
      }
      // Speed surge: brief double-speed burst
      if (e.hasSpeedSurge) {
        e.speedSurgeTimer = (e.speedSurgeTimer || 0) + 1;
        if (e.speedSurgeTimer >= e.speedSurgeCooldown) {
          e.speedSurgeTimer = 0;
          e.speedSurgeActive = true;
          setTimeout(() => { if (e) e.speedSurgeActive = false; }, 2000);
          addText(gs, e.x, e.y - 50, "⚡ SPEED SURGE!", "#FF8800");
        }
      }
      if (e.speedSurgeActive) { e.speed = (e._baseSpeed || e.speed) * 2; }
      else if (e._baseSpeed) { e.speed = e._baseSpeed; }
      else { e._baseSpeed = e.speed; }
      // Bullet spray: ring of 8 bullets
      if (e.hasBulletSpray) {
        e.bulletSprayTimer = (e.bulletSprayTimer || 0) + 1;
        if (e.bulletSprayTimer >= e.bulletSprayCooldown) {
          e.bulletSprayTimer = 0;
          for (let _ang = 0; _ang < Math.PI * 2; _ang += Math.PI / 4) {
            gs.enemyBullets.push({ x: e.x, y: e.y, vx: Math.cos(_ang) * (gs.mutEnemyProjSpeed || 1) * 4, vy: Math.sin(_ang) * (gs.mutEnemyProjSpeed || 1) * 4, damage: 8, life: 60, size: 5, color: "#FF4400", sourceType: e.typeIndex, sourceName: `${ENEMY_TYPES[e.typeIndex]?.name || "Enemy"} bullet spray` });
          }
        }
      }
      // Enrage threshold: permanent enrage below 40% HP
      if (e.hasEnrageThreshold && !e.enrageThresholdFired && e.health < e.maxHealth * 0.4) {
        e.enrageThresholdFired = true;
        e.enraged = true;
        e.speed *= 1.4;
        addText(gs, e.x, e.y - 60, "🔥 ENRAGED!", "#FF0000", true);
        gs.screenShake = 10;
      }
      // Ground mines: drop proximity mines below 60% HP
      if (e.hasGroundMines && e.health < e.maxHealth * 0.6) {
        e.mineDropTimer = (e.mineDropTimer || 0) + 1;
        if (e.mineDropTimer >= e.mineDropCooldown) {
          e.mineDropTimer = 0;
          const mineRng = getRunRng(gs, "hazards");
          gs.pickups.push({ x: e.x + (mineRng() - 0.5) * 100, y: e.y + (mineRng() - 0.5) * 100, type: "mine", life: 600 });
        }
      }
      // Magnet pull: deflect nearby player bullets
      if (e.hasMagnetPull && e.magnetRadius) {
        gs.bullets.forEach(b => {
          const _md = Math.hypot(b.x - e.x, b.y - e.y);
          if (_md < e.magnetRadius) {
            const _ma = Math.atan2(b.y - e.y, b.x - e.x);
            b.vx += Math.cos(_ma + Math.PI / 2) * 0.8;
            b.vy += Math.sin(_ma + Math.PI / 2) * 0.8;
          }
        });
      }
    }
    // ── Juggernaut (17): shield regen + charge ──
    if (e.typeIndex === 17 && e.isBossEnemy) {
      // Shield regen
      if ((e.jugShield || 0) < e.jugShieldMax) {
        if ((e.jugShieldRegenDelay || 0) > 0) { e.jugShieldRegenDelay--; }
        else { e.jugShield = Math.min(e.jugShieldMax, (e.jugShield || 0) + e.jugShieldMax * 0.003); }
      }
      // Charge logic
      if (e.jugStunned > 0) { e.jugStunned--; }
      else if (e.jugCharging) {
        // Move in charge direction at high speed
        e.x += e.jugChargeDx * 9; e.y += e.jugChargeDy * 9;
        e.jugChargeFrames--;
        // Check wall hit
        const hitWall = (gs.obstacles || []).some(ob => e.x > ob.x && e.x < ob.x + ob.w && e.y > ob.y && e.y < ob.y + ob.h);
        if (hitWall || e.jugChargeFrames <= 0) {
          e.jugCharging = false; e.jugStunned = 60; e.jugChargeCooldown = 300;
          if (hitWall) { gs.screenShake = 12; addText(gs, e.x, e.y - 50, "💥 WALL HIT!", "#FF8800"); addParticles(gs, e.x, e.y, "#CC4400", 15); }
        }
        // Hit player while charging
        if (Math.hypot(p.x - e.x, p.y - e.y) < e.size / 2 + 18 && p.invincible <= 0) {
          let cdmg = 30; if (gs.glassjaw) cdmg *= (gs.glassjawMult || 2); cdmg *= (gs._treeArmorMult || 1);
          applyObservedPlayerDamage(gs, { damage: cdmg, frame: frame, kind: "contact", sourceType: e.typeIndex, sourceName: `${ENEMY_TYPES[e.typeIndex]?.name || "Juggernaut"} charge` }); p.invincible = 35; gs.damageFlash = 12; gs.damageThisWave = (gs.damageThisWave || 0) + 1;
          setHealth(Math.max(0, p.health)); addText(gs, p.x, p.y - 30, "-" + Math.floor(cdmg) + " CHARGE!", "#FF4400");
          rumbleGamepad(0.5, 0.8, 200);
          if (p.health <= 0) handlePlayerDeath(gs);
        }
      } else {
        // Charge windup
        if ((e.jugChargeCooldown || 0) > 0) { e.jugChargeCooldown--; }
        else {
          e.jugChargeWindup = (e.jugChargeWindup || 0) + 1;
          if (e.jugChargeWindup === 1) addText(gs, e.x, e.y - 60, "⚠ CHARGING...", "#FF6600");
          if (e.jugChargeWindup >= 90) {
            e.jugChargeWindup = 0; e.jugCharging = true; e.jugChargeFrames = 55;
            const _ca = Math.atan2(t.y - e.y, t.x - e.x);
            e.jugChargeDx = Math.cos(_ca); e.jugChargeDy = Math.sin(_ca);
            addText(gs, e.x, e.y - 60, "🦏 CHARGE!", "#FF4400", true);
            addParticles(gs, e.x, e.y, "#CC4400", 20);
          }
        }
      }
    }
    // ── Summoner (18): summon elites + invulnerability ──
    if (e.typeIndex === 18 && e.isBossEnemy) {
      // Count alive summons
      const _aliveCount = countSummonsFor(gs._enemyFrameIndex, e.summonerId);
      e.summonerCount = _aliveCount;
      e.summonerInvuln = _aliveCount > 0;
      if (_aliveCount === 0 && (e.summonerVulnTimer || 0) > 0) e.summonerVulnTimer--;
      if (_aliveCount === 0 && (e.summonerVulnTimer || 0) <= 0) {
        // Portal VFX during first-summon windup (every 25 frames while timer counts down)
        if (e.summonerFirstSummon && (e.summonerTimer || 0) > 0) {
          if (frame % 25 === 0) {
            addParticles(gs, e.x, e.y, "#CC88FF", 6);
            const _pa = cosmeticRandom() * Math.PI * 2, _pr = 60 + cosmeticRandom() * 40;
            addParticles(gs, e.x + Math.cos(_pa) * _pr, e.y + Math.sin(_pa) * _pr, "#8844FF", 4);
          }
        }
        // Summon timer
        e.summonerTimer = (e.summonerTimer || 0) - 1;
        if (e.summonerTimer <= 0 && _aliveCount < e.summonerMaxCount) {
          e.summonerTimer = 280;
          e.summonerFirstSummon = false;
          const _sCount = Math.min(3, e.summonerMaxCount - _aliveCount);
          const summonRng = getRunRng(gs, "hazards");
          for (let _si = 0; _si < _sCount; _si++) {
            const _sa = summonRng() * Math.PI * 2, _sd = 80 + summonRng() * 60;
            spawnEnemy(gs);
            const _ne = gs.enemies[gs.enemies.length - 1];
            _ne.x = e.x + Math.cos(_sa) * _sd; _ne.y = e.y + Math.sin(_sa) * _sd;
            _ne.summonedBy = e.summonerId;
            _ne.eliteType = ["armored","fast","explosive"][Math.floor(summonRng()*3)];
            if (_ne.eliteType === "fast") { _ne.speed *= 2; _ne.size *= 0.75; }
            else if (_ne.eliteType === "armored") { _ne.dmgMult = 0.45; _ne.health *= 1.5; _ne.maxHealth = _ne.health; }
          }
          addText(gs, e.x, e.y - 70, "🌀 SUMMONING!", "#8844FF", true);
          addParticles(gs, e.x, e.y, "#8844FF", 25);
          e.summonerVulnTimer = 360; // re-enters invuln after summons die
        }
      }
    }
    // ── The Algorithm (20): viral surge + 3-shot spread ──
    if (e.typeIndex === 20 && e.isBossEnemy) {
      e.viralSurgeTimer = (e.viralSurgeTimer || 0) - 1;
      if (e.viralSurgeActive > 0) {
        e.viralSurgeActive--;
        gs.algorithmSurge = e.viralSurgeActive > 0;
        if (e.viralSurgeActive === 0) {
          gs.algorithmSurge = false;
          addText(gs, e.x, e.y - 70, "📊 SURGE ENDED", "#1DA1F2");
        }
      } else if (e.viralSurgeTimer <= 0) {
        e.viralSurgeTimer = 480;
        e.viralSurgeActive = 180; // 3 seconds of viral surge
        gs.algorithmSurge = true;
        gs.screenShake = 10;
        addText(gs, e.x, e.y - 80, "📊 GOING VIRAL!", "#1DA1F2", true);
        addParticles(gs, e.x, e.y, "#1DA1F2", 25);
      }
      // 3-shot spread every projRate instead of 1 shot
      if (e.ranged && e.shootTimer >= e.projRate) {
        e.shootTimer = 0;
        const _pa = Math.atan2(t.y - e.y, t.x - e.x);
        for (let _bi = -1; _bi <= 1; _bi++) {
          const _ang = _pa + _bi * 0.32;
          gs.enemyBullets.push({ x: e.x, y: e.y, vx: Math.cos(_ang) * e.projSpeed, vy: Math.sin(_ang) * e.projSpeed, life: 100, size: 5, color: "#1DA1F2", damage: 8, sourceType: e.typeIndex, sourceName: `${ENEMY_TYPES[e.typeIndex]?.name || "Enemy"} spread` });
        }
      }
    }
    // ── The Developer (21): debug mode, hotfix, merge conflict ──
    if (e.typeIndex === 21 && e.isBossEnemy) {
      // Debug Mode: temporarily removes a random obstacle
      if (e.hasDebugMode) {
        e.debugModeTimer = (e.debugModeTimer || 0) + 1;
        if (e.debugModeTimer >= e.debugModeCooldown && gs.obstacles && gs.obstacles.length > 0) {
          e.debugModeTimer = 0;
          const _ob = gs.obstacles[Math.floor(getRunRng(gs, "hazards")() * gs.obstacles.length)];
          if (_ob && (_ob._devSaved === undefined)) {
            const _savedW = _ob.w; const _savedH = _ob.h;
            _ob._devSaved = true;
            addText(gs, e.x, e.y - 60, "🐛 DEBUGGING ARENA...", "#00FF88");
            _ob.w = 0; _ob.h = 0;
            setTimeout(() => { if (_ob) { _ob.w = _savedW; _ob.h = _savedH; _ob._devSaved = undefined; } }, 4000);
          }
        }
      }
      // Hotfix: one-time self-heal to 75% when below 50% HP
      if (e.hasHotfix && !e.hotfixUsed && e.health < e.maxHealth * 0.5) {
        e.hotfixUsed = true;
        e.health = e.maxHealth * 0.75;
        addText(gs, e.x, e.y - 70, "🩹 HOTFIX DEPLOYED!", "#00FF88", true);
        addParticles(gs, e.x, e.y, "#00FF88", 20);
      }
      // Merge Conflict: fires 6 bullets in 3 directions simultaneously
      if (e.hasMergeConflict) {
        e.mergeConflictTimer = (e.mergeConflictTimer || 0) + 1;
        if (e.mergeConflictTimer >= e.mergeConflictCooldown) {
          e.mergeConflictTimer = 0;
          addText(gs, e.x, e.y - 55, "⚠️ MERGE CONFLICT!", "#FF8800");
          for (let _set = 0; _set < 3; _set++) {
            const _baseAng = (_set / 3) * Math.PI * 2;
            for (let _spread = -1; _spread <= 1; _spread++) {
              const _ang = _baseAng + _spread * 0.3;
              gs.enemyBullets.push({ x: e.x, y: e.y, vx: Math.cos(_ang) * 5, vy: Math.sin(_ang) * 5, damage: 12, life: 80, size: 5, color: "#FF8800", sourceType: e.typeIndex, sourceName: `${ENEMY_TYPES[e.typeIndex]?.name || "Boss"} merge conflict` });
            }
          }
        }
      }
    }
    // ── Universal boss phase 2 at 50% HP ─────────────────────────────────
    if (triggerBossPhaseTwoTransition({ enemy: e, gs, addText, addParticles, soundPhaseTwo: soundBossPhase2 })) vibrate("bossPhase2");
    // ── Kamikaze (ti=12) ──
    if (e.typeIndex === 12 && dashActiveFrames <= 0) {
      const kd = Math.hypot(p.x - e.x, p.y - e.y);
      if (kd < e.size / 2 + 38) {
        addParticles(gs, e.x, e.y, "#FF4400", 25); addParticles(gs, e.x, e.y, "#FFD700", 10);
        addText(gs, e.x, e.y, "💥 BOOM!", "#FF4400", true); gs.screenShake = 12;
        gs.dyingEnemies = gs.dyingEnemies || [];
        if (gs.dyingEnemies.length < MAX_DYING_ANIM)
          gs.dyingEnemies.push({ x: e.x, y: e.y, emoji: e.emoji, color: e.color, size: e.size, typeIndex: e.typeIndex, isZombie: e.isZombie, zombieVariant: e.zombieVariant, isBossEnemy: e.isBossEnemy, life: 22, maxLife: 22 });
        if (p.invincible <= 0) {
          applyObservedPlayerDamage(gs, { damage: (gs.glassjaw ? Math.round(35 * (gs.glassjawMult || 2)) : 35) * (gs._treeArmorMult || 1), frame: frame, kind: "contact", sourceType: e.typeIndex, sourceName: ENEMY_TYPES[e.typeIndex]?.name || "Kamikaze" }); p.invincible = 40; gs.damageFlash = 12;
          gs.damageThisWave = (gs.damageThisWave || 0) + 1;
          setHealth(Math.max(0, p.health));
          addText(gs, p.x, p.y - 30, "-35 HP", "#FF0000");
          rumbleGamepad(0.5, 0.7, 200);
          if (p.health <= 0) handlePlayerDeath(gs);
        }
        retireEnemyWithoutDefeat(e, "kamikaze-self-destruct");
      }
    }
    // ── Enemy-wall collision (push-out, same logic as player) ──
    (gs.obstacles || []).forEach(ob => {
      const ecx = Math.max(ob.x, Math.min(e.x, ob.x + ob.w));
      const ecy = Math.max(ob.y, Math.min(e.y, ob.y + ob.h));
      const ed = Math.hypot(e.x - ecx, e.y - ecy);
      const er = e.size / 2 + 2;
      if (ed < er) {
        // When ed===0 the enemy is dead-center in a wall; use a random ejection angle to avoid oscillation
        const ea = ed > 0 ? Math.atan2(e.y - ecy, e.x - ecx) : getRunRng(gs, "hazards")() * Math.PI * 2;
        e.x = ecx + Math.cos(ea) * (er + 1);
        e.y = ecy + Math.sin(ea) * (er + 1);
        e.x = Math.max(e.size / 2, Math.min(W - e.size / 2, e.x));
        e.y = Math.max(e.size / 2, Math.min(H - e.size / 2, e.y));
      }
    });
    if (dashActiveFrames <= 0) {
      const d2 = Math.hypot(p.x - e.x, p.y - e.y);
      if (d2 < e.size / 2 + 15 && p.invincible <= 0) {
        let dmg = 10 + e.typeIndex * 5;
        if (gs.glassjaw) dmg *= (gs.glassjawMult || 2);
        dmg *= (gs._treeArmorMult || 1);
        applyObservedPlayerDamage(gs, { damage: dmg, frame: frame, kind: e.isBossEnemy ? "boss" : "contact", sourceType: e.typeIndex, sourceName: ENEMY_TYPES[e.typeIndex]?.name || e.name || "Enemy contact" }); p.invincible = 30; gs.screenShake = 8; gs.damageFlash = 10;
        gs.damageThisWave = (gs.damageThisWave || 0) + 1;
        setHealth(Math.max(0, p.health));
        addText(gs, p.x, p.y - 30, "-" + Math.floor(dmg) + " HP", "#FF0000");
        rumbleGamepad(0.35, 0.5, 120);
        if (p.health <= 0) handlePlayerDeath(gs);
      }
    }
  });

  // ── Hazard tile effects ──────────────────────────────────────────────────
  gs._rubbleSlowed = false;
  for (const hz of (gs.hazards || [])) {
    hz.pulseTimer = ((hz.pulseTimer || 0) + 1) % 120;
    const _hDist = Math.hypot(p.x - hz.x, p.y - hz.y);
    if (_hDist < hz.radius) {
      if (hz.type === "acid") {
        // Acid pool: 0.5 damage per frame (~30/sec)
        const _acidDmg = 0.5 * (gs._treeArmorMult || 1) * (gs.glassjaw ? (gs.glassjawMult || 2) : 1);
        applyObservedPlayerDamage(gs, { damage: _acidDmg, frame: frame, kind: "hazard", sourceName: "Acid pool" });
        if (frame % 30 === 0) {
          addText(gs, p.x, p.y - 30, `-${Math.round(_acidDmg * 30)} ACID`, "#44FF44");
        }
        setHealth(Math.floor(p.health));
        if (p.health <= 0) handlePlayerDeath(gs);
      } else if (hz.type === "electro") {
        // Electro grid: zap for 15 damage every 90 frames
        if (hz.pulseTimer === 0) {
          const _elDmg = 15 * (gs.glassjaw ? (gs.glassjawMult || 2) : 1);
          applyObservedPlayerDamage(gs, { damage: _elDmg, frame: frame, kind: "hazard", sourceName: "Electro grid" });
          setHealth(Math.floor(p.health));
          addText(gs, p.x, p.y - 30, `ZAP! -${Math.round(_elDmg)}`, "#FFFF00", true);
          gs.screenShake = Math.max(gs.screenShake, 4);
          if (p.health <= 0) handlePlayerDeath(gs);
        }
      } else if (hz.type === "rubble") {
        // Rubble pile: slow player movement by 40%
        gs._rubbleSlowed = true;
      }
    }
  }

  return { ok: true };
}
