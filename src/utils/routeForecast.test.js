import { describe, expect, test } from "vitest";
import { getRouteForecast, getRouteForecastOneliner } from "./routeForecast.js";

function makeGs(overrides = {}) {
  return {
    currentWave: 3,
    player: { health: 70, maxHealth: 100 },
    coins: 20,
    weaponUpgrades: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    ...overrides,
  };
}

function makeRoute(id) {
  const names = {
    standard: "Standard Wave",
    boss_fork: "Boss Gauntlet",
    mutation: "Mutation Wave",
    double_trouble: "Double Trouble",
    elite_surge: "Elite Surge",
    armory_run: "Armory Run",
    blitz: "Blitz",
  };
  return { id, name: names[id] || id, emoji: "?", desc: `${id} desc` };
}

describe("getRouteForecast", () => {
  test("returns headline, tradeoff, tip for every known route id", () => {
    const ids = ["standard", "boss_fork", "mutation", "double_trouble", "elite_surge", "armory_run", "blitz"];
    for (const id of ids) {
      const result = getRouteForecast(makeRoute(id), makeGs());
      expect(typeof result.headline).toBe("string");
      expect(typeof result.tradeoff).toBe("string");
      expect(typeof result.tip).toBe("string");
      expect(result.headline.length).toBeGreaterThan(0);
    }
  });

  test("standard route tip mentions stabilizing when health is low", () => {
    const gs = makeGs({ player: { health: 30, maxHealth: 100 } });
    const result = getRouteForecast(makeRoute("standard"), gs);
    expect(result.tip.toLowerCase()).toContain("wounded");
  });

  test("standard route tip suggests other routes at full health", () => {
    const gs = makeGs({ player: { health: 100, maxHealth: 100 } });
    const result = getRouteForecast(makeRoute("standard"), gs);
    expect(result.tip.toLowerCase()).toMatch(/other routes|better value/);
  });

  test("boss_fork headline includes wave number", () => {
    const gs = makeGs({ currentWave: 6 });
    const result = getRouteForecast(makeRoute("boss_fork"), gs);
    expect(result.headline).toContain("7"); // wave + 1
  });

  test("boss_fork tip varies when boss is already imminent (next wave % 5 === 0)", () => {
    // wave 4 → next is wave 5 (boss)
    const gs = makeGs({ currentWave: 4 });
    const result = getRouteForecast(makeRoute("boss_fork"), gs);
    expect(result.tip.toLowerCase()).toContain("already due");
  });

  test("elite_surge tip warns at low health", () => {
    const gs = makeGs({ player: { health: 40, maxHealth: 100 } });
    const result = getRouteForecast(makeRoute("elite_surge"), gs);
    expect(result.tip.toLowerCase()).toMatch(/low health|risky/);
  });

  test("armory_run tip recommends when weapon not maxed", () => {
    const gs = makeGs({ weaponUpgrades: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] });
    const result = getRouteForecast(makeRoute("armory_run"), gs);
    expect(result.tip.toLowerCase()).toContain("max");
  });

  test("armory_run tip notes diminishing returns when weapon is maxed", () => {
    const gs = makeGs({ weaponUpgrades: [3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] });
    const result = getRouteForecast(makeRoute("armory_run"), gs);
    expect(result.tip.toLowerCase()).toMatch(/maxed|diminishing/);
  });

  test("unknown route falls back to desc", () => {
    const result = getRouteForecast({ id: "unknown_xyz", desc: "mystery route" }, makeGs());
    expect(result.headline).toBe("mystery route");
  });

  test("gracefully handles null/undefined gs", () => {
    expect(() => getRouteForecast(makeRoute("blitz"), null)).not.toThrow();
    expect(() => getRouteForecast(makeRoute("blitz"), undefined)).not.toThrow();
  });
});

describe("getRouteForecastOneliner", () => {
  test("returns a non-empty string for all known routes", () => {
    const ids = ["standard", "boss_fork", "mutation", "double_trouble", "elite_surge", "armory_run", "blitz"];
    for (const id of ids) {
      const result = getRouteForecastOneliner(makeRoute(id), makeGs());
      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
    }
  });

  test("concatenates headline and tip", () => {
    const gs = makeGs({ player: { health: 100, maxHealth: 100 } });
    const result = getRouteForecastOneliner(makeRoute("standard"), gs);
    // Should contain both pieces
    expect(result).toContain("Steady progression");
    expect(result.length).toBeGreaterThan("Steady progression — no surprises.".length);
  });
});
