import { describe, expect, test } from "vitest";
import { getLevelXpNeeded, getNextPerkLevel, shouldAwardPerkChoice } from "./levelFlow.js";

describe("levelFlow", () => {
  test("ramps xp requirement after the opening levels", () => {
    expect(getLevelXpNeeded(3)).toBe(1500);
    expect(getLevelXpNeeded(8)).toBe(4600);
    expect(getLevelXpNeeded(14)).toBe(9100);
  });

  test("limits doctrine awards to four spaced levels across a run", () => {
    expect(Array.from({ length: 100 }, (_, i) => i + 1).filter(shouldAwardPerkChoice)).toEqual([5, 10, 15, 20]);
  });

  test("finds the next perk level breakpoint", () => {
    expect(getNextPerkLevel(2)).toBe(5);
    expect(getNextPerkLevel(9)).toBe(10);
    expect(getNextPerkLevel(12)).toBe(15);
    expect(getNextPerkLevel(20)).toBeNull();
  });
});
