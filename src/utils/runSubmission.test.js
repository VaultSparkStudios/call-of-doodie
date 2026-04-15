import { describe, expect, test } from "vitest";
import { buildLeaderboardEntry, buildRunClaim } from "./runSubmission.js";

describe("runSubmission", () => {
  test("normalizes the standard run claim", () => {
    expect(buildRunClaim({
      mode: "standard",
      difficulty: "hard",
      seed: 42,
      starterLoadout: "tank",
    })).toEqual({
      mode: null,
      difficulty: "hard",
      seed: 42,
      starterLoadout: "tank",
    });
  });

  test("builds a leaderboard payload with the signed summary fields", () => {
    const entry = buildLeaderboardEntry({
      username: "Doodie",
      score: 12345,
      kills: 88,
      wave: 12,
      rank: "Noob Potato",
      difficulty: "normal",
      starterLoadout: "cannon",
      mode: "boss_rush",
      runToken: "token-123",
      summarySig: "sig-abc",
    });

    expect(entry.name).toBe("Doodie");
    expect(entry.mode).toBe("boss_rush");
    expect(entry.runToken).toBe("token-123");
    expect(entry.summarySig).toBe("sig-abc");
  });
});
