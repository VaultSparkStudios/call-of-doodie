import { describe, expect, it } from "vitest";
import {
  createDeathStudioEvents,
  createRunHistoryEntry,
  createRunStartArtifacts,
  createScoreSubmitStudioEvents,
  resolveRunModeFromFlags,
} from "./runSession.js";

describe("runSession", () => {
  it("resolves the active run mode from flags", () => {
    expect(resolveRunModeFromFlags({ bossRush: true })).toBe("boss_rush");
    expect(resolveRunModeFromFlags({ dailyChallenge: true })).toBe("daily_challenge");
    expect(resolveRunModeFromFlags({})).toBe("standard");
  });

  it("builds run start artifacts with a canonical mode", () => {
    const result = createRunStartArtifacts({
      difficulty: "hard",
      starterLoadout: "tank",
      seed: 77,
      flags: { scoreAttack: true },
    });
    expect(result.mode).toBe("score_attack");
    expect(result.runClaim).toMatchObject({ mode: "score_attack", difficulty: "hard", seed: 77, starterLoadout: "tank" });
  });

  it("builds replay-safe run history entries and death events", () => {
    const historyEntry = createRunHistoryEntry({
      score: 9999,
      kills: 55,
      wave: 12,
      timeSeconds: 301,
      difficulty: "normal",
      flags: { cursed: true },
      runSeed: 2468,
      modifier: "chaos",
      traceEvidence: { level: "rich", count: 7, durationFrames: 96, weaknessReasons: [] },
      traceReceipt: { status: "verified", label: "Replay Proof Ready", score: 92, level: "rich" },
    });
    expect(historyEntry).toMatchObject({
      mode: "cursed",
      runSeed: 2468,
      modifier: "chaos",
      time: 301,
      traceReceipt: { status: "verified", score: 92 },
      traceEvidence: { level: "rich", count: 7 },
    });

    const events = createDeathStudioEvents({
      score: 9999,
      kills: 55,
      wave: 12,
      difficulty: "normal",
      flags: { cursed: true },
      runSeed: 2468,
    });
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("first_death_wave");
    expect(events[0].payload).toMatchObject({
      mode: "cursed",
      difficulty: "normal",
      wave: 12,
      score: 9999,
      kills: 55,
    });
  });

  it("includes rejection metadata when score submission is rejected", () => {
    const result = createScoreSubmitStudioEvents({
      difficulty: "hard",
      score: 123456,
      wave: 22,
      runSeed: 2468,
      flags: { bossRush: true },
      globalRank: null,
      result: {
        submission: "rejected",
        rejectionReason: "Digest mismatch",
        rejectionReasons: ["digest_timeline"],
      },
      eventDigest: { v: 2 },
    });
    expect(result.mode).toBe("boss_rush");
    expect(result.events).toHaveLength(2);
    expect(result.events[1].payload.reason).toBe("Digest mismatch");
  });

  it("carries replay trace evidence into score submission events", () => {
    const result = createScoreSubmitStudioEvents({
      difficulty: "normal",
      score: 50000,
      wave: 18,
      runSeed: 99,
      result: { submission: "online" },
      traceEvidence: {
        level: "basic",
        count: 5,
        durationFrames: 84,
        weaknessReasons: ["low-movement-evidence"],
      },
    });

    expect(result.events[0].payload.traceEvidence).toMatchObject({
      level: "basic",
      count: 5,
      weaknessReasons: ["low-movement-evidence"],
    });
  });
});
