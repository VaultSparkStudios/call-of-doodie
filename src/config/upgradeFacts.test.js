import fs from "node:fs";
import { applyRunSettings, SETTINGS_DEFAULTS } from "../settings.js";
import { describe, expect, it } from "vitest";
import { META_UPGRADES, META_TREE, WEEKLY_MUTATIONS, WEAPONS } from "../constants.js";
import { applyMetaUpgrades, applyMetaTree, finalizeMetaStart, multiplyKillScore, applyWeeklyMutationWithAffinity, consumeGauntletMetaChoice } from "./upgradeFacts.js";
import { getCoinShopOptions } from "../systems/shopOptions.js";
import { applyCoinShopEffect } from "../systems/shopResolution.js";
const state = () => ({ player: { health: 80, maxHealth: 100, speed: 4 }, currentWave: 5, coins: 0, enemies: [], score: 0 });

describe("permanent upgrade promises", () => {
  it.each([1, 2, 3])("applies every purchased tier %i from the advertised numbers", tier => {
    for (const group of META_UPGRADES) {
      const gs = state(), mods = {};
      applyMetaUpgrades(mods, gs, { [group.id]: tier });
      const value = Number(group.tiers[tier - 1].desc.match(/\d+/)[0]);
      const fields = { veteran: "xpMult", deep_mag: "ammoMult", hardened: "damageMult" };
      if (fields[group.id]) expect(mods[fields[group.id]]).toBeCloseTo(1 + value / 100);
      if (group.id === "field_medic") { expect(gs.player.health).toBe(80 + value); expect(gs.player.maxHealth).toBe(100 + value); }
      if (group.id === "swift_boots") expect(mods.dashCDMult).toBeCloseTo(1 - value / 100);
      if (group.id === "grenadier") expect(mods.grenadeCDMult).toBeCloseTo(1 - value / 100);
      if (group.id === "scavenger") expect(mods.pickupRange).toBeCloseTo(30 * (1 + value / 100));
      if (group.id === "crit_master") expect(mods.critBonus).toBeCloseTo(value / 100);
      if (group.id === "vampire_bite") expect(mods.lifesteal).toBeCloseTo(value / 100);
      if (group.id === "speedster") expect(gs.player.speed).toBeCloseTo(4 * (1 + value / 100));
    }
  });
  it("Scavenger II delivers exactly +125%, without truncating the radius", () => {
    const mods = {}; applyMetaUpgrades(mods, state(), { scavenger: 2 });
    expect(mods.pickupRange).toBe(67.5);
  });
  it("unpurchased upgrades leave base state and modifiers intact", () => {
    const gs = state(), original = structuredClone(gs), mods = {};
    applyMetaUpgrades(mods, gs); applyMetaTree(mods, gs, new Set());
    expect(gs).toEqual(original); expect(mods).toEqual({});
  });
  it("tree purchases compound with tier purchases and apply exact shot frequency", () => {
    const gs = state(), mods = {};
    applyMetaUpgrades(mods, gs, { hardened: 3, deep_mag: 3, veteran: 3, crit_master: 3 });
    applyMetaTree(mods, gs, new Set(Object.values(META_TREE).flatMap(b => b.nodes.map(n => n.id))));
    expect(mods.damageMult).toBeCloseTo(1.5 * 1.05);
    expect(mods.ammoMult).toBeCloseTo(2 * 1.2);
    expect(mods.xpMult).toBeCloseTo(1.75 * 1.25);
    expect(mods.critBonus).toBeCloseTo(0.28);
    expect(1 / mods.fireRateMult).toBeCloseTo(1.1);
    expect(gs.player.maxHealth).toBe(120);
    expect(gs._treeArmorMult).toBeCloseTo(0.92);
    expect(gs._treeWaveHeal).toBe(6);
    expect(gs._treeCoinBonus).toBeCloseTo(1.3 * 1.4);
    expect(gs.killScoreMult).toBeUndefined();
    gs.cursedRunMode = true; applyMetaTree({}, gs, new Set(["cha4"]));
    expect(gs.killScoreMult).toBe(2);
  });
});

