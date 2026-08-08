import { describe, expect, it } from "vitest";
import { describeZombieOutbreak, getZombieOutbreakPlan, getZombieWaveEnemyCount, mutateEnemyForZombieMode } from "./zombieMode.js";

describe("Sewer Zombies", () => {
  it("creates deterministic surge waves every third wave", () => {
    expect(getZombieOutbreakPlan(2).surge).toBe(false);
    expect(getZombieOutbreakPlan(3)).toMatchObject({ wave: 3, surge: true, label: "SEWER SURGE" });
    expect(getZombieWaveEnemyCount(10, 3)).toBe(19);
    expect(describeZombieOutbreak(3)).toContain("nearly twice as dense");
  });

  it("mutates the same spawn ordinal into the same undead variant", () => {
    const source = () => ({ name: "Influencer", emoji: "📱", color: "#fff", health: 100, maxHealth: 100, speed: 2, points: 50 });
    const first = mutateEnemyForZombieMode(source(), { wave: 7, ordinal: 4 });
    const second = mutateEnemyForZombieMode(source(), { wave: 7, ordinal: 4 });
    expect(first).toEqual(second);
    expect(first.isZombie).toBe(true);
    expect(first.emoji).toBe("🧟");
    expect(first.health).toBeGreaterThan(100);
    expect(first.points).toBeGreaterThan(50);
  });
});
