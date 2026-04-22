import { describe, expect, test } from "vitest";
import { buildFeaturedSeeds, buildGhostBoard, buildWeeklyContract, summarizeRivalryHistory } from "./socialRetention.js";

describe("socialRetention", () => {
  test("summarizes rivalry wins, losses, and unresolved entries", () => {
    const summary = summarizeRivalryHistory([
      { seed: 11, won: true, delta: 500 },
      { seed: 12, won: false, delta: -700 },
      { seed: 13, won: true, delta: 900 },
    ]);
    expect(summary.wins).toBe(2);
    expect(summary.losses).toBe(1);
    expect(summary.unresolved.seed).toBe(12);
    expect(summary.bestWin.seed).toBe(13);
    expect(summary.worstLoss.seed).toBe(12);
  });

  test("builds a revenge contract when an unresolved rivalry exists", () => {
    const contract = buildWeeklyContract([], [{ seed: 88, won: false, delta: -4200 }], []);
    expect(contract.id).toBe("revenge_contract");
    expect(contract.detail).toContain("seed #88");
  });

  test("creates featured seeds and ghost boards from seeded run history", () => {
    const runHistory = [
      { runSeed: 44, score: 14000, wave: 8 },
      { runSeed: 51, score: 19000, wave: 10 },
      { runSeed: 99, score: 12000, wave: 7 },
    ];
    const featured = buildFeaturedSeeds(runHistory, []);
    const ghostBoard = buildGhostBoard(runHistory, [{ seed: 44, won: false }]);
    expect(featured.length).toBeGreaterThan(0);
    expect(featured[0].seed).toBe(51);
    expect(ghostBoard[0].title).toBe("Rival Ghost");
  });
});
