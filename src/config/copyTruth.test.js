// copyTruth.test.js — regression court for player-facing numbers that must
// match the code producing them. Each case asserts BEHAVIOR (what the apply
// function actually does), not that a string equals itself.
// S177 adds desc-derivation cases: pick the perk, derive the expected label
// from the real output, and assert the desc contains it — so a balance change
// that forgets to update desc fails here before it reaches players.
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { PERKS, WEEKLY_THEMES, TIPS } from "../constants.js";
import { applyPerkSynergies } from "../systems/perkResolution.js";
import { BUILD_ARCHETYPES } from "../utils/buildArchetypes.js";

// ── helpers ──────────────────────────────────────────────────────────────────
// Convert a multiplier (e.g. 1.50) to the "+50%" label used in perk descs.
const multToPct = (m) => `+${Math.round((m - 1) * 100)}%`;

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
  const app = fs.readFileSync(path.resolve("src/App.jsx"), "utf8");

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

describe("S177 copy derivation — perk desc numbers derive from apply behavior", () => {
  // Each test picks the perk alone (no synergy partner), reads the actual
  // output from the apply function, converts it to the label format used in
  // descs, and asserts the desc contains that label.  A balance change that
  // edits the multiplier but forgets the desc will fail here.

  it("magnetism base mult: desc states the actual pick-alone range factor", () => {
    const rangeFactor = pick(["magnetism"]).pickupRange / 30; // 30 = default range
    expect(perk("magnetism").desc).toContain(`${rangeFactor}×`);
  });

  it("hoarder range mult: desc percentage matches pick-alone range output", () => {
    const rangeMult = pick(["hoarder"]).pickupRange / 30;
    expect(perk("hoarder").desc).toContain(multToPct(rangeMult));
  });

  it("hoarder ammo drop: desc percentage matches pick-alone ammo-drop output", () => {
    const dropMult = pick(["hoarder"]).ammoDropMult;
    expect(perk("hoarder").desc).toContain(multToPct(dropMult));
  });

  it("deep_pockets ammo mult: desc percentage matches pick-alone ammo output", () => {
    const ammoMult = pick(["deep_pockets"]).ammoMult;
    expect(perk("deep_pockets").desc).toContain(multToPct(ammoMult));
  });

  it("bullet_hose ammo mult: desc percentage matches pick-alone ammo output", () => {
    const ammoMult = pick(["bullet_hose"]).ammoMult;
    expect(perk("bullet_hose").desc).toContain(multToPct(ammoMult));
  });

  it("bullet_hose restore mult: desc percentage matches pick-alone restore output", () => {
    const restoreMult = pick(["bullet_hose"]).ammoRestoreMult;
    expect(perk("bullet_hose").desc).toContain(multToPct(restoreMult));
  });

  it("bullet_hose synergy claim matches FULL ARMORY actual bonus", () => {
    // The Bullet Hose desc claims a "+X% more ammo" synergy with Deep Pockets.
    // Verify that claim equals the real FULL ARMORY multiplier applied by
    // perkResolution.js (not a literal typed separately).
    const withoutSynergy =
      pick(["bullet_hose"]).ammoMult * pick(["deep_pockets"]).ammoMult;
    const withSynergy = pick(["bullet_hose", "deep_pockets"]).ammoMult;
    const synergyLabel = multToPct(withSynergy / withoutSynergy);
    expect(perk("bullet_hose").desc).toContain(synergyLabel);
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
