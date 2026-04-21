import { describe, expect, test } from "vitest";
import { getLevelXpNeeded, getNextPerkLevel, shouldAwardPerkChoice } from "./levelFlow.js";

describe("levelFlow", () => {
  test("ramps xp requirement after the opening levels", () => {
    expect(getLevelXpNeeded(3)).toBe(1500);
    expect(getLevelXpNeeded(8)).toBe(4600);
    expect(getLevelXpNeeded(14)).toBe(9100);
  });

  test("awards perk choices more frequently early than late", () => {
    expect(shouldAwardPerkChoice(3)).toBe(true);
    expect(shouldAwardPerkChoice(6)).toBe(true);
    expect(shouldAwardPerkChoice(10)).toBe(false);
    expect(shouldAwardPerkChoice(12)).toBe(true);
  });

  test("finds the next perk level breakpoint", () => {
    expect(getNextPerkLevel(2)).toBe(3);
    expect(getNextPerkLevel(9)).toBe(12);
    expect(getNextPerkLevel(12)).toBe(15); // cadence: every 3 levels through level 18
  });
});
