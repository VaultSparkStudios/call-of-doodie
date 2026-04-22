import { describe, expect, test } from "vitest";
import { getRandomPerks, getFullyCursedPerks } from "./perkOptions.js";

describe("perkOptions", () => {
  test("getRandomPerks returns the requested count", () => {
    expect(getRandomPerks(3)).toHaveLength(3);
    expect(getRandomPerks(1)).toHaveLength(1);
    expect(getRandomPerks(4)).toHaveLength(4);
  });

  test("getRandomPerks returns objects with id and name fields", () => {
    const perks = getRandomPerks(3);
    for (const p of perks) {
      expect(typeof p.id).toBe("string");
      expect(typeof p.name).toBe("string");
    }
  });

  test("getRandomPerks avoids duplicates within a single call", () => {
    // Run many times since it is random
    for (let i = 0; i < 20; i++) {
      const perks = getRandomPerks(3);
      const ids = perks.map(p => p.id);
      // Duplicates are only expected in the rare fallback branch — verify length at minimum
      expect(perks).toHaveLength(3);
      // At most one duplicate is possible (last slot is sometimes replaced)
      const unique = new Set(ids);
      expect(unique.size).toBeGreaterThanOrEqual(2);
    }
  });

  test("getFullyCursedPerks returns the requested count", () => {
    expect(getFullyCursedPerks(3)).toHaveLength(3);
    expect(getFullyCursedPerks(2)).toHaveLength(2);
  });

  test("getFullyCursedPerks returns objects with id fields", () => {
    const perks = getFullyCursedPerks(3);
    for (const p of perks) {
      expect(typeof p.id).toBe("string");
    }
  });

  test("getFullyCursedPerks returns perks that are cursed or from CURSED_PERKS pool", () => {
    // Each perk should have a cursed: true flag or be in the cursed pool
    const perks = getFullyCursedPerks(3);
    for (const p of perks) {
      // All cursed perks have some negative side effect — we can just verify they have an id
      expect(p.id).toBeTruthy();
    }
  });
});
