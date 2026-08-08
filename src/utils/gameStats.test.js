import { describe, expect, it } from "vitest";
import { buildPersonalStats, normalizeCommunityStats } from "./gameStats.js";

describe("game statistics contracts", () => {
  it("normalizes aggregate aliases and derives measured accuracy", () => {
    expect(normalizeCommunityStats({ runs: "12", shots: 200, hits: 111, best_score: 5000, runs_24h: 3 })).toMatchObject({
      runs: 12,
      accuracy: 55.5,
      bestScore: 5000,
      runs24h: 3,
    });
  });

  it("labels personal statistics from complete career counters", () => {
    expect(buildPersonalStats({ totalRuns: 2, totalPlayTime: 5400, totalKills: 40, totalShots: 80, totalHits: 20, bestWave: 8 }, [{}, {}])).toMatchObject({
      runs: 2,
      hours: 1.5,
      kills: 40,
      accuracy: 25,
      bestWave: 8,
      recentRuns: 2,
    });
  });
});
