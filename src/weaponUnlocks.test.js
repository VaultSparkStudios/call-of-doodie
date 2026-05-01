import { describe, it, expect } from "vitest";
import { WEAPONS, WEAPON_UNLOCK_LEVELS, isWeaponUnlocked } from "./constants.js";

describe("weapon unlocks", () => {
  it("WEAPON_UNLOCK_LEVELS covers every weapon", () => {
    expect(WEAPON_UNLOCK_LEVELS.length).toBe(WEAPONS.length);
  });

  it("first three weapons are unlocked from level 1", () => {
    expect(isWeaponUnlocked(0, 1)).toBe(true);
    expect(isWeaponUnlocked(1, 1)).toBe(true);
    expect(isWeaponUnlocked(2, 1)).toBe(true);
  });

  it("late-game weapons are locked at low account levels", () => {
    const lastIdx = WEAPONS.length - 1;
    expect(isWeaponUnlocked(lastIdx, 1)).toBe(false);
    expect(isWeaponUnlocked(lastIdx, 5)).toBe(false);
  });

  it("unlocks at the threshold level and above", () => {
    const idx = 6;
    const threshold = WEAPON_UNLOCK_LEVELS[idx];
    expect(isWeaponUnlocked(idx, threshold - 1)).toBe(false);
    expect(isWeaponUnlocked(idx, threshold)).toBe(true);
    expect(isWeaponUnlocked(idx, threshold + 5)).toBe(true);
  });

  it("treats missing/zero account level as level 1", () => {
    expect(isWeaponUnlocked(0, undefined)).toBe(true);
    expect(isWeaponUnlocked(0, 0)).toBe(true);
  });

  it("unlock thresholds are non-decreasing", () => {
    for (let i = 1; i < WEAPON_UNLOCK_LEVELS.length; i++) {
      expect(WEAPON_UNLOCK_LEVELS[i]).toBeGreaterThanOrEqual(WEAPON_UNLOCK_LEVELS[i - 1]);
    }
  });
});
