import { describe, expect, it } from "vitest";
import { getWeeklyGauntlet, WEAPONS } from "./constants.js";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const EPOCH = Date.parse("2024-01-01T00:00:00Z");

describe("weekly gauntlet contract", () => {
  it("is stable within a week and rotates exactly at the UTC boundary", () => {
    const a = getWeeklyGauntlet(EPOCH + WEEK_MS * 20);
    const b = getWeeklyGauntlet(EPOCH + WEEK_MS * 21 - 1);
    const c = getWeeklyGauntlet(EPOCH + WEEK_MS * 21);
    expect(b).toEqual(a);
    expect(c.weekNum).toBe(a.weekNum + 1);
    expect(c.seed).not.toBe(a.seed);
  });

  it("always chooses from the live open-arsenal cardinality", () => {
    for (let week = 0; week < 520; week += 1) {
      const challenge = getWeeklyGauntlet(EPOCH + WEEK_MS * week);
      expect(challenge.weaponIdx).toBeGreaterThanOrEqual(0);
      expect(challenge.weaponIdx).toBeLessThan(WEAPONS.length);
      expect(WEAPONS[challenge.weaponIdx]).toBeTruthy();
    }
  });
});
