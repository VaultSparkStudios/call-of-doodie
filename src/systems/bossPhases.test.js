import { describe, expect, test, vi } from "vitest";
import { getBossPhaseTwoWarning, getBossRangedBurstCount, triggerBossPhaseTwoTransition } from "./bossPhases.js";

describe("bossPhases", () => {
  test("gives Mega Karen a five-shot burst below half health", () => {
    expect(getBossRangedBurstCount({ isBossEnemy: true, typeIndex: 4, health: 40, maxHealth: 100 })).toBe(5);
    expect(getBossRangedBurstCount({ isBossEnemy: true, typeIndex: 4, health: 60, maxHealth: 100 })).toBe(1);
  });

  test("applies the shared phase-two transition once", () => {
    const enemy = { isBossEnemy: true, bossPhase2: false, health: 45, maxHealth: 100, speed: 10, projRate: 50, x: 100, y: 120 };
    const gs = { screenShake: 0 };
    const addText = vi.fn();
    const addParticles = vi.fn();
    const soundWaveClear = vi.fn();

    const changed = triggerBossPhaseTwoTransition({ enemy, gs, addText, addParticles, soundWaveClear });

    expect(changed).toBe(true);
    expect(enemy.bossPhase2).toBe(true);
    expect(enemy.speed).toBeCloseTo(13.5);
    expect(enemy.projRate).toBe(35);
    expect(gs.screenShake).toBe(18);
    expect(addText).toHaveBeenCalledTimes(2);
    expect(addText.mock.calls[1][3]).toContain("phase");
    expect(addParticles).toHaveBeenCalledTimes(2);
    expect(soundWaveClear).toHaveBeenCalledTimes(1);
  });

  test("returns concrete phase-two warnings for known bosses", () => {
    expect(getBossPhaseTwoWarning({ typeIndex: 4 })).toContain("Karen");
    expect(getBossPhaseTwoWarning(20)).toContain("Algorithm");
  });

  test("falls back safely for unknown phase-two bosses", () => {
    expect(getBossPhaseTwoWarning(999)).toContain("Dodge first");
  });
});
