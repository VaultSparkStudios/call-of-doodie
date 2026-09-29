import { describe, expect, it } from "vitest";
import { CURSED_PERKS, PERKS } from "../constants.js";
import { applyPerkSynergies } from "../systems/perkResolution.js";
import { deadMansHandDamage } from "../systems/deathFlow.js";
import { PERK_FACTS, shotIntervalForRate } from "./perkFacts.js";

const byId = new Map(PERKS.map(perk => [perk.id, perk]));
const apply = id => {
  const mods = {};
  const gs = { player: { speed: 100, health: 100, maxHealth: 100 } };
  byId.get(id).apply(mods, gs);
  return { mods, gs };
};

describe("ordinary perk promises", () => {
  it("keeps one numeric fact record for every ordinary perk", () => {
    expect(Object.keys(PERK_FACTS).sort()).toEqual([...byId.keys()].sort());
  });

  it.each([
    ["hollow_points", "+25%", "damageMult", 1.25],
    ["eagle_eye", "+10%", "critBonus", 0.10],
    ["fast_learner", "+30%", "xpMult", 1.30],
    ["grenadier", "−35%", "grenadeCDMult", 0.65],
    ["parkour_pro", "−40%", "dashCDMult", 0.60],
    ["vampire", "8%", "lifesteal", 0.08],
    ["deep_pockets", "+50%", "ammoMult", 1.50],
    ["combo_master", "+50%", "comboTimerMult", 1.50],
    ["magnetism", "2×", "pickupRange", 60],
    ["penetrator", "1 extra", "pierce", 1],
    ["bloodlust", "+30%", "damageMult", 1.30],
    ["turbo_boots", "−30%", "dashCDMult", 0.70],
    ["tungsten_rounds", "+20%", "damageMult", 1.20],
    ["scavenger", "40%", "ammoDropMult", 1.40],
    ["combo_lifesteal", "+6%", "lifesteal", 0.06],
    ["hoarder", "+80%", "pickupRange", 54],
    ["glass_mind", "+80%", "xpMult", 1.80],
    ["bullet_hose", "+100%", "ammoMult", 2],
    ["crit_cascade", "+12%", "critBonus", 0.12],
    ["grenade_chain", "−50%", "grenadeCDMult", 0.50],
  ])("%s describes and applies its primary numerical reward", (id, copy, stat, value) => {
    expect(byId.get(id).desc).toContain(copy);
    expect(apply(id).mods[stat]).toBeCloseTo(value);
  });

  it("keeps player-stat perks aligned with their promises", () => {
    expect(byId.get("adrenaline").desc).toContain("+15%");
    expect(apply("adrenaline").gs.player.speed).toBeCloseTo(115);
    expect(byId.get("iron_gut").desc).toContain("+30 max HP");
    expect(apply("iron_gut").gs.player.maxHealth).toBe(130);
    expect(byId.get("glass_mind").desc).toContain("−25 max HP");
    expect(apply("glass_mind").gs.player.maxHealth).toBe(75);
  });

  it.each([
    ["overclocked", 1.35, "+35% fire rate"],
    ["overdrive", 1.40, "+40% fire rate"],
  ])("%s delivers its stated increase in shot cadence", (id, rate, copy) => {
    expect(byId.get(id).desc).toContain(copy);
    expect(apply(id).mods.fireRateMult).toBeCloseTo(shotIntervalForRate(rate));
    expect(1 / apply(id).mods.fireRateMult).toBeCloseTo(rate);
  });

  it("keeps triggered numeric effects tied to their runtime facts", () => {
    expect(byId.get("adrenaline_rush").desc).toContain("30% HP grants 2s");
    expect(apply("adrenaline_rush").mods.adrenalineRush).toBe(true);
    expect(byId.get("chain_lightning").desc).toContain("20% chance to arc to 1 nearby enemy for 50% damage");
    expect(apply("chain_lightning").gs.chainLightning).toBe(true);
    expect(byId.get("dead_mans_hand").desc).toContain("3× with Last Resort");
    expect(apply("dead_mans_hand").gs.deadMansHand).toBe(true);
  });

  it.each([
    ["dead_mans_hand", "last_resort"],
    ["last_resort", "dead_mans_hand"],
  ])("Last Resort and Dead Man's Hand really triple the death blast in either pick order", (first, second) => {
    const mods = {};
    const gs = { player: { health: 100, maxHealth: 100 } };
    for (const id of [first, second]) {
      const perk = byId.get(id) || CURSED_PERKS.find(candidate => candidate.id === id);
      perk.apply(mods, gs);
      applyPerkSynergies(mods);
    }
    expect(gs.deadMansHand).toBe(true);
    expect(mods.deadManTripleExplosion).toBe(true);
    expect(deadMansHandDamage(125, mods.deadManTripleExplosion)).toBe(300);
  });
});
