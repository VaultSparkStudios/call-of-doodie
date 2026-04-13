// Gameplay smoke tests — wave 1–3 logic
// These tests exercise the pure game-helper functions (spawnEnemy, spawnBoss)
// that drive wave progression. No canvas, rAF, or React required.

import { describe, it, expect, beforeEach } from "vitest";
import { spawnEnemy, spawnBoss, BOSS_ROTATION } from "./gameHelpers.js";
import { ENEMY_TYPES } from "./constants.js";

// Minimal gs stub that mirrors the fields spawnEnemy/spawnBoss read.
function makeGs(wave = 1, overrides = {}) {
  return {
    currentWave: wave,
    enemies: [],
    prestigeMult: 1,
    mutEnemySizeMult: 1,
    mutEnemyHPMult: 1,
    mutEnemySpeedExtra: 1,
    mutEnemyProjSpeed: 1,
    mutEnemyFireRateMult: 1,
    mutSpawnFrozen: 0,
    mutAlwaysEnraged: false,
    mutAllExplosive: false,
    mutBossEarly: 0,
    settEnemyHealthMult: 1,
    settEnemySpeedMult: 1,
    waveEventSpeedMult: 1,
    hyperspeedActive: false,
    ...overrides,
  };
}

const W = 800;
const H = 600;

// ── spawnEnemy ────────────────────────────────────────────────────────────────

describe("spawnEnemy — wave 1", () => {
  let gs;
  beforeEach(() => {
    gs = makeGs(1);
    spawnEnemy(gs, W, H, "normal");
  });

  it("adds exactly one enemy", () => {
    expect(gs.enemies).toHaveLength(1);
  });

  it("enemy has required numeric fields", () => {
    const e = gs.enemies[0];
    expect(typeof e.x).toBe("number");
    expect(typeof e.y).toBe("number");
    expect(e.health).toBeGreaterThan(0);
    expect(e.maxHealth).toBeGreaterThan(0);
    expect(e.speed).toBeGreaterThan(0);
    expect(e.size).toBeGreaterThan(0);
  });

  it("health equals maxHealth on spawn", () => {
    const e = gs.enemies[0];
    expect(e.health).toBe(e.maxHealth);
  });

  it("enemy spawns off-screen (outside play area)", () => {
    const e = gs.enemies[0];
    const onScreen = e.x >= 0 && e.x <= W && e.y >= 0 && e.y <= H;
    expect(onScreen).toBe(false);
  });

  it("isBossEnemy is false for regular spawn", () => {
    expect(gs.enemies[0].isBossEnemy).toBe(false);
  });

  it("typeIndex is 0 at wave 1 (only basic enemy eligible)", () => {
    // At wave 1, only typeIndex 0 is eligible (all branch conditions require wv >= 2+)
    expect(gs.enemies[0].typeIndex).toBe(0);
  });
});

describe("spawnEnemy — wave 2", () => {
  it("can produce typeIndex 1 enemies", () => {
    // Run many spawns; at wave 2 typeIndex 1 is eligible (r < 0.80)
    const seen = new Set();
    for (let i = 0; i < 200; i++) {
      const gs = makeGs(2);
      spawnEnemy(gs, W, H, "normal");
      seen.add(gs.enemies[0].typeIndex);
    }
    expect(seen.has(1)).toBe(true);
  });

  it("does not produce enemies requiring wave 3+", () => {
    // typeIndex 5 requires wv >= 3; should not appear at wave 2
    const seen = new Set();
    for (let i = 0; i < 200; i++) {
      const gs = makeGs(2);
      spawnEnemy(gs, W, H, "normal");
      seen.add(gs.enemies[0].typeIndex);
    }
    expect(seen.has(5)).toBe(false);
  });
});

describe("spawnEnemy — wave 3", () => {
  it("can produce typeIndex 5 enemies (first unlocked at wave 3)", () => {
    const seen = new Set();
    for (let i = 0; i < 300; i++) {
      const gs = makeGs(3);
      spawnEnemy(gs, W, H, "normal");
      seen.add(gs.enemies[0].typeIndex);
    }
    expect(seen.has(5)).toBe(true);
  });

  it("multiple spawns accumulate in gs.enemies", () => {
    const gs = makeGs(3);
    for (let i = 0; i < 5; i++) spawnEnemy(gs, W, H, "normal");
    expect(gs.enemies).toHaveLength(5);
  });

  it("HP scales higher than wave 1", () => {
    // Wave 3 HP multiplier is (1 + 3*0.12) = 1.36 vs (1 + 1*0.12) = 1.12 at wave 1
    // Compare same typeIndex 0 across waves (forced by mocking Math.random)
    const gsW1 = makeGs(1);
    const gsW3 = makeGs(3);
    // Use typeIndex 0 for both by seeding random to always return high value (> 0.80)
    const origRandom = Math.random;
    Math.random = () => 0.99;
    spawnEnemy(gsW1, W, H, "normal");
    spawnEnemy(gsW3, W, H, "normal");
    Math.random = origRandom;
    expect(gsW3.enemies[0].health).toBeGreaterThan(gsW1.enemies[0].health);
  });

  it("speed scales higher than wave 1", () => {
    const gsW1 = makeGs(1);
    const gsW3 = makeGs(3);
    const origRandom = Math.random;
    Math.random = () => 0.99;
    spawnEnemy(gsW1, W, H, "normal");
    spawnEnemy(gsW3, W, H, "normal");
    Math.random = origRandom;
    expect(gsW3.enemies[0].speed).toBeGreaterThan(gsW1.enemies[0].speed);
  });
});

