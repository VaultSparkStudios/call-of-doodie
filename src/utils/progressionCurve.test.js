import { describe, expect, it } from "vitest";
import {
  buildProgressionRunway,
  describeProgressionRunway,
  getAccountLevel,
  killsRequiredForAccountLevel,
} from "./progressionCurve.js";
import { META_UPGRADES } from "../constants.js";

describe("progression runway contract", () => {
  it("keeps account levels monotonic at exact source thresholds", () => {
    for (let level = 1; level <= 20; level += 1) {
      const threshold = killsRequiredForAccountLevel(level);
      expect(getAccountLevel(threshold)).toBe(level);
      if (threshold > 0) expect(getAccountLevel(threshold - 1)).toBe(level - 1);
    }
  });

  it("derives the next mastery badge and affordable upgrade without access or tuning claims", () => {
    const runway = buildProgressionRunway({
      totalKills: 79,
      careerPoints: 250,
      upgradeTiers: {},
      killsPerRunScenarios: [10, 25],
    });

    expect(runway.current.accountLevel).toBe(2);
    expect(runway.arsenal).toMatchObject({ availability: "all-open", totalWeapons: 12 });
    expect(runway.nextMastery).toMatchObject({ accountLevel: 3, killsRemaining: 1, available: true });
    expect(runway.nextMastery.runsByKillsPerRun).toEqual({ "10": 1, "25": 1 });
    expect(runway.nextUpgrade).toMatchObject({ tier: 1, cost: 200, pointsRemaining: 0 });
    expect(runway.assumptions.scenariosAreDescriptiveNotTargets).toBe(true);
    expect(describeProgressionRunway(runway)).toContain("affordable now");
  });

  it("advances sequential upgrade tiers and handles completed progression", () => {
    const runway = buildProgressionRunway({
      totalKills: 6000,
      careerPoints: 100,
      upgradeTiers: Object.fromEntries(META_UPGRADES.map((group) => [group.id, group.tiers.length])),
    });

    expect(runway.nextMastery).toBeNull();
    expect(runway.nextUpgrade).toBeNull();
    expect(runway.remainingUpgradePaths).toBe(0);
    expect(describeProgressionRunway(runway)).toContain("permanent upgrade path");
  });
});
