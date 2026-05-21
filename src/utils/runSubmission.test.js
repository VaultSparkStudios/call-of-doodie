import { describe, expect, test } from "vitest";
import { encodeReplayCommandTrace } from "./replayCommandTrace.js";
import { buildLeaderboardEntry, buildRunClaim, buildSessionSubmission } from "./runSubmission.js";

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
      eventDigest: { v: 1, scoreBand: 2 },
    });

    expect(entry.name).toBe("Doodie");
    expect(entry.mode).toBe("boss_rush");
    expect(entry.runToken).toBe("token-123");
    expect(entry.summarySig).toBe("sig-abc");
    expect(entry.eventDigest).toEqual({ v: 1, scoreBand: 2 });
  });

  test("builds a session submission through the same normalized leaderboard path", () => {
    const entry = buildSessionSubmission({
      username: "SessionDood",
      score: 20000,
      kills: 101,
      wave: 14,
      difficulty: "hard",
      starterLoadout: "speedster",
      mode: "standard",
      eventDigest: { v: 2, timeline: "m:standard|s:4" },
    });

    expect(entry.name).toBe("SessionDood");
    expect(entry.mode).toBeUndefined();
    expect(entry.eventDigest.v).toBe(2);
  });

  test("adds replay command trace metadata when a trace summary is present", () => {
    const commandTrace = encodeReplayCommandTrace([
      { frame: 60, action: "move", value: "n" },
      { frame: 72, action: "aim", value: "ne" },
      { frame: 66, action: "shoot", value: "w2" },
      { frame: 126, action: "move", value: "e" },
      { frame: 132, action: "dash", value: "e" },
      { frame: 150, action: "shoot", value: "w2" },
    ]);
    const entry = buildSessionSubmission({
      username: "TraceDood",
      score: 30000,
      kills: 120,
      wave: 16,
      commandTrace,
    });

    expect(entry.traceDigest).toBe(commandTrace.digest);
    expect(entry.traceLength).toBe(6);
    expect(entry.traceBody).toBe(commandTrace.body);
    expect(entry.traceEvidence).toMatchObject({
      level: "rich",
      count: 6,
      movementCount: 2,
      shootCount: 2,
    });
  });

  test("does not add replay trace fields for an empty trace", () => {
    const entry = buildSessionSubmission({
      username: "QuietDood",
      score: 10,
      kills: 1,
      wave: 1,
      commandTrace: {
        digest: "",
        count: 0,
      },
    });

    expect(entry.traceDigest).toBeUndefined();
    expect(entry.traceLength).toBeUndefined();
  });

  test("omits malformed replay trace fields before submission", () => {
    const entry = buildSessionSubmission({
      username: "TamperDood",
      score: 10,
      kills: 1,
      wave: 1,
      commandTrace: {
        v: 1,
        bucket: 6,
        digest: "ABCDEF12",
        count: 2,
        body: "a.move.n",
      },
    });

    expect(entry.traceDigest).toBeUndefined();
    expect(entry.traceLength).toBeUndefined();
    expect(entry.traceBody).toBeUndefined();
  });
});
