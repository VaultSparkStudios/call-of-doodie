// copyTruth.test.js — S176 regression court for player-facing numbers that
// disagreed with the code producing them. Each case asserts BEHAVIOR (what the
// apply function actually does), not that a string equals itself.
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { PERKS, WEEKLY_THEMES, TIPS } from "../constants.js";
import { applyPerkSynergies } from "../systems/perkResolution.js";
import { BUILD_ARCHETYPES } from "../utils/buildArchetypes.js";

const app = fs.readFileSync(path.resolve("src/App.jsx"), "utf8");

const perk = (id) => {
  const found = PERKS.find((p) => p.id === id);
  if (!found) throw new Error(`perk ${id} missing`);
  return found;
};
const pick = (ids) => {
  const mods = {};
  for (const id of ids) {
    perk(id).apply(mods, null);
    applyPerkSynergies(mods);
  }
  return mods;
};

describe("S176 copy truth — perk synergies are order-independent and match their copy", () => {
  it("Magnetism + Hoarder total exactly 5× pickup range in either pick order", () => {
    expect(pick(["magnetism", "hoarder"]).pickupRange).toBeCloseTo(30 * 5, 6);
    expect(pick(["hoarder", "magnetism"]).pickupRange).toBeCloseTo(30 * 5, 6);
    expect(perk("magnetism").desc).toMatch(/5× range with Hoarder/);
  });

  it("each pickup perk alone still does what its copy says", () => {
    expect(pick(["magnetism"]).pickupRange).toBeCloseTo(60, 6);
    expect(pick(["hoarder"]).pickupRange).toBeCloseTo(54, 6);
  });

  it("Bullet Hose + Deep Pockets add exactly +50% more ammo in either order (no double-apply)", () => {
    const alone = pick(["bullet_hose"]).ammoMult * pick(["deep_pockets"]).ammoMult;
    expect(pick(["bullet_hose", "deep_pockets"]).ammoMult).toBeCloseTo(alone * 1.5, 6);
    expect(pick(["deep_pockets", "bullet_hose"]).ammoMult).toBeCloseTo(alone * 1.5, 6);
  });
});

describe("S176 copy truth — runtime wiring in App.jsx", () => {
  it("Hair Trigger (+10% fire rate) shortens the shot gap — fireRateMult below 1", () => {
    const line = app.split("\n").find((l) => l.includes('_treeUnlocked.has("off2")'));
    const factor = Number(/\*\s*([\d.]+)\s*;/.exec(line)?.[1]);
    expect(factor).toBeGreaterThan(0);
    expect(factor).toBeLessThan(1);
  });

  it("starter loadouts do not overwrite the purchased Speedster multiplier", () => {
    expect(app).not.toMatch(/player\.speed = (3\.2|5\.4);/);
  });
});

