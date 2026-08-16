import { CRIT_CHANCE, CRIT_MULT, HITMARKERS, WEAPONS } from "../constants.js";
import {
  bulletEnemyCollision,
  computeBulletDamage,
  computeJuggernautShieldDamage,
  findLightningChainTarget,
  isPrecisionHit,
  resolveEnemyProjectilePlayerHit,
  resolveGrenadeEnemyDamage,
  resolveObstacleBounce,
  resolvePierce,
  rollCrit,
} from "./combatResolution.js";
import { applyEnemyDamage } from "./enemyDefeatLifecycle.js";
import { applyObservedPlayerDamage } from "./damageSequence.js";
import { stepAndCompactInPlace } from "./transientLifecycle.js";
import { addParticles, addText } from "./transientPresentation.js";
import { stampArenaDecal } from "./backgroundLayer.js";
import { cosmeticRandom, getRunRng } from "./runRng.js";
import { getMusicBPM, soundHitAt, soundPrecisionClick, soundPrecisionLock } from "../sounds.js";
import { rumbleGamepad, vibrate } from "../utils/haptics.js";
import { trackRhythmMasteryHit } from "../storage.js";

function finite(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

/**
 * Advance every projectile-owned part of one deterministic combat frame.
 *
 * This is deliberately outside App's orchestration shell: the same receipt can
 * later run inside an authoritative Operation/co-op simulation without copying
 * browser state or React setters into the combat rules.
 */
export function stepProjectileFrame({
  gs,
  player,
  world,
  weaponIndex,
  frame,
  dashActive = false,
  perkMods = {},
  stats,
  combo,
  lastHitSoundRef,
  setHealth = () => {},
  handlePlayerDeath = () => {},
  drainEnemyDefeats = () => 0,
  addXp = () => {},
  checkAchievements = () => {},
  checkDailyMissions = () => {},
  achievementCheckRef = null,
} = {}) {
  if (!gs || !player || !world || !stats || !combo) return { ok: false, reason: "missing-runtime" };
  const W = finite(world.W, 1280);
  const H = finite(world.H, 720);
  const p = player;
  const currentFrame = Math.max(0, Math.trunc(finite(frame)));

  gs.bullets = stepAndCompactInPlace(gs.bullets || [], (bullet) => {
    if (bullet.boomerang) {
      if (!bullet.returning) {
        const rotation = 0.055;
        const nextVx = bullet.vx * Math.cos(rotation) - bullet.vy * Math.sin(rotation);
        const nextVy = bullet.vx * Math.sin(rotation) + bullet.vy * Math.cos(rotation);
        bullet.vx = nextVx;
        bullet.vy = nextVy;
        if (bullet.life <= bullet.outboundLife) bullet.returning = true;
      } else {
        const dx = p.x - bullet.x;
        const dy = p.y - bullet.y;
        const distance = Math.hypot(dx, dy);
        if (distance < 24) return false;
        const speed = Math.hypot(bullet.vx, bullet.vy);
        bullet.vx = (dx / distance) * speed;
        bullet.vy = (dy / distance) * speed;
      }
    }
    bullet.x += bullet.vx;
    bullet.y += bullet.vy;
    bullet.life--;
    if (bullet.trail && currentFrame % 2 === 0) addParticles(gs, bullet.x, bullet.y, bullet.color, 1);
    for (const obstacle of gs.obstacles || []) {
      const bounce = resolveObstacleBounce(bullet, obstacle);
      if (bounce.bounced) {
        Object.assign(bullet, {
          x: bounce.x,
          y: bounce.y,
          vx: bounce.vx,
          vy: bounce.vy,
          bouncesLeft: bounce.bouncesLeft,
          life: bounce.life,
        });
        addParticles(gs, bullet.x, bullet.y, "#FFFFFF", 4);
        gs.screenShake = Math.max(gs.screenShake, 1);
        break;
      }
      if (bounce.consumed) {
        addParticles(gs, bullet.x, bullet.y, bullet.color, 3);
        return false;
      }
    }
    return bullet.life > 0 && bullet.x > -10 && bullet.x < W + 10 && bullet.y > -10 && bullet.y < H + 10;
  });

  gs.enemyBullets = stepAndCompactInPlace(gs.enemyBullets || [], (projectile) => {
    const dilation = (gs.timeDilationTimer || 0) > 0 ? 0.2 : 1;
    projectile.x += projectile.vx * dilation;
    projectile.y += projectile.vy * dilation;
    projectile.life--;
    const hitWall = (gs.obstacles || []).some((obstacle) =>
      projectile.x >= obstacle.x
      && projectile.x <= obstacle.x + obstacle.w
      && projectile.y >= obstacle.y
      && projectile.y <= obstacle.y + obstacle.h);
    return !hitWall && projectile.life > 0
      && projectile.x > -10 && projectile.x < W + 10
      && projectile.y > -10 && projectile.y < H + 10;
  });

  if (!dashActive) {
    gs.enemyBullets.forEach((projectile) => {
      const hit = resolveEnemyProjectilePlayerHit({
        projectile,
        player: p,
        dashActive,
        glassjaw: Boolean(gs.glassjaw),
        glassjawMult: gs.glassjawMult || 2,
        armorMult: gs._treeArmorMult || 1,
      });
      if (!hit.hit) return;
      projectile.life = hit.projectileLife;
      applyObservedPlayerDamage(gs, {
        healthAfter: hit.health,
        frame: currentFrame,
        kind: "projectile",
        sourceType: projectile.sourceType,
        sourceName: projectile.sourceName || "Enemy projectile",
      });
      p.invincible = hit.invincibleFrames;
      gs.screenShake = hit.screenShake;
      gs.damageFlash = hit.damageFlash;
      const knockback = Math.hypot(projectile.vx, projectile.vy) || 1;
      gs.shakeDirX = (projectile.vx / knockback) * 0.8;
      gs.shakeDirY = (projectile.vy / knockback) * 0.8;
      gs.damageThisWave = (gs.damageThisWave || 0) + 1;
      setHealth(Math.max(0, p.health));
      addText(gs, p.x, p.y - 30, "-" + Math.floor(hit.damage), "#FF4444");
      rumbleGamepad(0.3, 0.45, 100);
      if (hit.dead) handlePlayerDeath(gs);
    });
  }

  gs.grenades = stepAndCompactInPlace(gs.grenades || [], (grenade) => {
    grenade.x += grenade.vx;
    grenade.y += grenade.vy;
    grenade.vx *= 0.96;
    grenade.vy *= 0.96;
    grenade.life--;
    if (grenade.life > 0) return true;
    addParticles(gs, grenade.x, grenade.y, "#FF4500", 20);
    addParticles(gs, grenade.x, grenade.y, "#FFD700", 12, undefined, "spark");
    addParticles(gs, grenade.x, grenade.y, "#777777", 8, undefined, "smoke");
    addParticles(gs, grenade.x, grenade.y, "#8A6A3A", 6, undefined, "debris");
    addText(gs, grenade.x, grenade.y, "BOOM!", "#FF4500", true);
    gs.screenShake = 15;
    gs.explosionFlash = { x: grenade.x, y: grenade.y, life: 3 };
    stampArenaDecal(gs, { kind: "scorch", x: grenade.x, y: grenade.y, size: 30, alpha: 0.4 });
    gs.enemies.forEach((enemy) => {
      const blast = resolveGrenadeEnemyDamage({
        grenade,
        enemy,
        radius: 130 * (gs.settGrenadeRadMult || 1),
        damageMult: perkMods.grenadeDamageMult || 1,
      });
      if (!blast.hit) return;
      const result = applyEnemyDamage(enemy, blast.damage, { source: "grenade", weaponName: "GRENADE" });
      enemy.hitFlash = 10;
      gs.totalDamage += result.applied;
    });
    return false;
  });
  drainEnemyDefeats(gs);

  if (gs.pendingBeam) {
    const { ox, oy, cos, sin, maxT, weaponIdx: beamWeaponIndex } = gs.pendingBeam;
    gs.pendingBeam = null;
    const weapon = WEAPONS[beamWeaponIndex];
    const damageMultiplier = (perkMods.damageMult || 1) * (1 + (gs.weaponUpgrades?.[beamWeaponIndex] || 0) * 0.25);
    const comboMultiplier = 1 + Math.max(0, combo.count) * 0.1;
    gs.enemies.forEach((enemy) => {
      if (enemy.health <= 0) return;
      const dx = enemy.x - ox;
      const dy = enemy.y - oy;
      const projection = dx * cos + dy * sin;
      const perpendicular = Math.abs(dx * sin - dy * cos);
      if (!(projection > 0 && projection < maxT && perpendicular < enemy.size / 2 + 7)) return;
      if (enemy.typeIndex === 18 && enemy.summonerInvuln) {
        addParticles(gs, enemy.x, enemy.y, "#8844FF", 3);
        return;
      }
      const isCrit = getRunRng(gs, "combat")() < CRIT_CHANCE + (perkMods.critBonus || 0) + (gs.critBonus || 0);
      const rageMultiplier = (gs.rageTimer || 0) > 0 ? 1.75 : 1;
      const shieldMultiplier = enemy.typeIndex === 17 && (enemy.jugShield || 0) > 0 ? 0.15 : 1;
      const damage = weapon.damage * damageMultiplier * comboMultiplier
        * (isCrit ? CRIT_MULT + (gs.critMultBonus || 0) : 1)
        * (enemy.dmgMult || 1) * rageMultiplier * shieldMultiplier;
      const result = applyEnemyDamage(enemy, damage, {
        source: "rail",
        weaponIdx: beamWeaponIndex,
        weaponName: weapon.name,
      });
      enemy.hitFlash = isCrit ? 15 : 8;
      gs.totalDamage += result.applied;
      if (perkMods.lifesteal) {
        const vampireMultiplier = perkMods.comboVampireMult && combo.count > 0 ? 2 : 1;
        p.health = Math.min(p.maxHealth, p.health + damage * perkMods.lifesteal * vampireMultiplier);
        setHealth(Math.floor(p.health));
      }
      if (isCrit) {
        stats.crits++;
        if (perkMods.critGrantsXp) addXp(10);
      }
      addParticles(gs, enemy.x, enemy.y, isCrit ? "#FFD700" : enemy.color, isCrit ? 10 : 5);
      addText(gs, enemy.x, enemy.y - enemy.size / 2 - 8,
        isCrit ? "💥 CRIT!" : HITMARKERS[Math.floor(cosmeticRandom() * HITMARKERS.length)],
        isCrit ? "#FFD700" : "#FFF");
    });
    drainEnemyDefeats(gs);
    gs.screenShake = Math.max(gs.screenShake, 10);
  }

  gs.bullets.forEach((bullet) => {
    if (bullet.life <= 0) return;
    gs.enemies.forEach((enemy) => {
      if (enemy.health <= 0 || !bulletEnemyCollision(bullet, enemy).hit) return;
      if (!bullet.statHit) {
        bullet.statHit = true;
        stats.totalHits = (stats.totalHits || 0) + 1;
      }
      if (enemy.shieldPulseActive) {
        addParticles(gs, bullet.x, bullet.y, "#00BFFF", 4);
        bullet.life = 0;
        return;
      }
      const { isCrit } = rollCrit({
        baseCrit: CRIT_CHANCE,
        perkCrit: perkMods.critBonus || 0,
        runCrit: gs.critBonus || 0,
        rng: getRunRng(gs, "combat"),
      });
      if (enemy.typeIndex === 18 && enemy.summonerInvuln) {
        addParticles(gs, bullet.x, bullet.y, "#8844FF", 3);
        bullet.life = 0;
        return;
      }
      const { damage } = computeBulletDamage({
        bullet,
        enemy,
        player: p,
        comboCount: combo.count,
        critMult: CRIT_MULT,
        critMultBonus: gs.critMultBonus || 0,
        isCrit,
        lastResort: Boolean(perkMods.lastResort),
        rageActive: (gs.rageTimer || 0) > 0,
      });
      if (enemy.typeIndex === 17 && (enemy.jugShield || 0) > 0) {
        const rawDamage = computeJuggernautShieldDamage({
          bulletDamage: bullet.damage,
          comboCount: combo.count,
          isCrit,
          critMult: CRIT_MULT,
        });
        enemy.jugShield = Math.max(0, enemy.jugShield - rawDamage);
        if (enemy.jugShield <= 0) {
          enemy.jugShieldRegenDelay = 240;
          addText(gs, enemy.x, enemy.y - 40, "🛡 SHIELD BROKEN!", "#FF6600");
          addText(gs, W / 2, H / 3, "🦏 SHIELD SHATTERED!", "#FF6600", true);
          gs.screenShake = Math.max(gs.screenShake, 14);
          addParticles(gs, enemy.x, enemy.y, "#5599FF", 20);
        }
      }
      const result = applyEnemyDamage(enemy, damage, {
        source: "projectile",
        weaponIdx: bullet.wpnIdx ?? weaponIndex,
        weaponName: WEAPONS[bullet.wpnIdx ?? weaponIndex]?.name || "PROJECTILE",
        beatEligible: true,
      });
      enemy.hitFlash = isCrit ? 15 : 8;
      gs.totalDamage += result.applied;
      if (gs.chainLightning && getRunRng(gs, "combat")() < 0.2) {
        const target = findLightningChainTarget(gs.enemies, enemy, { range: 200 });
        if (target) {
          const arcDamage = applyEnemyDamage(target, damage * 0.5, {
            source: "chain-lightning",
            weaponIdx: bullet.wpnIdx ?? weaponIndex,
            weaponName: "CHAIN LIGHTNING",
            beatEligible: true,
          });
          target.hitFlash = 8;
          gs.totalDamage += arcDamage.applied;
          gs.lightningArcs ||= [];
          gs.lightningArcs.push({ x1: enemy.x, y1: enemy.y, x2: target.x, y2: target.y, life: 8, maxLife: 8 });
        }
      }
      if (perkMods.lifesteal) {
        const vampireMultiplier = perkMods.comboVampireMult && combo.count > 0 ? 2 : 1;
        p.health = Math.min(p.maxHealth, p.health + damage * perkMods.lifesteal * vampireMultiplier);
        setHealth(Math.floor(p.health));
      }
      if (perkMods.piercedLifesteal && bullet.pierceLeft > 0) {
        p.health = Math.min(p.maxHealth, p.health + damage * perkMods.piercedLifesteal);
        setHealth(Math.floor(p.health));
      }
      if (isCrit) {
        stats.crits++;
        if (perkMods.critGrantsXp) addXp(10);
      }
      const now = performance.now();
      if (!lastHitSoundRef || now - lastHitSoundRef.current > 50) {
        soundHitAt(isCrit, enemy.x, W);
        if (lastHitSoundRef) lastHitSoundRef.current = now;
        rumbleGamepad(isCrit ? 0.25 : 0.05, isCrit ? 0.35 : 0.1, isCrit ? 80 : 40);
        vibrate(isCrit ? "crit" : "hit");
      }
      addParticles(gs, bullet.x, bullet.y, isCrit ? "#FFD700" : enemy.color, isCrit ? 10 : 5, undefined, "spark");
      gs.screenShake = Math.max(gs.screenShake, isCrit ? 6 : 2);
      addText(gs,
        enemy.x + (cosmeticRandom() - 0.5) * 20,
        enemy.y - enemy.size / 2 - cosmeticRandom() * 10,
        isCrit ? "💥 CRIT!" : HITMARKERS[Math.floor(cosmeticRandom() * HITMARKERS.length)],
        isCrit ? "#FFD700" : "#FFF");

      if (!enemy.isBossEnemy && isPrecisionHit(bullet, enemy)) {
        gs.precisionStreak = (gs.precisionStreak || 0) + 1;
        stats.bestPrecisionStreak = Math.max(stats.bestPrecisionStreak || 0, gs.precisionStreak);
        if (gs.precisionStreak > (gs._precisionPeakStreak || 0)) {
          gs._precisionPeakStreak = gs.precisionStreak;
          gs._precisionPeakFrame = currentFrame;
        }
        soundPrecisionClick(gs.precisionStreak);
        if (gs.precisionStreak === 5) soundPrecisionLock();
        gs.coins = (gs.coins || 0) + 1;
        if (gs.precisionStreak === 3) {
          gs.coins += 2;
          addText(gs, enemy.x, enemy.y - enemy.size - 10, "🎯 PRECISION BURST! +3💩", "#FF88FF", true);
          addParticles(gs, enemy.x, enemy.y, "#FF88FF", 8);
        } else if (gs.precisionStreak > 3) {
          addText(gs, enemy.x, enemy.y - enemy.size - 10, `🎯 ×${gs.precisionStreak} +1💩`, "#CC88FF");
        } else {
          addText(gs, enemy.x, enemy.y - enemy.size - 10, "🎯 +1💩", "#FFAAFF");
        }
        const bpm = getMusicBPM();
        const framesPerBeat = Math.round(60 / bpm * 60);
        const beatPhase = currentFrame % framesPerBeat;
        const beatWindow = 8 + Math.min(4, Math.floor(gs.precisionStreak / 5));
        if (beatPhase < beatWindow) {
          gs.coins += 2;
          addText(gs, enemy.x, enemy.y - enemy.size - 22, "🎵🎯 BEAT PRECISION! +2💩", "#00FFEE");
          addParticles(gs, enemy.x, enemy.y, "#00FFEE", 5);
          const total = trackRhythmMasteryHit();
          if ([100, 500, 1000, 2500, 5000].includes(total)) {
            addText(gs, enemy.x, enemy.y - enemy.size - 40, `🎵 RHYTHM MASTER ×${total}!`, "#FFD700", true);
          }
        }
        if (gs.precisionStreak >= 10 && !(gs._flowStateCooldown > 0)) {
          gs.timeDilationTimer = Math.max(gs.timeDilationTimer || 0, 90);
          gs._flowStateCooldown = 300;
          gs._flowStateFiredCount = (gs._flowStateFiredCount || 0) + 1;
          addText(gs, enemy.x, enemy.y - enemy.size - 30, "⚡ FLOW STATE", "#00FFEE", true);
          addParticles(gs, enemy.x, enemy.y, "#00FFEE", 12);
        }
      } else if (!enemy.isBossEnemy) {
        gs.precisionStreak = 0;
      }
      const pierce = resolvePierce({ pierceLeft: bullet.pierceLeft || 0 });
      bullet.pierceLeft = pierce.nextPierceLeft;
      if (pierce.consumeBullet) bullet.life = 0;
    });
  });
  drainEnemyDefeats(gs);
  if (achievementCheckRef?.current) {
    checkAchievements(gs);
    checkDailyMissions(gs);
    achievementCheckRef.current = false;
  }
  return {
    ok: true,
    bullets: gs.bullets.length,
    enemyBullets: gs.enemyBullets.length,
    grenades: gs.grenades.length,
  };
}
