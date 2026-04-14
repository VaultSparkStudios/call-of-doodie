import { describe, expect, test } from "vitest";
import { buildRunDebrief } from "./runDebrief.js";

describe("buildRunDebrief", () => {
  test("identifies a dominant weapon specialist and challenge retry guidance", () => {
    const result = buildRunDebrief({
      score: 18000,
      kills: 120,
      wave: 12,
      bestStreak: 14,
      timeSurvived: 305,
      crits: 8,
      grenades: 0,
      weaponKills: [80, 10, 5],
      activePerks: [],
      missionsSummary: [{ completed: false }],
      vsScore: 25000,
    });

    expect(result.verdict).toBe("promising run");
    expect(result.identity).toContain("specialist");
    expect(result.actions.some(action => action.includes("Replay the same seed"))).toBe(true);
  });

  test("recognizes high-momentum score-attack runs", () => {
    const result = buildRunDebrief({
      score: 90000,
      kills: 420,
      wave: 28,
      bestStreak: 62,
      timeSurvived: 540,
      crits: 40,
      grenades: 9,
      weaponKills: [30, 25, 20],
      activePerks: [{ cursed: false }],
      missionsSummary: [{ completed: true }],
      scoreAttackMode: true,
    });

    expect(result.verdict).toBe("breakout run");
    expect(result.identity).toBe("streak chaser");
    expect(result.strengths.some(line => line.includes("Kill-chain discipline"))).toBe(true);
  });
});
