import { describe, expect, test } from "vitest";
import { applyCoinShopEffect, applyShopOptionEffect, buildWeaponAmmoArray } from "./shopResolution.js";

const WEAPONS = [
  { name: "Pistol", maxAmmo: 12 },
  { name: "Shotgun", maxAmmo: 6 },
];

describe("shopResolution", () => {
  test("builds max ammo arrays from upgrades and ammo multiplier", () => {
    expect(buildWeaponAmmoArray(WEAPONS, [1, 2], 1.5)).toEqual([22, 13]);
  });

  test("applies standard shop effects and bless/curse weapon mods", () => {
    const gameState = {
      player: { health: 60, maxHealth: 100, speed: 10 },
      weaponAmmos: [0, 0],
      ammoCount: 0,
      weaponUpgrades: [0, 0],
      weaponMods: {},
    };
    const perkMods = { ammoMult: 1.2, damageMult: 1 };

    expect(applyShopOptionEffect({
      optionId: "ammo",
      gameState,
      weaponIndex: 1,
      weapons: WEAPONS,
      perkMods,
    }).ammo).toBe(7);

    expect(applyShopOptionEffect({
      optionId: "upgrade",
      gameState,
      weaponIndex: 1,
      weapons: WEAPONS,
      perkMods,
    }).weaponUpgrades).toEqual([0, 1]);

    const bless = applyShopOptionEffect({
      optionId: "bless_1",
      gameState,
      weaponIndex: 1,
      weapons: WEAPONS,
      perkMods,
    });
    expect(bless.floatingText.text).toContain("Shotgun BLESSED");
    expect(gameState.weaponMods[1].blessed).toBe(true);

    const curse = applyShopOptionEffect({
      optionId: "curse_0",
      gameState,
      weaponIndex: 0,
      weapons: WEAPONS,
      perkMods,
    });
    expect(curse.health).toBe(85);
    expect(gameState.weaponMods[0].cursed).toBe(true);
    expect(gameState.player.maxHealth).toBe(150);
  });

  test("applies coin shop effects and returns UI sync hints", () => {
    const gameState = {
      coins: 50,
      score: 0,
      screenShake: 0,
      timeDilationTimer: 0,
      enemies: [{ health: 20, points: 10 }, { health: 30, points: 25 }],
      player: { health: 40, maxHealth: 100 },
      weaponUpgrades: [0, 1],
      weaponAmmos: [0, 0],
      ammoCount: 0,
    };
    const perkMods = { ammoMult: 1 };

    expect(applyCoinShopEffect({
      optionId: "cs_nuke",
      cost: 28,
      gameState,
      weaponIndex: 0,
      weapons: WEAPONS,
      perkMods,
      extraLives: 1,
    })).toMatchObject({
      coins: 22,
      score: 35,
      extraLives: 1,
    });

    const ammo = applyCoinShopEffect({
      optionId: "cs_ammo",
      cost: 10,
      gameState,
      weaponIndex: 1,
      weapons: WEAPONS,
      perkMods,
      extraLives: 1,
    });
    expect(ammo.ammo).toBe(7);

    const life = applyCoinShopEffect({
      optionId: "cs_extralife",
      cost: 5,
      gameState,
      weaponIndex: 0,
      weapons: WEAPONS,
      perkMods,
      extraLives: 1,
    });
    expect(life.extraLives).toBe(2);
  });
});
