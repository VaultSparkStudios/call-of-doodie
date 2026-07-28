import { describe, expect, it } from "vitest";
import { buildPublicGameplayContract } from "../scripts/lib/public-gameplay-contract.mjs";
import { BOSS_ROTATION } from "../src/gameHelpers.js";
import { META_UPGRADES, WEAPONS } from "../src/constants.js";

describe("public gameplay contract", () => {
  it("derives mechanics from source and keeps trust scope explicit", () => {
    const contract = buildPublicGameplayContract();
    expect(contract.weapons).toHaveLength(WEAPONS.length);
    expect(contract.permanentUpgrades).toHaveLength(META_UPGRADES.length);
    expect(contract.enemies.filter((enemy) => enemy.boss).map((enemy) => enemy.index)).toEqual([...BOSS_ROTATION].sort((a, b) => a - b));
    expect(contract.trust.excludedClaim).toContain("not full physics resimulation");
    expect(contract.cost).toEqual({ freeTierCostStatus: "cost-neutral", paidInferenceRequired: false });
    expect(contract.modes).toHaveLength(7);
    expect(contract.formations.map((formation) => formation.id)).toEqual(["pincer", "escort", "flank", "surge"]);
    expect(contract.formations.every((formation) => formation.counterplay.length > 20)).toBe(true);
  });
});
