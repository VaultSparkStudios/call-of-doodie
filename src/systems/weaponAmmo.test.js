import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { CURSED_PERKS, WEAPONS } from "../constants.js";
import { getWeaponAmmoCapacity } from "./weaponAmmo.js";
import { applyCoinShopEffect, applyShopOptionEffect } from "./shopResolution.js";

describe("usable cursed magazines", () => {
  it("keeps every weapon usable under Haste Poison and stacked capacity curses", () => {
    const mods = {};
    CURSED_PERKS.find(p => p.id === "haste_poison").apply(mods);
    expect(getWeaponAmmoCapacity(WEAPONS[1], 0, mods.ammoMult)).toBe(1);
    CURSED_PERKS.find(p => p.id === "tunnel_vision").apply(mods);
    for (const weapon of WEAPONS) {
      for (const upgrade of [0, 1, 2, 3]) {
        expect(getWeaponAmmoCapacity(weapon, upgrade, mods.ammoMult)).toBeGreaterThanOrEqual(1);
      }
    }
    expect(getWeaponAmmoCapacity(WEAPONS[0], 2, 1.5)).toBe(67);
    expect(getWeaponAmmoCapacity(WEAPONS[1])).toBe(3);
  });

  it("both shop refill paths restore a usable Haste Poison RPG magazine", () => {
    for (const kind of ["standard", "coin"]) {
      const gs = { player: { health: 100, maxHealth: 100 }, weaponAmmos: WEAPONS.map(() => 0), ammoCount: 0, weaponUpgrades: [], coins: 20 };
      const args = { gameState: gs, weapons: WEAPONS, weaponIndex: 1, perkMods: { ammoMult: 0.3 } };
      const result = kind === "standard"
        ? applyShopOptionEffect({ ...args, optionId: "ammo" })
        : applyCoinShopEffect({ ...args, optionId: "cs_ammo", cost: 10 });
      expect(result.ammo, kind).toBe(1);
      expect(gs.weaponAmmos[1], kind).toBe(1);
    }
  });

  it("keeps App and shop capacity rounding behind the shared authority", () => {
    for (const file of ["../App.jsx", "./shopResolution.js", "../components/HUD.jsx", "../components/MobileHUD.jsx", "../components/WeaponDock.jsx"]) {
      const source = readFileSync(new URL(file, import.meta.url), "utf8");
      expect(source, file).toContain("getWeaponAmmoCapacity(");
      // An independent maxAmmo × multiplier formula can silently reintroduce zero magazines.
      expect(source, file).not.toMatch(/Math\.floor\([^;\n]*\.maxAmmo/);
    }
  });
});
