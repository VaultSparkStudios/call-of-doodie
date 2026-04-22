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
    });
    expect(historyEntry).toMatchObject({
      mode: "cursed",
      runSeed: 2468,
      modifier: "chaos",
      time: 301,
    });

    const events = createDeathStudioEvents({
      score: 9999,
      kills: 55,
      wave: 12,
      difficulty: "normal",
      flags: { cursed: true },
      runSeed: 2468,
    });
    expect(events).toHaveLength(2);
    expect(events[0].type).toBe("weekly_contract_progress");
    expect(events[1].type).toBe("first_death_wave");
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
});
