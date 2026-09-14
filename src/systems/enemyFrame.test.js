import { afterEach, describe, expect, it, vi } from "vitest";
import { stepEnemyFrame } from "./enemyFrame.js";

vi.mock("../audio/soundFacade.js", () => ({ soundBossPhase2: vi.fn() }));
vi.mock("../utils/haptics.js", () => ({ rumbleGamepad: vi.fn(), vibrate: vi.fn() }));

function arena(overrides = {}) {
  const player = { x: 1000, y: 100, health: 100, maxHealth: 100, invincible: 0 };
  const enemy = {
    id: "boss-1", x: 100, y: 100, typeIndex: 16, isBossEnemy: true,
    health: 100, maxHealth: 100, speed: 10, size: 40, wobble: 0,
    hitFlash: 0, ranged: false, shootTimer: 0, projRate: 100,
    projSpeed: 4, color: "#888888", ...overrides,
  };
  const gs = {
    player, enemies: [enemy], enemyBullets: [], bullets: [], particles: [],
    floatingTexts: [], pickups: [], obstacles: [], hazards: [], currentWave: 5,
    screenShake: 0, _ffTimer: -10000, _ffPx: player.x, _ffPy: player.y,
  };
  let frame = 0;
  function step() {
    // Hold the steering geometry fixed so displacement isolates speed.
    enemy.x = 100; enemy.y = 100; enemy.wobble = 0;
    stepEnemyFrame({ gs, player, world: { W: 1280, H: 720 }, frame: ++frame });
    return enemy.x - 100 - Math.sin(0.1) * 0.5;
  }
  return { enemy, gs, step };
}

afterEach(() => vi.useRealTimers());

describe("boss frame behavior", () => {
  it("runs Speed Surge for 120 simulation frames and does not expire while paused", () => {
    vi.useFakeTimers();
    const { enemy, step } = arena({ hasSpeedSurge: true, speedSurgeTimer: 298, speedSurgeCooldown: 300 });
    expect(step()).toBeCloseTo(10);
    expect(step()).toBeCloseTo(20);
    vi.advanceTimersByTime(10000);
    for (let i = 0; i < 119; i++) expect(step()).toBeCloseTo(20);
    expect(step()).toBeCloseTo(10);
    expect(enemy.speed).toBe(10);
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each([
    [{ hasEnrage: true }, 1.8],
    [{ hasEnrageThreshold: true }, 1.4],
    [{ hasEnrage: true, hasEnrageThreshold: true }, 1.8 * 1.4],
  ])("preserves permanent enrages through surge expiry: %j", (flags, multiplier) => {
    const { enemy, step } = arena({
      ...flags, hasSpeedSurge: true, speedSurgeTimer: 299, speedSurgeCooldown: 300,
      health: 30, bossPhase2: true,
    });
    step();
    expect(enemy.speed).toBeCloseTo(10 * multiplier);
    for (let i = 0; i < 119; i++) expect(step()).toBeCloseTo(20 * multiplier);
    expect(step()).toBeCloseTo(10 * multiplier);
    expect(step()).toBeCloseTo(10 * multiplier);
  });

  it("preserves phase-two speed through surge expiry", () => {
    const { enemy, step } = arena({
      hasSpeedSurge: true, speedSurgeTimer: 299, speedSurgeCooldown: 300, health: 45,
    });
    step();
    expect(enemy.bossPhase2).toBe(true);
    for (let i = 0; i < 119; i++) expect(step()).toBeCloseTo(27);
    expect(step()).toBeCloseTo(13.5);
  });

  it("never restores stale base speed on bosses without Speed Surge", () => {
    const { step } = arena({ hasEnrageThreshold: true, health: 30, bossPhase2: true });
    step();
    expect(step()).toBeCloseTo(14);
    expect(step()).toBeCloseTo(14);
  });

  it("fires one Algorithm three-shot volley at the shared ranged cadence", () => {
    const { enemy, gs, step } = arena({
      typeIndex: 20, ranged: true, shootTimer: 99, viralSurgeTimer: 420,
    });
    step();
    expect(gs.enemyBullets).toHaveLength(3);
    expect(gs.enemyBullets.map((bullet) => bullet.damage)).toEqual([8, 8, 8]);
    expect(gs.enemyBullets.map((bullet) => bullet.sourceId)).toEqual([enemy.id, enemy.id, enemy.id]);
    const angles = gs.enemyBullets.map((bullet) => Math.atan2(bullet.vy, bullet.vx));
    expect(angles[1] - angles[0]).toBeCloseTo(0.32);
    expect(angles[2] - angles[1]).toBeCloseTo(0.32);
    for (let i = 0; i < 99; i++) step();
    expect(gs.enemyBullets).toHaveLength(3);
    step();
    expect(gs.enemyBullets).toHaveLength(6);
  });

  it("keeps ordinary single shots and Karen's five-shot phase-two volley", () => {
    const ordinary = arena({ isBossEnemy: false, typeIndex: 0, ranged: true, shootTimer: 99 });
    ordinary.step();
    expect(ordinary.gs.enemyBullets).toHaveLength(1);
    const karen = arena({ typeIndex: 4, ranged: true, shootTimer: 99, health: 45, bossPhase2: true, chargeTimer: 0 });
    karen.step();
    expect(karen.gs.enemyBullets).toHaveLength(5);
  });
  it("stagger-locks overdue teleport, bullet ring and ground slam within one frame", () => {
    const { enemy, gs, step } = arena({
      typeIndex: 4, chargeTimer: 0, hasTeleport: true, teleportTimer: 479,
      hasBulletRing: true, bulletRingTimer: 359,
      hasGroundSlam: true, groundSlamTimer: 419,
    });
    step();
    expect(enemy.teleportTimer).toBe(0);
    expect(enemy.sharedAbilityCooldown).toBe(90);
    expect(gs.enemyBullets).toHaveLength(0);
    expect(enemy.groundSlamActive).not.toBe(true);
    for (let i = 0; i < 89; i++) step();
    expect(gs.enemyBullets).toHaveLength(0);
    step();
    expect(gs.enemyBullets).toHaveLength(8);
    expect(enemy.sharedAbilityCooldown).toBe(120);
    expect(enemy.groundSlamActive).not.toBe(true);
    for (let i = 0; i < 119; i++) step();
    expect(enemy.groundSlamActive).not.toBe(true);
    step();
    expect(enemy.groundSlamActive).toBe(true);
    expect(enemy.sharedAbilityCooldown).toBe(120);
  });
  it.each([
    [{ hasBulletRing: true, bulletRingTimer: 359 }, 8, 4.5],
    [{ hasBulletSpray: true, bulletSprayTimer: 359, bulletSprayCooldown: 360 }, 8, 4],
    [{ typeIndex: 21, hasMergeConflict: true, mergeConflictTimer: 359, mergeConflictCooldown: 360 }, 9, 5],
  ])("scales boss special projectile speed without changing baseline: %j", (ability, count, speed) => {
    for (const multiplier of [1, 2]) {
      const { gs, step } = arena(ability);
      gs.mutEnemyProjSpeed = multiplier;
      step();
      expect(gs.enemyBullets).toHaveLength(count);
      for (const bullet of gs.enemyBullets) expect(Math.hypot(bullet.vx, bullet.vy)).toBeCloseTo(speed * multiplier);
    }
  });
});