// S177: lock every numeric PERK claim against its apply function.
// "+X% fire rate" = shot-gap multiplier (1 - X/100) — the rate of shots, not a shots/sec ratio.
// Perks that only affect gs (adrenaline, iron_gut, turbo_boots speed/duration, glass_mind HP, cursed HP)
// need a live game-state object; those are tested via playtest, not this court.
describe("S177 copy truth — every numeric PERK effect matches its desc", () => {
  it("hollow_points adds exactly 25% bullet damage", () => {
    expect(pick(["hollow_points"]).damageMult).toBeCloseTo(1.25, 6);
  });

  it("eagle_eye adds exactly 10% crit chance (no synergy triggered alone)", () => {
    expect(pick(["eagle_eye"]).critBonus).toBeCloseTo(0.10, 6);
  });

  it("fast_learner multiplies XP gain by exactly 1.30 (+30%)", () => {
    expect(pick(["fast_learner"]).xpMult).toBeCloseTo(1.30, 6);
  });

  it("grenadier reduces grenade CD by exactly 35% (factor 0.65)", () => {
    expect(pick(["grenadier"]).grenadeCDMult).toBeCloseTo(0.65, 6);
  });

  it("parkour_pro reduces dash CD by exactly 40% (factor 0.60)", () => {
    expect(pick(["parkour_pro"]).dashCDMult).toBeCloseTo(0.60, 6);
  });

  it("vampire adds exactly 8% lifesteal", () => {
    expect(pick(["vampire"]).lifesteal).toBeCloseTo(0.08, 6);
  });

  it("deep_pockets multiplies ammo capacity by exactly 1.50 (+50%)", () => {
    expect(pick(["deep_pockets"]).ammoMult).toBeCloseTo(1.50, 6);
  });

  it("combo_master multiplies combo window by exactly 1.50 (+50%)", () => {
    expect(pick(["combo_master"]).comboTimerMult).toBeCloseTo(1.50, 6);
  });

  it("penetrator adds exactly 1 pierce", () => {
    expect(pick(["penetrator"]).pierce).toBe(1);
  });

  it("bloodlust adds exactly 30% damage (no Vampire synergy alone)", () => {
    expect(pick(["bloodlust"]).damageMult).toBeCloseTo(1.30, 6);
  });

  it("turbo_boots reduces dash CD by exactly 30% (factor 0.70)", () => {
    expect(pick(["turbo_boots"]).dashCDMult).toBeCloseTo(0.70, 6);
  });

  it("tungsten_rounds adds exactly 20% damage and 1 pierce", () => {
    const m = pick(["tungsten_rounds"]);
    expect(m.damageMult).toBeCloseTo(1.20, 6);
    expect(m.pierce).toBe(1);
  });

  it("overclocked: shot-gap factor < 1 (fire rate up) and damage factor exactly 0.85 (-15%)", () => {
    const m = pick(["overclocked"]);
    expect(m.fireRateMult).toBeLessThan(1);
    expect(m.fireRateMult).toBeCloseTo(0.65, 6); // 0.65 gap = +35% fire rate
    expect(m.damageMult).toBeCloseTo(0.85, 6);
  });

  it("scavenger: ammo drop rate up 40% (1.40), ammo restore up 30% (1.30)", () => {
    const m = pick(["scavenger"]);
    expect(m.ammoDropMult).toBeCloseTo(1.40, 6);
    expect(m.ammoRestoreMult).toBeCloseTo(1.30, 6);
  });

  it("combo_lifesteal: exactly 6% lifesteal and 60% combo window boost", () => {
    const m = pick(["combo_lifesteal"]);
    expect(m.lifesteal).toBeCloseTo(0.06, 6);
    expect(m.comboTimerMult).toBeCloseTo(1.60, 6);
  });

  it("overdrive: shot-gap factor < 1 (fire rate up) and exactly +10% damage", () => {
    const m = pick(["overdrive"]);
    expect(m.fireRateMult).toBeLessThan(1);
    expect(m.fireRateMult).toBeCloseTo(0.60, 6); // 0.60 gap = +40% fire rate
    expect(m.damageMult).toBeCloseTo(1.10, 6);
  });

  it("hoarder alone: +80% pickup range (factor 1.80) and +50% ammo drops", () => {
    const m = pick(["hoarder"]);
    expect(m.pickupRange).toBeCloseTo(30 * 1.80, 6);
    expect(m.ammoDropMult).toBeCloseTo(1.50, 6);
  });

  it("glass_mind adds exactly +80% XP gain", () => {
    expect(pick(["glass_mind"]).xpMult).toBeCloseTo(1.80, 6);
  });

  it("bullet_hose: exactly doubles ammo capacity and adds +40% ammo restore", () => {
    const m = pick(["bullet_hose"]);
    expect(m.ammoMult).toBeCloseTo(2.0, 6);
    expect(m.ammoRestoreMult).toBeCloseTo(1.40, 6);
  });

  it("crit_cascade adds exactly 12% crit chance (no synergy alone)", () => {
    expect(pick(["crit_cascade"]).critBonus).toBeCloseTo(0.12, 6);
  });

  it("grenade_chain: halves grenade CD (0.50) and adds exactly 25% grenade damage", () => {
    const m = pick(["grenade_chain"]);
    expect(m.grenadeCDMult).toBeCloseTo(0.50, 6);
    expect(m.grenadeDamageMult).toBeCloseTo(1.25, 6);
  });
});

