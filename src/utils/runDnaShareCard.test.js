import { describe, expect, test } from "vitest";
import { buildRunDnaSharePayload, computeWavePercentile } from "./runDnaShareCard.js";

describe("runDnaShareCard", () => {
  test("computes community wave percentile from cached leaderboard rows", () => {
    const leaderboard = [
      { wave: 2 },
      { wave: 4 },
      { wave: 8 },
      { wave: 10 },
      { wave: 12 },
    ];

    expect(computeWavePercentile(leaderboard, 9)).toBe(60);
  });

  test("withholds percentile until the leaderboard has enough rows", () => {
    expect(computeWavePercentile([{ wave: 2 }, { wave: 3 }], 8)).toBeNull();
  });

  test("builds a worker-safe Run DNA share payload with proof tier", () => {
    const payload = buildRunDnaSharePayload({
      weaponKills: [10, 5],
      weapons: [
        { color: "#ff0", emoji: "A" },
        { color: "#0ff", emoji: "B" },
      ],
      leaderboard: [{ wave: 2 }, { wave: 3 }, { wave: 4 }, { wave: 5 }, { wave: 9 }],
      wave: 6,
      score: 12345,
      kills: 15,
      runNarrative: { act: "THE PUSH" },
      buildGrade: { grade: "A" },
      replayProofPresenter: { receipt: { status: "verified", level: "rich" } },
    });

    expect(payload).toMatchObject({
      weaponKills: [10, 5],
      weaponColors: ["#ff0", "#0ff"],
      weaponEmojis: ["A", "B"],
      wave: 6,
      score: 12345,
      kills: 15,
      runArc: "THE PUSH",
      moments: [],
      buildGrade: "A",
      replayProofTier: "verified",
      wavePercentile: 80,
    });
  });

  test("includes up to 2 turning-point moments from runNarrative", () => {
    const payload = buildRunDnaSharePayload({
      weaponKills: [5],
      weapons: [{ color: "#f00", emoji: "X" }],
      leaderboard: [],
      wave: 15,
      score: 9000,
      kills: 40,
      runNarrative: {
        act: "THE GRIND",
        moments: [
          { label: "LAST STAND", desc: "Dropped to 5 HP on wave 8." },
          { label: "AIM LOCKED", desc: "Peak 7× precision streak." },
          { label: "CHAIN REACTION", desc: "22-kill streak at peak momentum." },
        ],
      },
    });

    expect(payload.moments).toHaveLength(2);
    expect(payload.moments[0].label).toBe("LAST STAND");
    expect(payload.moments[1].label).toBe("AIM LOCKED");
  });

  test("returns empty moments array when runNarrative has none", () => {
    const payload = buildRunDnaSharePayload({
      weapons: [],
      runNarrative: { act: "THE OPENER", moments: [] },
    });
    expect(payload.moments).toEqual([]);
  });
});
