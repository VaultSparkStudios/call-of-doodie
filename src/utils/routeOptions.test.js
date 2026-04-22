import { describe, expect, test } from "vitest";
import { getRouteOptions } from "./routeOptions.js";

describe("routeOptions", () => {
  test("always includes the standard route as first option", () => {
    const gs = { currentWave: 1 };
    const options = getRouteOptions(gs);
    expect(options[0].id).toBe("standard");
  });

  test("returns exactly 3 routes", () => {
    for (const wave of [1, 2, 5, 8, 10]) {
      const options = getRouteOptions({ currentWave: wave });
      expect(options).toHaveLength(3);
    }
  });

  test("excludes boss_fork when next wave is already a boss wave", () => {
    // Wave 4 → next is wave 5 (boss wave, 5 % 5 === 0)
    const options = getRouteOptions({ currentWave: 4 });
    expect(options.some(o => o.id === "boss_fork")).toBe(false);
  });

  test("can include boss_fork when next wave is not a boss wave", () => {
    // Run many times to get past the random shuffle
    const hasBossFork = Array.from({ length: 30 }).some(() => {
      const opts = getRouteOptions({ currentWave: 1 });
      return opts.some(o => o.id === "boss_fork");
    });
    expect(hasBossFork).toBe(true);
  });

  test("never returns duplicate route ids", () => {
    for (let i = 0; i < 20; i++) {
      const options = getRouteOptions({ currentWave: 2 });
      const ids = options.map(o => o.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });
});
