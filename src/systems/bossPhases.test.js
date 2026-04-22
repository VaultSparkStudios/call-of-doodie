import { describe, expect, test, vi } from "vitest";
import { getBossRangedBurstCount, triggerBossPhaseTwoTransition } from "./bossPhases.js";

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
    expect(addText).toHaveBeenCalled();
    expect(addParticles).toHaveBeenCalledTimes(2);
    expect(soundWaveClear).toHaveBeenCalledTimes(1);
  });
});
