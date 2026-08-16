import { describe, expect, it, vi } from "vitest";
import { stepProjectileFrame } from "./projectileFrame.js";

function runtime(overrides = {}) {
  const gs = {
    bullets: [],
    enemyBullets: [],
    grenades: [],
    enemies: [],
    obstacles: [],
    totalDamage: 0,
    screenShake: 0,
    coins: 0,
    weaponUpgrades: [],
    runSeed: 17,
    currentWave: 1,
    player: { x: 50, y: 50, health: 100, maxHealth: 100 },
    ...overrides,
  };
  return {
    gs,
    player: gs.player,
    world: { W: 200, H: 120 },
    weaponIndex: 0,
    frame: 1,
    perkMods: {},
    stats: { crits: 0, totalHits: 0, bestPrecisionStreak: 0 },
    combo: { count: 0 },
    lastHitSoundRef: { current: 0 },
    setHealth: vi.fn(),
    handlePlayerDeath: vi.fn(),
    drainEnemyDefeats: vi.fn(),
    addXp: vi.fn(),
    checkAchievements: vi.fn(),
    checkDailyMissions: vi.fn(),
    achievementCheckRef: { current: false },
  };
}

describe("stepProjectileFrame", () => {
  it("advances and compacts player and enemy projectiles", () => {
    const ctx = runtime({
      bullets: [{ x: 10, y: 10, vx: 2, vy: 0, life: 2, color: "#fff" }],
      enemyBullets: [{ x: 190, y: 10, vx: 20, vy: 0, life: 2 }],
    });
    const receipt = stepProjectileFrame(ctx);
    expect(receipt.ok).toBe(true);
    expect(ctx.gs.bullets[0].x).toBe(12);
    expect(ctx.gs.enemyBullets).toHaveLength(0);
  });

  it("resolves an expiring grenade through the shared enemy damage boundary", () => {
    const ctx = runtime({
      grenades: [{ x: 50, y: 50, vx: 0, vy: 0, life: 1 }],
      enemies: [{ x: 60, y: 50, health: 100, maxHealth: 100, size: 20 }],
    });
    stepProjectileFrame(ctx);
    expect(ctx.gs.grenades).toHaveLength(0);
    expect(ctx.gs.enemies[0].health).toBeLessThan(100);
    expect(ctx.drainEnemyDefeats).toHaveBeenCalled();
  });

  it("handles a pending rail beam without the former undefined combo multiplier", () => {
    const ctx = runtime({
      pendingBeam: { ox: 0, oy: 50, cos: 1, sin: 0, maxT: 180, weaponIdx: 0 },
      enemies: [{ x: 80, y: 50, health: 100, maxHealth: 100, size: 20, dmgMult: 1 }],
    });
    ctx.combo.count = 4;
    expect(() => stepProjectileFrame(ctx)).not.toThrow();
    expect(ctx.gs.pendingBeam).toBeNull();
    expect(ctx.gs.enemies[0].health).toBeLessThan(100);
  });
});
