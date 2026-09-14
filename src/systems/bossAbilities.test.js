import { describe, expect, it, vi } from "vitest";
import { BOSS_DECOY_FRAMES, BOSS_HEAL_FEEDBACK_FRAMES, healBossesFromEnemyBullet, stepBossDecoys } from "./bossAbilities.js";

function boss(overrides = {}) {
  return { isBossEnemy: true, hasCloneDecoy: true, hasLifesteal: true, health: 50, maxHealth: 100,
    x: 200, y: 150, size: 48, typeIndex: 4, emoji: "boss", color: "#F44", ...overrides };
}

describe("boss bonus abilities", () => {
  it("spawns once at half health as a bounded presentation record, without adding an enemy", () => {
    const enemy = boss({ health: 51 });
    const enemies = [enemy];
    const gs = { enemies };
    stepBossDecoys(gs, { W: 400, H: 300 });
    expect(enemy.cloneDecoy).toBeUndefined();
    enemy.health = 50;
    stepBossDecoys(gs, { W: 400, H: 300 });
    expect(gs.enemies).toBe(enemies);
    expect(gs.enemies).toHaveLength(1);
    expect(enemy.cloneDecoy.remainingFrames).toBe(BOSS_DECOY_FRAMES);
    expect(Object.keys(enemy.cloneDecoy).sort()).toEqual(["color", "emoji", "remainingFrames", "size", "typeIndex", "x", "y"]);
    expect(enemy.cloneDecoy.x).toBeGreaterThan(0);
    expect(enemy.cloneDecoy.x).toBeLessThan(400);
    const decoy = enemy.cloneDecoy;
    stepBossDecoys(gs, { W: 400, H: 300 });
    expect(enemy.cloneDecoy).toBe(decoy);
    for (let frame = 1; frame < BOSS_DECOY_FRAMES; frame++) stepBossDecoys(gs);
    expect(enemy.cloneDecoy).toBeUndefined();
    enemy.health = 80;
    stepBossDecoys(gs);
    enemy.health = 20;
    stepBossDecoys(gs);
    expect(enemy.cloneDecoy).toBeUndefined();
    expect(enemy.cloneDecoySpawned).toBe(true);
  });

  it("advances on simulation steps only and does not consume randomness or wall-clock time", () => {
    const gs = { enemies: [boss({ x: -500, y: 2000 })] };
    const random = vi.spyOn(Math, "random").mockImplementation(() => { throw new Error("seed stream touched"); });
    const now = vi.spyOn(Date, "now").mockImplementation(() => { throw new Error("wall clock touched"); });
    try {
      stepBossDecoys(gs, { W: 300, H: 200 });
      expect(gs.enemies[0].cloneDecoy).toMatchObject({ x: 56, y: 144, remainingFrames: 240 });
    } finally { random.mockRestore(); now.mockRestore(); }
  });

  it("keeps the sprite footprint and label inside the arena near every edge", () => {
    for (const [x, y] of [[-500, -500], [2000, 2000]]) {
      const enemy = boss({ x, y, size: 80 });
      stepBossDecoys({ enemies: [enemy] }, { W: 400, H: 300 });
      const decoy = enemy.cloneDecoy;
      const spriteHeight = Math.max(92, decoy.size / 2 * 3.7);
      expect(decoy.y - spriteHeight * 0.55).toBeGreaterThanOrEqual(0);
      expect(decoy.y + Math.max(spriteHeight * 0.45, decoy.size / 2 + 28)).toBeLessThanOrEqual(300);
      expect(decoy.x - decoy.size / 2 - 8).toBeGreaterThanOrEqual(0);
      expect(decoy.x + decoy.size / 2 + 8).toBeLessThanOrEqual(400);
    }
  });

  it("bounds malformed coordinates, sizes and dimensions and centers in a tiny arena", () => {
    const fallback = boss({ x: NaN, y: Infinity, size: Infinity });
    stepBossDecoys({ enemies: [fallback] }, { W: NaN, H: -1 });
    expect(fallback.cloneDecoy).toMatchObject({ x: 556, y: 336, size: 48, remainingFrames: 240 });
    const tiny = boss({ size: 9999 });
    stepBossDecoys({ enemies: [tiny] }, { W: 40, H: 30 });
    expect(tiny.cloneDecoy).toMatchObject({ x: 20, y: 15, size: 160 });
  });
  it("removes decoys on pending/resolved defeat and never creates one for corpses or regular enemies", () => {
    const enemies = [boss(), boss({ health: 0 }), boss({ isBossEnemy: false }), boss({ _defeatResolved: true })];
    stepBossDecoys({ enemies });
    expect(enemies[0].cloneDecoy).toBeDefined();
    expect(enemies.slice(1).every((enemy) => !enemy.cloneDecoy)).toBe(true);
    enemies[0]._defeatPending = { source: "bullet" };
    stepBossDecoys({ enemies });
    expect(enemies[0].cloneDecoy).toBeUndefined();
  });

  it("heals all eligible bosses by at most two, caps health and never revives a queued defeat", () => {
    const enemies = [boss(), boss({ health: 99 }), boss({ health: 100 }), boss({ health: 0 }),
      boss({ hasLifesteal: false }), boss({ _defeatPending: {} }), boss({ _defeatResolved: true }), boss({ isBossEnemy: false })];
    expect(healBossesFromEnemyBullet({ enemies }, 0)).toBe(0);
    expect(healBossesFromEnemyBullet({ enemies }, NaN)).toBe(0);
    expect(healBossesFromEnemyBullet({ enemies }, 8)).toBe(3);
    expect(enemies.map((enemy) => enemy.health)).toEqual([52, 100, 100, 0, 50, 50, 50, 50]);
    expect(enemies[0].lifestealFeedbackFrames).toBe(BOSS_HEAL_FEEDBACK_FRAMES);
    stepBossDecoys({ enemies });
    expect(enemies[0].lifestealFeedbackFrames).toBe(BOSS_HEAL_FEEDBACK_FRAMES - 1);
  });
});
