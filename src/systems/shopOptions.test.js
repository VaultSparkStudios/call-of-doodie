import { describe, expect, test } from "vitest";
import { getShopOptions, getCoinShopOptions } from "./shopOptions.js";

function makeGs(overrides = {}) {
  return {
    currentWave: 5,
    player: { health: 70, maxHealth: 100, speed: 10 },
    weaponUpgrades: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    weaponMods: {},
    coins: 20,
    ...overrides,
  };
}

describe("shopOptions", () => {
  test("getShopOptions returns exactly 3 options", () => {
    const options = getShopOptions(makeGs(), 0);
    expect(options).toHaveLength(3);
  });

  test("getShopOptions options have required shape fields", () => {
    const options = getShopOptions(makeGs(), 0);
    for (const opt of options) {
      expect(typeof opt.id).toBe("string");
      expect(typeof opt.emoji).toBe("string");
      expect(typeof opt.name).toBe("string");
      expect(typeof opt.desc).toBe("string");
    }
  });

  test("health medkit not offered when player is at full HP", () => {
    const gs = makeGs({ player: { health: 100, maxHealth: 100, speed: 10 } });
    const options = getShopOptions(gs, 0);
    expect(options.some(o => o.id === "health")).toBe(false);
  });

  test("field upgrade not offered when weapon is already at max level (3)", () => {
    const gs = makeGs({ weaponUpgrades: [3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] });
    const options = getShopOptions(gs, 0);
    expect(options.some(o => o.id === "upgrade")).toBe(false);
  });

  test("devil's pact not offered on wave 1–3", () => {
    const gs = makeGs({ currentWave: 2 });
    const options = getShopOptions(gs, 0);
    expect(options.some(o => o.id.startsWith("curse_"))).toBe(false);
  });

  test("getCoinShopOptions returns at least 3 options", () => {
    const options = getCoinShopOptions(makeGs());
    expect(options.length).toBeGreaterThanOrEqual(3);
  });

  test("getCoinShopOptions options have cost as a number", () => {
    const options = getCoinShopOptions(makeGs());
    for (const opt of options) {
      expect(typeof opt.cost).toBe("number");
      expect(opt.cost).toBeGreaterThan(0);
    }
  });

  test("full restore not offered when player is at full HP", () => {
    const gs = makeGs({ player: { health: 100, maxHealth: 100, speed: 10 } });
    const options = getCoinShopOptions(gs);
    expect(options.some(o => o.id === "cs_fullhp")).toBe(false);
  });
});
