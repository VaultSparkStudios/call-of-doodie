// Unit tests for pure helper functions in storage.js.
// Functions that touch localStorage or Supabase are excluded — only pure logic is tested here.

import { describe, it, expect } from "vitest";
import { getAccountLevel } from "./storage.js";

// Formula: Math.floor(Math.sqrt(kills / 20)) + 1
// Tier labels: 1-9 gray, 10-24 bronze, 25-49 silver, 50-99 gold, 100+ purple

describe("getAccountLevel", () => {
  it("returns 1 for 0 kills (minimum level)", () => {
    expect(getAccountLevel(0)).toBe(1);
  });

  it("handles null gracefully (treats as 0)", () => {
    expect(getAccountLevel(null)).toBe(1);
  });

  it("handles undefined gracefully (treats as 0)", () => {
    expect(getAccountLevel(undefined)).toBe(1);
  });

  it("returns 2 for 20 kills (floor(sqrt(1)) + 1)", () => {
    expect(getAccountLevel(20)).toBe(2);
  });

  it("returns 2 for 79 kills (floor(sqrt(3.95)) + 1 = 2)", () => {
    expect(getAccountLevel(79)).toBe(2);
  });

  it("returns 3 for 80 kills (floor(sqrt(4)) + 1 = 3)", () => {
    expect(getAccountLevel(80)).toBe(3);
  });

  it("returns correct level for 500 kills", () => {
    // floor(sqrt(500/20)) + 1 = floor(sqrt(25)) + 1 = floor(5) + 1 = 6
    expect(getAccountLevel(500)).toBe(6);
  });

  it("returns correct level for 2000 kills", () => {
    // floor(sqrt(100)) + 1 = 10 + 1 = 11
    expect(getAccountLevel(2000)).toBe(11);
  });

  it("is monotonically non-decreasing with more kills", () => {
    const levels = [0, 20, 80, 180, 320, 500, 720, 980, 1280, 2000].map(getAccountLevel);
    for (let i = 1; i < levels.length; i++) {
      expect(levels[i]).toBeGreaterThanOrEqual(levels[i - 1]);
    }
  });

  it("gold tier threshold: 50 kills needed for level matching sqrt(50/20)", () => {
    // Level 50+ (gold tier) needs kills where floor(sqrt(kills/20)) + 1 >= 50
    // i.e. sqrt(kills/20) >= 49 → kills >= 49*49*20 = 48020
    expect(getAccountLevel(48020)).toBeGreaterThanOrEqual(50);
    expect(getAccountLevel(48019)).toBeLessThan(50);
  });

  it("never returns 0 or negative", () => {
    [0, 1, 5, 10, 100, 10000].forEach(k => {
      expect(getAccountLevel(k)).toBeGreaterThan(0);
    });
  });
});