describe("spawnEnemy — difficulty scaling", () => {
  it("hard difficulty produces higher HP than normal at wave 3", () => {
    const origRandom = Math.random;
    Math.random = () => 0.99;
    const gsNormal = makeGs(3);
    const gsHard = makeGs(3);
    spawnEnemy(gsNormal, W, H, "normal");
    spawnEnemy(gsHard, W, H, "hard");
    Math.random = origRandom;
    expect(gsHard.enemies[0].health).toBeGreaterThan(gsNormal.enemies[0].health);
  });

  it("falls back to normal difficulty for unknown difficultyId", () => {
    const origRandom = Math.random;
    Math.random = () => 0.99;
    const gsNormal = makeGs(3);
    const gsUnknown = makeGs(3);
    spawnEnemy(gsNormal, W, H, "normal");
    spawnEnemy(gsUnknown, W, H, "nonexistent_difficulty");
    Math.random = origRandom;
    // Should not throw and should produce same HP as normal fallback
    expect(gsUnknown.enemies[0].health).toBe(gsNormal.enemies[0].health);
  });
});

// ── spawnBoss ─────────────────────────────────────────────────────────────────

describe("spawnBoss", () => {
  it("adds exactly one boss enemy", () => {
    const gs = makeGs(5);
    spawnBoss(gs, W, H, "normal", BOSS_ROTATION[0]);
    expect(gs.enemies).toHaveLength(1);
  });

  it("boss is flagged isBossEnemy", () => {
    const gs = makeGs(5);
    spawnBoss(gs, W, H, "normal", BOSS_ROTATION[0]);
    expect(gs.enemies[0].isBossEnemy).toBe(true);
  });

  it("boss name is prefixed with ☠", () => {
    const gs = makeGs(5);
    spawnBoss(gs, W, H, "normal", BOSS_ROTATION[0]);
    expect(gs.enemies[0].name).toMatch(/^☠/);
  });

  it("boss has substantially more HP than a regular enemy at the same wave", () => {
    const origRandom = Math.random;
    Math.random = () => 0.99;
    const gsReg = makeGs(5);
    const gsBoss = makeGs(5);
    spawnEnemy(gsReg, W, H, "normal");
    Math.random = origRandom;
    spawnBoss(gsBoss, W, H, "normal", BOSS_ROTATION[0]);
    expect(gsBoss.enemies[0].health).toBeGreaterThan(gsReg.enemies[0].health * 2);
  });

  it("boss spawns off-screen", () => {
    const gs = makeGs(5);
    spawnBoss(gs, W, H, "normal", BOSS_ROTATION[0]);
    const b = gs.enemies[0];
    const onScreen = b.x > 0 && b.x < W && b.y > 0 && b.y < H;
    expect(onScreen).toBe(false);
  });

  it("boss has bullet ring and ground slam capability flags", () => {
    // At wave 15, both hasBulletRing and hasGroundSlam should be true
    const gs = makeGs(15);
    spawnBoss(gs, W, H, "normal", BOSS_ROTATION[0]);
    const b = gs.enemies[0];
    expect(b.hasBulletRing).toBe(true);
    expect(b.hasGroundSlam).toBe(true);
  });

  it("all BOSS_ROTATION typeIndexes are valid ENEMY_TYPES indices", () => {
    for (const idx of BOSS_ROTATION) {
      expect(ENEMY_TYPES[idx]).toBeDefined();
    }
  });
});

// ── BOSS_ROTATION ─────────────────────────────────────────────────────────────

describe("BOSS_ROTATION", () => {
  it("has 6 entries (one per boss tier)", () => {
    expect(BOSS_ROTATION).toHaveLength(6);
  });

  it("all entries are unique", () => {
    expect(new Set(BOSS_ROTATION).size).toBe(BOSS_ROTATION.length);
  });
});

// ── wave mutation flags ───────────────────────────────────────────────────────

describe("spawnEnemy — mutation flags", () => {
  it("mutSpawnFrozen transfers to enemy freezeTimer", () => {
    const gs = makeGs(1, { mutSpawnFrozen: 120 });
    spawnEnemy(gs, W, H, "normal");
    expect(gs.enemies[0].freezeTimer).toBe(120);
  });

  it("mutEnemyHPMult increases enemy health proportionally", () => {
    const origRandom = Math.random;
    Math.random = () => 0.99;
    const gsBase = makeGs(3);
    const gsMut = makeGs(3, { mutEnemyHPMult: 2 });
    spawnEnemy(gsBase, W, H, "normal");
    spawnEnemy(gsMut, W, H, "normal");
    Math.random = origRandom;
    expect(gsMut.enemies[0].health).toBeCloseTo(gsBase.enemies[0].health * 2, 5);
  });

  it("mutAllExplosive sets eliteType at wave 10+", () => {
    const gs = makeGs(10, { mutAllExplosive: true });
    spawnEnemy(gs, W, H, "normal");
    expect(gs.enemies[0].eliteType).toBe("explosive");
  });
});