describe("S177 copy truth — META_TREE nodes apply their stated numbers (App.jsx source)", () => {
  it("off1 (+5% bullet damage) uses factor > 1 and exactly 1.05", () => {
    const line = app.split("\n").find((l) => l.includes('_treeUnlocked.has("off1")'));
    const factor = Number(/\*\s*([\d.]+)\s*;/.exec(line)?.[1]);
    expect(factor).toBeGreaterThan(1);
    expect(factor).toBeCloseTo(1.05, 6);
  });

  it("off3 (+8% crit chance) adds a positive value of exactly 0.08", () => {
    const line = app.split("\n").find((l) => l.includes('_treeUnlocked.has("off3")'));
    const addend = Number(/\+\s*([\d.]+)\s*;/.exec(line)?.[1]);
    expect(addend).toBeGreaterThan(0);
    expect(addend).toBeCloseTo(0.08, 6);
  });

  it("def1 (+20 max HP at run start) uses += 20", () => {
    const line = app.split("\n").find((l) => l.includes('_treeUnlocked.has("def1")'));
    expect(line).toMatch(/\+=\s*20/);
  });

  it("def2 (-8% incoming damage) stores a reduction factor < 1 and exactly 0.92", () => {
    const line = app.split("\n").find((l) => l.includes('_treeUnlocked.has("def2")'));
    const factor = Number(/_treeArmorMult\s*=\s*([\d.]+)/.exec(line)?.[1]);
    expect(factor).toBeLessThan(1);
    expect(factor).toBeCloseTo(0.92, 6);
  });

  it("def3 (Heal 6 HP on wave clear) stores exactly 6", () => {
    const line = app.split("\n").find((l) => l.includes('_treeUnlocked.has("def3")'));
    const hp = Number(/_treeWaveHeal\s*=\s*(\d+)/.exec(line)?.[1]);
    expect(hp).toBe(6);
  });

  it("util1 (+20% ammo capacity) uses factor > 1 and exactly 1.20", () => {
    const line = app.split("\n").find((l) => l.includes('_treeUnlocked.has("util1")'));
    const factor = Number(/\*\s*([\d.]+)\s*;/.exec(line)?.[1]);
    expect(factor).toBeGreaterThan(1);
    expect(factor).toBeCloseTo(1.20, 6);
  });

  it("util2 (+25% XP gain) uses factor > 1 and exactly 1.25", () => {
    const line = app.split("\n").find((l) => l.includes('_treeUnlocked.has("util2")'));
    const factor = Number(/\*\s*([\d.]+)\s*;/.exec(line)?.[1]);
    expect(factor).toBeGreaterThan(1);
    expect(factor).toBeCloseTo(1.25, 6);
  });

  it("util3 (+30% coin drops) stores exactly 1.30", () => {
    const line = app.split("\n").find((l) => l.includes('_treeUnlocked.has("util3")'));
    const factor = Number(/_treeCoinBonus\s*=\s*([\d.]+)/.exec(line)?.[1]);
    expect(factor).toBeCloseTo(1.30, 6);
  });

  it("cha1 (weekly mutation +25%) stores exactly 1.25", () => {
    const line = app.split("\n").find((l) => l.includes('_treeUnlocked.has("cha1")'));
    const factor = Number(/_treeMutBoost\s*=\s*([\d.]+)/.exec(line)?.[1]);
    expect(factor).toBeCloseTo(1.25, 6);
  });

  it("cha2 (+40% Doodie Coin drops) uses factor > 1 and exactly 1.40", () => {
    const line = app.split("\n").find((l) => l.includes('_treeUnlocked.has("cha2")'));
    const factor = Number(/\*\s*([\d.]+)\s*;/.exec(line)?.[1]);
    expect(factor).toBeGreaterThan(1);
    expect(factor).toBeCloseTo(1.40, 6);
  });
});

describe("S176 copy truth — copy claims nothing the code does not do", () => {
  it("forged doctrines claim no stat effect (forging applies none; it records to the archive)", () => {
    for (const a of BUILD_ARCHETYPES) expect(a.doctrineDesc).not.toMatch(/[+−-]?\d+%|twice/);
  });

  it("no tip or control copy maps key 5 to grenades (key 5 selects weapon 5)", () => {
    expect(TIPS.join("\n")).not.toMatch(/Press 5 for grenade/);
    const panels = fs.readFileSync(path.resolve("src/components/MenuPanels.jsx"), "utf8");
    expect(panels).not.toMatch(/5 \/ Q \/ G/);
  });

  it("weekly themes quote their real multipliers", () => {
    const byId = Object.fromEntries(WEEKLY_THEMES.map((t) => [t.id, t]));
    expect(byId.retro_wave.statOverrides.waveEnemyMult).toBe(1.8);
    expect(byId.retro_wave.themeDesc).toMatch(/80% bigger/);
    expect(byId.rush_hour.statOverrides.mutEnemySpeedExtra).toBe(1.3);
    expect(byId.rush_hour.themeDesc).toMatch(/30% faster/);
    expect(byId.rush_hour.themeDesc).not.toMatch(/doubles/);
    expect(byId.corporate_uprising.themeDesc).not.toMatch(/twice as often/);
  });
});
