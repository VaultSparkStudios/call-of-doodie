import { describe, expect, test } from "vitest";
import { applyArchetypeCapstone, applyPerkSynergies } from "./perkResolution.js";

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

    expect(unlocked.map((entry) => entry.name)).toEqual([
      "🎯🔫 DEAD EYE",
      "⚡ DEATH'S DOOR",
      "🦅 SNIPER'S MARK",
      "🌪️ BLOODCOMBO",
      "💀 DEATH'S GAMBIT",
    ]);
    expect(mods.lifesteal).toBeCloseTo(0.04);
    expect(mods.critBonus).toBeCloseTo(0.18);
    expect(mods.pierce).toBe(2);
    expect(mods.comboVampireMult).toBe(true);
    expect(mods.deadManTripleExplosion).toBe(true);

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
