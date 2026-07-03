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
      runSeed: 4242,
    });

    expect(result.verdict).toBe("promising run");
    expect(result.identity).toContain("specialist");
    expect(result.actions.some(action => action.includes("Replay the same seed"))).toBe(true);
    expect(result.rematchPlan[0]).toContain("Replay seed");
    expect(result.missedValue.some(item => item.includes("Daily mission"))).toBe(true);
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
    expect(result.collapseReason).toContain("disciplined finish");
  });
  test("builds a measurable next-run contract for unused tempo tools", () => {
    const result = buildRunDebrief({
      score: 32000,
      kills: 130,
      wave: 16,
      bestStreak: 31,
      timeSurvived: 410,
      crits: 30,
      grenades: 0,
      weaponKills: [20, 18, 16],
      runSeed: 777,
    });

    expect(result.nextRunContract).toMatchObject({
      id: "tempo_tool_contract",
      focus: "Spend cooldowns on purpose",
    });
    expect(result.nextRunContract.target).toContain("Replay seed #777");
    expect(result.nextRunContract.proof).toContain("unused-grenade death");
  });

  test("prioritizes rival score contracts before generic build advice", () => {
    const result = buildRunDebrief({
      score: 18000,
      kills: 90,
      wave: 11,
      bestStreak: 12,
      timeSurvived: 280,
      crits: 7,
      grenades: 0,
      weaponKills: [65, 5, 0],
      vsScore: 26000,
      runSeed: 9001,
    });

    expect(result.nextRunContract).toMatchObject({
      id: "rival_score_contract",
      focus: "Beat the rival ghost",
    });
    expect(result.nextRunContract.target).toContain("8,000 point gap");
  });
});
