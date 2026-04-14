import { describe, expect, it } from "vitest";
import {
  createWaveDirectorPlan,
  getGuaranteedEliteType,
  getWaveDirectorState,
  getWaveSpawnRate,
} from "./waveDirector.js";

describe("waveDirector", () => {
  it("builds a non-boss wave plan with four pacing stages", () => {
    const plan = createWaveDirectorPlan({ wave: 12, maxEnemies: 30, nonBossWaveCount: 4, random: () => 0 });
    expect(plan.label).toBeTruthy();
    expect(plan.stages).toHaveLength(4);
    expect(plan.stages[2].id).toBe("climax");
  });

  it("assigns an event on every third eligible non-boss wave", () => {
    const plan = createWaveDirectorPlan({ wave: 9, maxEnemies: 24, nonBossWaveCount: 6, random: () => 0 });
    expect(plan.event).toBeTruthy();
  });

  it("keeps special competitive waves free of extra director events", () => {
    const plan = createWaveDirectorPlan({
      wave: 9,
      maxEnemies: 24,
      nonBossWaveCount: 6,
      scoreAttackMode: true,
      random: () => 0,
    });
    expect(plan.event).toBe(null);
  });

  it("slows spawning when the encounter budget is already saturated", () => {
    const plan = createWaveDirectorPlan({ wave: 18, maxEnemies: 40, nonBossWaveCount: 4, random: () => 0 });
    const state = getWaveDirectorState(plan, 26, 40, 14);
    expect(state.stageId).toBe("climax");
    expect(getWaveSpawnRate(40, state)).toBeGreaterThan(40);
  });

  it("forces telegraphed elites during the climax cadence on later waves", () => {
    const plan = createWaveDirectorPlan({ wave: 20, maxEnemies: 50, nonBossWaveCount: 5, random: () => 0 });
    const state = getWaveDirectorState(plan, 32, 50, 6);
    expect(state.stageId).toBe("climax");
    expect(getGuaranteedEliteType(plan, state, 32)).toBe(plan.eliteType);
    expect(getGuaranteedEliteType(plan, state, 33)).toBe(null);
  });
});
