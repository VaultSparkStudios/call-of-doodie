import { describe, test, expect } from "vitest";
import { PERKS, CURSED_PERKS } from "../constants.js";
import { getActiveSynergiesForPick } from "./perkSynergies.js";

function findPerk(id) {
  return [...PERKS, ...CURSED_PERKS].find((p) => p.id === id);
}

describe("getActiveSynergiesForPick", () => {
  test("returns empty for no active perks", () => {
    expect(getActiveSynergiesForPick(findPerk("eagle_eye"), [])).toEqual([]);
  });

  test("detects eagle_eye + penetrator synergy (picking eagle_eye)", () => {
    const result = getActiveSynergiesForPick(findPerk("eagle_eye"), [findPerk("penetrator")]);
    expect(result).toHaveLength(1);
    expect(result[0].partnerId).toBe("penetrator");
    expect(result[0].label).toMatch(/crit/i);
  });

  test("detects eagle_eye + tungsten_rounds as pierce partner", () => {
    const result = getActiveSynergiesForPick(findPerk("eagle_eye"), [findPerk("tungsten_rounds")]);
    expect(result).toHaveLength(1);
    expect(result[0].partnerId).toBe("tungsten_rounds");
  });

  test("detects penetrator + eagle_eye synergy (picking penetrator)", () => {
    const result = getActiveSynergiesForPick(findPerk("penetrator"), [findPerk("eagle_eye")]);
    expect(result).toHaveLength(1);
    expect(result[0].partnerId).toBe("eagle_eye");
  });

  test("detects vampire + chain_lightning synergy (picking chain_lightning)", () => {
    const result = getActiveSynergiesForPick(findPerk("chain_lightning"), [findPerk("vampire")]);
    expect(result).toHaveLength(1);
    expect(result[0].partnerId).toBe("vampire");
    expect(result[0].label).toMatch(/lifesteal/i);
  });

  test("detects multiple synergies for crit_cascade", () => {
    const result = getActiveSynergiesForPick(findPerk("crit_cascade"), [
      findPerk("eagle_eye"),
      findPerk("glass_mind"),
    ]);
    expect(result).toHaveLength(2);
    const partnerIds = result.map((r) => r.partnerId);
    expect(partnerIds).toContain("eagle_eye");
    expect(partnerIds).toContain("glass_mind");
  });

  test("returns only one pierce synergy entry even when multiple pierce perks are active", () => {
    // Both penetrator and tungsten_rounds grant pierce; crit_cascade checks pierce > 0.
    // The function should return one entry (the first partner found), not two.
    const result = getActiveSynergiesForPick(findPerk("crit_cascade"), [
      findPerk("penetrator"),
      findPerk("tungsten_rounds"),
    ]);
    const pierceEntries = result.filter((r) => r.label.includes("+8%"));
    expect(pierceEntries).toHaveLength(1);
  });

  test("returns empty when no synergy partners in active build", () => {
    const result = getActiveSynergiesForPick(findPerk("bullet_hose"), [findPerk("eagle_eye")]);
    expect(result).toEqual([]);
  });

  test("handles null candidatePerk gracefully", () => {
    expect(getActiveSynergiesForPick(null, [findPerk("vampire")])).toEqual([]);
  });

  test("handles undefined activePerks gracefully", () => {
    expect(getActiveSynergiesForPick(findPerk("vampire"), undefined)).toEqual([]);
  });

  test("returns empty for perk with no synergy rules (iron_gut)", () => {
    const result = getActiveSynergiesForPick(findPerk("iron_gut"), [
      findPerk("vampire"),
      findPerk("penetrator"),
    ]);
    expect(result).toEqual([]);
  });

  test("detects cursed perk synergy: pyromaniac + grenadier", () => {
    const result = getActiveSynergiesForPick(findPerk("pyromaniac"), [findPerk("grenadier")]);
    expect(result).toHaveLength(1);
    expect(result[0].partnerId).toBe("grenadier");
    expect(result[0].label).toMatch(/grenade/i);
  });

  test("detects overclocked + grenade_chain synergy", () => {
    const result = getActiveSynergiesForPick(findPerk("overclocked"), [findPerk("grenade_chain")]);
    expect(result).toHaveLength(1);
    expect(result[0].label).toMatch(/grenade/i);
  });
});
