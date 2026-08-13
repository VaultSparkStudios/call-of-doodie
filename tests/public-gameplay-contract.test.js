import { describe, expect, it } from "vitest";
import { buildPublicGameplayContract } from "../scripts/lib/public-gameplay-contract.mjs";
import { BOSS_ROTATION } from "../src/gameHelpers.js";
import { META_UPGRADES, WEAPONS } from "../src/constants.js";

describe("public gameplay contract", () => {
  it("derives mechanics from source and keeps trust scope explicit", () => {
    const contract = buildPublicGameplayContract();
    expect(contract.weapons).toHaveLength(WEAPONS.length);
    expect(contract.schemaVersion).toBe("gameplay-contract-v2");
    expect(contract.weapons.every((weapon) => weapon.availableAtStart)).toBe(true);
    expect(contract.weapons.every((weapon) => Number.isInteger(weapon.arsenalMilestoneLevel))).toBe(true);
    expect(contract.weapons.some((weapon) => "unlockAccountLevel" in weapon)).toBe(false);
    expect(contract.permanentUpgrades).toHaveLength(META_UPGRADES.length);
    expect(contract.enemies.filter((enemy) => enemy.boss).map((enemy) => enemy.index)).toEqual([...BOSS_ROTATION].sort((a, b) => a - b));
    expect(contract.trust.excludedClaim).toContain("not full physics resimulation");
    expect(contract.trust.replayCoverage).toMatchObject({
      schemaVersion: "replay-coverage-v1",
      confidenceCeiling: "advisory",
    });
    expect(contract.trust.replayCoverage.covered).toHaveLength(4);
    expect(contract.trust.replayCoverage.covered).toContainEqual(expect.objectContaining({
      id: "recorded-wave-plans",
      coverage: "planned_pressure_not_spawn_physics_or_outcomes",
    }));
    expect(contract.trust.replayCoverage.excluded).toHaveLength(3);
    expect(contract.cost).toEqual({ freeTierCostStatus: "cost-neutral", paidInferenceRequired: false });
    expect(contract.modes).toHaveLength(8);
    expect(contract.formations.map((formation) => formation.id)).toEqual(["pincer", "escort", "flank", "surge"]);
    expect(contract.prestige.totalKillsRequired).toBe(11_520);
    expect(contract.prestige.source).toBe("src/utils/progressionCurve.js");
    expect(contract.prestige.projectionClaimScope).toContain("not promised");
    expect(contract.formations.every((formation) => formation.counterplay.length > 20)).toBe(true);
  });
});
