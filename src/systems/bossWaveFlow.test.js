import { describe, expect, test } from "vitest";
import { createBossWavePlan, getBossWaveWarningLines } from "./bossWaveFlow.js";

describe("bossWaveFlow", () => {
  test("creates a developer boss plan for wave 50+", () => {
    const plan = createBossWavePlan({
      currentWave: 50,
      bossRushMode: false,
      developerBossSpawned: false,
      bossRotation: [4, 9, 16],
      enemyTypes: [],
    });
    expect(plan.isDeveloperWave).toBe(true);
    expect(plan.spawnBosses).toEqual([21]);
    expect(plan.markDeveloperBossSpawned).toBe(true);
  });

  test("creates dual boss spawn plans for later waves", () => {
    const plan = createBossWavePlan({
      currentWave: 15,
      bossRushMode: false,
      developerBossSpawned: true,
      bossRotation: [4, 9, 16],
      enemyTypes: [],
    });
    expect(plan.isDeveloperWave).toBe(false);
    expect(plan.spawnBosses.length).toBe(2);
    expect(plan.secondaryBoss).not.toBeNull();
  });

  test("returns warning lines for special bosses", () => {
    const warnings = getBossWaveWarningLines({ currentWave: 20, primaryBoss: 17, secondaryBoss: 18 });
    expect(warnings).toHaveLength(2);
    expect(warnings[0].text).toContain("ARMORED SHIELD");
  });
});
