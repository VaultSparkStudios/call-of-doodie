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

  it("normalizes explicit all-history coverage without inventing unavailable legacy detail", () => {
    const stats = normalizeCommunityStats({
      runs: 12,
      coverage: {
        history: "all_available_server_history",
        richRuns: "2",
        legacyRuns: "10",
        accuracyRuns: "2",
        unknownLegacyMetrics: ["shots", "hits"],
        unrecoverablePreTelemetryRuns: "not_measurable",
      },
    });
    expect(stats.coverage).toEqual(expect.objectContaining({
      history: "all_available_server_history",
      richRuns: 2,
      legacyRuns: 10,
      accuracyRuns: 2,
      unknownLegacyMetrics: ["shots", "hits"],
      unrecoverablePreTelemetryRuns: "not_measurable",
    }));
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
