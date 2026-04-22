import { describe, expect, test } from "vitest";
import { getShopAdvisory, getAdvisoryColor } from "./shopForecast.js";

function makeGs(overrides = {}) {
  return {
    currentWave: 5,
    player: { health: 70, maxHealth: 100 },
    coins: 20,
    weaponUpgrades: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    weaponAmmos: new Array(12).fill(30),
    enemies: [],
    ...overrides,
  };
}

describe("getShopAdvisory", () => {
  test("returns advisory and urgency for health item at low HP", () => {
    const gs = makeGs({ player: { health: 20, maxHealth: 100 } });
    const { advisory, urgency } = getShopAdvisory({ id: "health" }, gs);
    expect(typeof advisory).toBe("string");
    expect(advisory.length).toBeGreaterThan(0);
    expect(urgency).toBe("high");
  });

  test("health advisory is lower urgency at high HP", () => {
    const gs = makeGs({ player: { health: 90, maxHealth: 100 } });
    const { urgency } = getShopAdvisory({ id: "health" }, gs);
    expect(urgency).toBe("low");
  });

  test("ammo advisory is high urgency when nearly empty", () => {
    const gs = makeGs({ weaponAmmos: [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] });
    const { urgency } = getShopAdvisory({ id: "ammo" }, gs);
    expect(urgency).toBe("high");
  });

  test("upgrade advisory is high urgency at level 0", () => {
    const gs = makeGs({ weaponUpgrades: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] });
    const { urgency } = getShopAdvisory({ id: "upgrade" }, gs, 0);
    expect(urgency).toBe("high");
  });

  test("maxhp advisory is medium urgency in early waves", () => {
    const gs = makeGs({ currentWave: 3 });
    const { urgency } = getShopAdvisory({ id: "maxhp" }, gs);
    expect(urgency).toBe("medium");
  });

  test("maxhp advisory is low urgency in late waves", () => {
    const gs = makeGs({ currentWave: 15 });
    const { urgency } = getShopAdvisory({ id: "maxhp" }, gs);
    expect(urgency).toBe("low");
  });

  test("bless advisory always returns a string", () => {
    const { advisory } = getShopAdvisory({ id: "bless_1" }, makeGs());
    expect(typeof advisory).toBe("string");
    expect(advisory.length).toBeGreaterThan(0);
  });

  test("curse advisory mentions HP trade", () => {
    const { advisory } = getShopAdvisory({ id: "curse_0" }, makeGs());
    expect(advisory.toLowerCase()).toMatch(/hp|health|surviv/);
  });

  test("coin shop: cs_nuke is high urgency with many enemies", () => {
    const gs = makeGs({ enemies: new Array(15).fill({ x: 0, y: 0 }) });
    const { urgency } = getShopAdvisory({ id: "cs_nuke" }, gs);
    expect(urgency).toBe("high");
  });

  test("coin shop: cs_fullhp is high urgency at critically low HP", () => {
    const gs = makeGs({ player: { health: 15, maxHealth: 100 } });
    const { urgency } = getShopAdvisory({ id: "cs_fullhp" }, gs);
    expect(urgency).toBe("high");
  });

  test("coin shop: cs_grenade mentions boss on boss wave", () => {
    const gs = makeGs({ currentWave: 5 }); // wave 5 = boss wave (5 % 5 === 0)
    const { advisory } = getShopAdvisory({ id: "cs_grenade" }, gs);
    expect(advisory.toLowerCase()).toContain("boss");
  });

  test("returns fallback advisory for unknown item id", () => {
    const opt = { id: "unknown_xyz", desc: "mystery item" };
    const { advisory } = getShopAdvisory(opt, makeGs());
    expect(advisory).toBe("mystery item");
  });

  test("handles null gs gracefully", () => {
    expect(() => getShopAdvisory({ id: "health" }, null)).not.toThrow();
    expect(() => getShopAdvisory({ id: "health" }, undefined)).not.toThrow();
  });

  test("handles null option gracefully", () => {
    const { advisory } = getShopAdvisory(null, makeGs());
    expect(advisory).toBe("");
  });
});

describe("getAdvisoryColor", () => {
  test("high urgency returns red", () => {
    expect(getAdvisoryColor("high")).toBe("#FF4444");
  });

  test("medium urgency returns gold", () => {
    expect(getAdvisoryColor("medium")).toBe("#FFD700");
  });

  test("low urgency returns gray", () => {
    expect(getAdvisoryColor("low")).toBe("#888");
  });
});