describe("dormant meta tree effects now reach gameplay", () => {
  const mutation = id => WEEKLY_MUTATIONS.find(m => m.id === id);
  it("Affinity boosts favorable weekly deltas, without multiplying penalties", () => {
    const gs = state();
    applyWeeklyMutationWithAffinity(gs, mutation("speed_bullets"), new Set(["cha1"]));
    expect(gs.mutBulletSpeed).toBe(2.25); expect(gs.mutEnemyProjSpeed).toBe(2);
    applyWeeklyMutationWithAffinity(gs, mutation("zombie_horde"), new Set(["cha1"]));
    expect(gs.mutEnemyHPMult).toBe(0.375); expect(gs.waveEnemyMult).toBe(2);
    applyWeeklyMutationWithAffinity(gs, mutation("freeze_world"), new Set(["cha1"]));
    expect(gs.mutSpawnFrozen).toBe(150);
    applyWeeklyMutationWithAffinity(gs, mutation("jackpot"), new Set(["cha1"]));
    expect(gs.killScoreMult).toBe(3.5); expect(gs._weeklyKillScoreMult).toBe(3.5); expect(gs.mutXpMult).toBe(2.25); expect(gs.mutPickupRate).toBe(3.5);
  });
  it.each(WEEKLY_MUTATIONS)("no Affinity leaves $id unchanged", mutation => {
    const baseline = state(), actual = state(); mutation.apply(baseline);
    applyWeeklyMutationWithAffinity(actual, mutation, new Set());
    if (mutation.id === "jackpot") { expect(actual._weeklyKillScoreMult).toBe(3); baseline._weeklyKillScoreMult = 3; }
    expect(actual).toEqual(baseline);
  });
  it("Supply Drop offers and consumes one free purchase per wave shop", () => {
    const gs = state(); gs._treeFreeShopItem = true;
    const options = getCoinShopOptions(gs, () => 0.2), free = options.filter(o => o.cost === 0);
    expect(free).toHaveLength(1);
    const buy = () => applyCoinShopEffect({ optionId: free[0].id, cost: 0, gameState: gs, weaponIndex: 0, weapons: WEAPONS, perkMods: {}, extraLives: 0 });
    expect(buy()?.coins).toBe(0); expect(buy()).toBeNull();
    expect(getCoinShopOptions(gs, () => 0.2).every(o => o.cost > 0)).toBe(true);
    gs.currentWave++; expect(getCoinShopOptions(gs, () => 0.2).filter(o => o.cost === 0)).toHaveLength(1);
  });
  it("Gauntlet Ready grants one extra choice only to an eligible run", () => {
    const gs = state(); gs._treeGauntletBonusPerk = true;
    expect(consumeGauntletMetaChoice(gs)).toBe(0);
    gs.gauntletMode = true; expect(consumeGauntletMetaChoice(gs)).toBe(1);
    expect(consumeGauntletMetaChoice(gs)).toBe(0);
    expect(consumeGauntletMetaChoice({ gauntletMode: true })).toBe(0);
  });
});


describe("meta bonuses compose through final run initialization", () => {
  it("Double Trouble compounds Jackpot and Pandemonium instead of overwriting either", () => {
    const gs = state(); gs.cursedRunMode = true;
    applyWeeklyMutationWithAffinity(gs, WEEKLY_MUTATIONS.find(m => m.id === "jackpot"), new Set(["cha1"]));
    applyMetaTree({}, gs, new Set(["cha4"]));
    multiplyKillScore(gs, 1.5);
    expect(gs.killScoreMult).toBe(3.5 * 2 * 1.5);
    const ordinary = state(); multiplyKillScore(ordinary, 1.5);
    expect(ordinary.killScoreMult).toBe(1.5);
  });
  it("Kill Frenzy captures the final speed including loadout, run modifier, and settings", () => {
    const gs = state();
    applyMetaUpgrades({}, gs, { speedster: 3 });
    applyMetaTree({}, gs, new Set(["off4"]));
    gs.player.speed = 5.4 * 1.38; // Speed Freak starter retains purchased Speedster.
    gs.player.speed *= 1.15; // Lightweight run modifier.
    applyRunSettings(gs, { ...SETTINGS_DEFAULTS, playerSpeedMult: 1.5 });
    finalizeMetaStart(gs);
    expect(gs._killFrenzyBaseSpeed).toBeCloseTo(5.4 * 1.38 * 1.15 * 1.5);
    const app = fs.readFileSync("src/App.jsx", "utf8");
    const initialization = app.slice(0, app.indexOf("    return seed;"));
    expect(initialization.indexOf("finalizeMetaStart(gsRef.current)")).toBeGreaterThan(initialization.indexOf("applyRunSettings(gsRef.current, sett)"));
    expect(initialization).toContain("multiplyKillScore(gsRef.current, 1.5)");
  });
});
