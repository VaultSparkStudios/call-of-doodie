import { describe, expect, test } from "vitest";
import {
  buildMenuIntelligence,
  buildPostRunIntelligence,
  buildRunEventDigest,
  buildStudioGameEvent,
} from "./runIntelligence.js";

describe("runIntelligence", () => {
  test("prioritizes fixed-seed rivalry over generic menu advice", () => {
    const intel = buildMenuIntelligence({
      challenge: { seed: 42, vsScore: 12000 },
      dailyAlreadyPlayed: false,
      todaySeed: 77,
      selectedLoadout: { id: "standard", name: "Standard Issue" },
    });

    expect(intel.focus).toBe("rivalry");
    expect(intel.directive).toContain("seed #42");
    expect(intel.telemetry.targetScore).toBe(12000);
  });

  test("uses unresolved rivalry history when there is no active challenge", () => {
    const intel = buildMenuIntelligence({
      dailyAlreadyPlayed: true,
      todaySeed: 77,
      rivalryHistory: [{ seed: 88, vsScore: 30000, delta: -5000, won: false }],
    });

    expect(intel.focus).toBe("rivalry_rematch");
    expect(intel.directive).toContain("Seed #88");
  });

  test("uses recent run history to recommend survival practice", () => {
    const intel = buildMenuIntelligence({
      dailyAlreadyPlayed: true,
      runHistory: [
        { wave: 5, score: 8000 },
        { wave: 6, score: 9000 },
        { wave: 7, score: 12000 },
      ],
    });

    expect(intel.focus).toBe("early_survival_history");
    expect(intel.recommendation).toContain("stabilizer");
  });

  test("turns weak post-run signals into a concrete drill", () => {
    const intel = buildPostRunIntelligence({
      score: 9000,
      kills: 55,
      wave: 11,
      bestStreak: 7,
      grenades: 2,
      timeSurvived: 180,
    });

    expect(intel.cause).toBe("chain_control");
    expect(intel.drill).toContain("streak");
    expect(intel.callout).toContain("streak");
    expect(intel.telemetry.killsPerMinute).toBe(18);
  });

  test("creates compact trust digest bands instead of raw full run data", () => {
    const digest = buildRunEventDigest({
      mode: "daily_challenge",
      score: 12880,
      kills: 37,
      totalDamage: 92000,
      bestStreak: 22,
      perkCount: 5,
      achievementCount: 3,
    });

    expect(digest.v).toBe(2);
    expect(digest.scoreBand).toBe(2);
    expect(digest.killBand).toBe(3);
    expect(digest.damageBand).toBe(3);
    expect(digest.perkCount).toBe(5);
    expect(digest.timeline).toContain("m:daily_challenge");
  });

  test("normalizes Studio OS event shape", () => {
    const event = buildStudioGameEvent("debrief", { cause: "chain_control" });

    expect(event.schema).toBe("vaultspark.game-event.v1");
    expect(event.game).toBe("call-of-doodie");
    expect(event.type).toBe("debrief");
    expect(event.payload.cause).toBe("chain_control");
  });
});
