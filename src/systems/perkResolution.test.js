import { describe, expect, test } from "vitest";
import { applyArchetypeCapstone, applyPerkSynergies, getPerkSynergyPreview } from "./perkResolution.js";

describe("perkResolution", () => {
  test("unlocks and applies perk synergies once", () => {
    const mods = {
      hasVampire: true,
      hasLastResort: true,
      hasEagleEye: true,
      pierce: 1,
      hasComboMaster: true,
      lifesteal: 0,
      critBonus: 0,
    };

    const unlocked = applyPerkSynergies(mods);

    // DEATH'S GAMBIT no longer fires here — it requires hasDeadMansHand
    expect(unlocked.map((entry) => entry.name)).toEqual([
      "🎯🔫 DEAD EYE",
      "⚡ DEATH'S DOOR",
      "🦅 SNIPER'S MARK",
      "🌪️ BLOODCOMBO",
    ]);
    expect(mods.lifesteal).toBeCloseTo(0.04);
    expect(mods.critBonus).toBeCloseTo(0.18);
    expect(mods.pierce).toBe(2);
    expect(mods.comboVampireMult).toBe(true);

    expect(applyPerkSynergies(mods)).toEqual([]);
  });

  test("applies archetype capstone bonuses to perk mods and game state", () => {
    const perkMods = { lifesteal: 0, critBonus: 0, pickupRange: 30 };
    const gameState = { player: { speed: 10 } };

    applyArchetypeCapstone("vanguard", perkMods, gameState);
    applyArchetypeCapstone("gunslinger", perkMods, gameState);
    applyArchetypeCapstone("tempo", perkMods, gameState);

    expect(perkMods.lifesteal).toBeCloseTo(0.03);
    expect(perkMods.critBonus).toBeCloseTo(0.1);
    expect(perkMods.fireRateMult).toBeCloseTo(0.88);
    expect(perkMods.comboTimerMult).toBeCloseTo(1.15);
    expect(perkMods.dashCDMult).toBeCloseTo(0.8);
    expect(perkMods.pickupRange).toBe(36);
    expect(gameState._treeArmorMult).toBeCloseTo(0.92);
    expect(gameState.player.speed).toBeCloseTo(10.8);
  });
});

describe("getPerkSynergyPreview", () => {
  test("returns empty array when no synergy would unlock", () => {
    const result = getPerkSynergyPreview({ id: "iron_gut" }, []);
    expect(result).toEqual([]);
  });

  test("returns synergy when candidate completes a pair", () => {
    const result = getPerkSynergyPreview({ id: "chain_lightning" }, [{ id: "vampire" }]);
    expect(result.some(s => s.name === "⚡🧛 STORM VAMPIRE")).toBe(true);
  });

  test("does not return synergy already active before candidate", () => {
    // vampire + chain_lightning already active → STORM VAMPIRE already fired
    const result = getPerkSynergyPreview(
      { id: "iron_gut" },
      [{ id: "vampire" }, { id: "chain_lightning" }],
    );
    expect(result.some(s => s.name === "⚡🧛 STORM VAMPIRE")).toBe(false);
  });

  test("returns multiple synergies when candidate unlocks several", () => {
    // Eagle eye + penetrator unlocks both DEAD EYE and SNIPER'S MARK
    const result = getPerkSynergyPreview({ id: "penetrator" }, [{ id: "eagle_eye" }]);
    const names = result.map(s => s.name);
    expect(names).toContain("🎯🔫 DEAD EYE");
    expect(names).toContain("🦅 SNIPER'S MARK");
  });

  test("returns empty array for unknown perk id", () => {
    expect(getPerkSynergyPreview({ id: "nonexistent_perk" }, [])).toEqual([]);
  });

  test("returns empty array when candidatePerk is null", () => {
    expect(getPerkSynergyPreview(null, [])).toEqual([]);
  });

  test("does not preview Death's Gambit when only Last Resort is picked (no Dead Man's Hand)", () => {
    const result = getPerkSynergyPreview({ id: "last_resort" }, []);
    expect(result.some(s => s.name === "💀 DEATH'S GAMBIT")).toBe(false);
  });

  test("previews Death's Gambit when Dead Man's Hand is active and Last Resort is the candidate", () => {
    const result = getPerkSynergyPreview({ id: "last_resort" }, [{ id: "dead_mans_hand" }]);
    expect(result.some(s => s.name === "💀 DEATH'S GAMBIT")).toBe(true);
  });
});
