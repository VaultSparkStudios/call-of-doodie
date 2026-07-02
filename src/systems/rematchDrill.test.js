// REMATCH drill logic (S112)

import { describe, it, expect } from "vitest";
import {
  resolveRematchStartWave,
  getMaxEnemiesForWave,
  estimateNonBossWaveCount,
  buildRematchKit,
  buildRematchDrillBrief,
  buildRematchMasteryReceipt,
} from "./rematchDrill.js";

describe("resolveRematchStartWave", () => {
  it("returns null for wave 1, 0, negatives, and junk", () => {
    expect(resolveRematchStartWave(1)).toBeNull();
    expect(resolveRematchStartWave(0)).toBeNull();
    expect(resolveRematchStartWave(-3)).toBeNull();
    expect(resolveRematchStartWave("nope")).toBeNull();
    expect(resolveRematchStartWave(undefined)).toBeNull();
  });

  it("returns the death wave for non-boss waves", () => {
    expect(resolveRematchStartWave(2)).toBe(2);
    expect(resolveRematchStartWave(7)).toBe(7);
    expect(resolveRematchStartWave(23)).toBe(23);
  });

  it("starts one wave early for boss waves (every 5th)", () => {
    expect(resolveRematchStartWave(5)).toBe(4);
    expect(resolveRematchStartWave(10)).toBe(9);
    expect(resolveRematchStartWave(50)).toBe(49);
  });
});

describe("getMaxEnemiesForWave", () => {
  it("mirrors the in-loop formula at representative waves", () => {
    expect(getMaxEnemiesForWave(1)).toBe(8);
    expect(getMaxEnemiesForWave(10)).toBe(35);
    expect(getMaxEnemiesForWave(18)).toBe(59);
    expect(getMaxEnemiesForWave(20)).toBe(60); // capped at 60 below wave 40
    expect(getMaxEnemiesForWave(45)).toBe(80); // capped at 80 for 40-49
    expect(getMaxEnemiesForWave(60)).toBe(100); // capped at 100 for 50+
  });

  it("applies the wave enemy multiplier before the cap", () => {
    expect(getMaxEnemiesForWave(4, 2)).toBe(34);
    expect(getMaxEnemiesForWave(30, 2)).toBe(60);
  });
});

describe("estimateNonBossWaveCount", () => {
  it("subtracts one boss per 5 waves and floors at 1", () => {
    expect(estimateNonBossWaveCount(1)).toBe(1);
    expect(estimateNonBossWaveCount(4)).toBe(4);
    expect(estimateNonBossWaveCount(6)).toBe(5);
    expect(estimateNonBossWaveCount(12)).toBe(10);
  });
});

describe("buildRematchKit", () => {
  it("returns null when there is nothing to rematch", () => {
    expect(buildRematchKit(1)).toBeNull();
    expect(buildRematchKit(null)).toBeNull();
  });

  it("scales health and coins with wave, capped", () => {
    expect(buildRematchKit(4)).toEqual({ startWave: 4, maxHealthBonus: 15, coins: 60 });
    expect(buildRematchKit(12)).toEqual({ startWave: 12, maxHealthBonus: 55, coins: 180 });
    expect(buildRematchKit(40)).toEqual({ startWave: 40, maxHealthBonus: 100, coins: 400 });
  });

  it("is monotonically non-decreasing in wave", () => {
    let prev = buildRematchKit(2);
    for (let w = 3; w <= 60; w++) {
      const kit = buildRematchKit(w);
      expect(kit.maxHealthBonus).toBeGreaterThanOrEqual(prev.maxHealthBonus);
      expect(kit.coins).toBeGreaterThanOrEqual(prev.coins);
      prev = kit;
    }
  });
});

describe("buildRematchDrillBrief", () => {
  it("carries the death-screen coaching reason into a practice run brief", () => {
    const brief = buildRematchDrillBrief({
      deathWave: 12,
      startWave: 12,
      drill: {
        id: "enemy_lab_rematch",
        title: "Sidestep Karen",
        detail: "Move perpendicular before the ranged burst lands.",
      },
    });

    expect(brief).toEqual({
      id: "enemy_lab_rematch",
      title: "Sidestep Karen",
      detail: "Move perpendicular before the ranged burst lands.",
      deathWave: 12,
      startWave: 12,
      label: "REMATCH W12",
    });
  });

  it("falls back to honest generic practice copy", () => {
    const brief = buildRematchDrillBrief({ deathWave: 5, startWave: 4 });

    expect(brief.title).toBe("Wave 5 correction");
    expect(brief.label).toBe("REMATCH W4");
    expect(brief.detail).toContain("Practice the exact failure point");
  });
});

describe("buildRematchMasteryReceipt", () => {
  it("summarizes best-of-3 mastery progress", () => {
    expect(buildRematchMasteryReceipt({ attempts: 1, wins: 1 })).toMatchObject({
      attempts: 1,
      wins: 1,
      targetWins: 2,
      complete: false,
      label: "BEST-OF-3 1/2",
    });
    expect(buildRematchMasteryReceipt({ attempts: 3, wins: 2 })).toMatchObject({
      complete: true,
      label: "BEST-OF-3 MASTERED",
    });
  });
});
