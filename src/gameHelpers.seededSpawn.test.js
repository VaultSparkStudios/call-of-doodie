// Seeded per-wave spawn determinism (S112)
// Same (runSeed, wave) must reproduce the exact enemy sequence; different
// waves and seeds must diverge; seedless gs objects keep legacy Math.random.

import { describe, it, expect } from "vitest";
import { createWaveRng, getWaveSpawnRng, spawnEnemy, spawnBoss } from "./gameHelpers.js";

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

function spawnSequence(seed, wave, count) {
  const gs = makeGs(wave, { runSeed: seed });
  for (let i = 0; i < count; i++) spawnEnemy(gs, W, H, "normal");
  return gs.enemies.map((e) => ({
    ti: e.typeIndex,
    x: e.x,
    y: e.y,
    wobble: e.wobble,
    shootTimer: e.shootTimer,
    eliteType: e.eliteType || null,
  }));
}

describe("createWaveRng", () => {
  it("is deterministic for the same (seed, wave)", () => {
    const a = createWaveRng(123456, 7);
    const b = createWaveRng(123456, 7);
    for (let i = 0; i < 50; i++) expect(a()).toBe(b());
  });

  it("stays in [0, 1)", () => {
    const rng = createWaveRng(42, 3);
    for (let i = 0; i < 200; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("diverges across waves for the same seed", () => {
    const a = createWaveRng(123456, 7);
    const b = createWaveRng(123456, 8);
    const seqA = Array.from({ length: 8 }, () => a());
    const seqB = Array.from({ length: 8 }, () => b());
    expect(seqA).not.toEqual(seqB);
  });

  it("diverges across seeds for the same wave", () => {
    const a = createWaveRng(1, 5);
    const b = createWaveRng(2, 5);
    const seqA = Array.from({ length: 8 }, () => a());
    const seqB = Array.from({ length: 8 }, () => b());
    expect(seqA).not.toEqual(seqB);
  });
});

describe("getWaveSpawnRng", () => {
  it("returns Math.random when gs has no numeric runSeed", () => {
    expect(getWaveSpawnRng(makeGs(1))).toBe(Math.random);
    expect(getWaveSpawnRng(null)).toBe(Math.random);
    expect(getWaveSpawnRng(makeGs(1, { runSeed: "abc" }))).toBe(Math.random);
  });

  it("caches the stream within a wave and re-derives on wave change", () => {
    const gs = makeGs(3, { runSeed: 999 });
    const first = getWaveSpawnRng(gs);
    expect(getWaveSpawnRng(gs)).toBe(first);
    gs.currentWave = 4;
    const next = getWaveSpawnRng(gs);
    expect(next).not.toBe(first);
    expect(typeof next).toBe("function");
  });

  it("mid-wave stream state is independent of prior waves", () => {
    // Wave 9 stream must be identical whether or not wave 8 consumed rolls.
    const cold = makeGs(9, { runSeed: 777 });
    const warm = makeGs(8, { runSeed: 777 });
    for (let i = 0; i < 13; i++) getWaveSpawnRng(warm)();
    warm.currentWave = 9;
    const a = getWaveSpawnRng(cold);
    const b = getWaveSpawnRng(warm);
    for (let i = 0; i < 20; i++) expect(a()).toBe(b());
  });
});

describe("spawnEnemy — seeded determinism", () => {
  it("reproduces the exact spawn sequence for the same (seed, wave)", () => {
    expect(spawnSequence(123456, 5, 12)).toEqual(spawnSequence(123456, 5, 12));
  });

  it("reproduces elite rolls deterministically at wave 12+", () => {
    expect(spawnSequence(2026, 12, 15)).toEqual(spawnSequence(2026, 12, 15));
  });

  it("diverges for a different wave with the same seed", () => {
    expect(spawnSequence(123456, 5, 12)).not.toEqual(spawnSequence(123456, 6, 12));
  });

  it("diverges for a different seed on the same wave", () => {
    expect(spawnSequence(1, 5, 12)).not.toEqual(spawnSequence(2, 5, 12));
  });

  it("still spawns valid enemies without a seed (legacy path)", () => {
    const gs = makeGs(2);
    spawnEnemy(gs, W, H, "normal");
    expect(gs.enemies).toHaveLength(1);
    expect(gs.enemies[0].health).toBeGreaterThan(0);
  });
});

describe("spawnBoss — seeded determinism", () => {
  function bossSnapshot(seed) {
    const gs = makeGs(20, { runSeed: seed });
    spawnBoss(gs, W, H, "normal", 4);
    const b = gs.enemies[0];
    return {
      x: b.x,
      y: b.y,
      groundSlamTimer: b.groundSlamTimer,
      bonusAbilities: b._bonusAbilities,
    };
  }

  it("reproduces spawn side, slam timer, and bonus abilities for the same seed", () => {
    expect(bossSnapshot(31337)).toEqual(bossSnapshot(31337));
  });

  it("picks two distinct bonus abilities", () => {
    const snap = bossSnapshot(31337);
    expect(snap.bonusAbilities).toHaveLength(2);
    expect(new Set(snap.bonusAbilities).size).toBe(2);
  });
});
