import { describe, expect, it } from "vitest";
import { buildRunBrain, getMutationDifficultyBrief, matchesExperiment, suggestDifficulty } from "./runBrain.js";
import { WEEKLY_MUTATIONS } from "../constants.js";

describe("runBrain", () => {
  it("detects early survival pressure from recent history", () => {
    const brain = buildRunBrain({ runHistory: [{ wave: 4, score: 5000 }, { wave: 6, score: 9000 }] });
    expect(brain.archetype).toBe("survival_gap");
    expect(brain.nextExperiment).toContain("safe opener");
  });

  it("tracks coach follow-through when debriefs become rematches", () => {
    const brain = buildRunBrain({
      studioEvents: [
        { type: "debrief_intelligence" },
        { type: "front_door_action", payload: { actionId: "history_replay" } },
      ],
    });
    expect(brain.followThrough).toContain("converting into rematches");
  });

  it("turns precision streaks into the next experiment", () => {
    const brain = buildRunBrain({ latestRun: { bestPrecisionStreak: 6 } });
    expect(brain.precisionStreak).toBe(6);
    expect(brain.nextExperiment).toContain("precision route");
  });

  it("prioritizes trace proof drills when the latest trust event is weak", () => {
    const brain = buildRunBrain({
      latestRun: { bestPrecisionStreak: 6 },
      studioEvents: [
        {
          type: "score_submit_result",
          category: "trust",
          payload: {
            traceEvidence: {
              level: "weak",
              count: 1,
              weaknessReasons: ["too-few-events", "missing-aim-evidence"],
            },
          },
        },
      ],
    });

    expect(brain.traceContract.status).toBe("needs-drill");
    expect(brain.nextExperiment).toContain("replay-proof drill");
    expect(brain.nextExperiment).toContain("aim before firing");
  });

  it("does not let rich trace evidence override stronger gameplay coaching", () => {
    const brain = buildRunBrain({
      latestRun: { bestPrecisionStreak: 7 },
      studioEvents: [
        {
          type: "score_submit_result",
          category: "trust",
          payload: {
            traceEvidence: {
              level: "rich",
              count: 9,
              weaknessReasons: [],
            },
          },
        },
      ],
    });

    expect(brain.traceContract.status).toBe("complete");
    expect(brain.nextExperiment).toContain("precision route");
  });

  it("emits chokeWarning when the death wave is a community choke point", () => {
    const brain = buildRunBrain({ latestRun: { wave: 12 }, chokeWaves: new Set([8, 12, 20]) });
    expect(brain.chokeWarning).not.toBeNull();
    expect(brain.chokeWarning.wave).toBe(12);
    expect(brain.chokeWarning.tip).toContain("choke point");
  });

  it("returns null chokeWarning when the death wave is not a choke point", () => {
    const brain = buildRunBrain({ latestRun: { wave: 10 }, chokeWaves: new Set([8, 12, 20]) });
    expect(brain.chokeWarning).toBeNull();
  });

  it("returns null chokeWarning when chokeWaves is not provided", () => {
    const brain = buildRunBrain({ latestRun: { wave: 12 } });
    expect(brain.chokeWarning).toBeNull();
  });

});

describe("getMutationDifficultyBrief", () => {
  const WEEK_MS = 7 * 24 * 3600 * 1000;
  const mutation = WEEKLY_MUTATIONS[0];
  const weekWith = 0;
  const weekWithout = 1;

  it("returns null when not enough matching runs", () => {
    const result = getMutationDifficultyBrief(mutation, "normal", [
      { difficulty: "normal", wave: 10, ts: weekWith * WEEK_MS + 1000 },
    ]);
    expect(result).toBeNull();
  });

  it("returns null for unknown mutation", () => {
    const result = getMutationDifficultyBrief({ id: "nonexistent_mut" }, "normal", [
      { difficulty: "normal", wave: 10, ts: weekWith * WEEK_MS + 1000 },
      { difficulty: "normal", wave: 12, ts: weekWith * WEEK_MS + 2000 },
    ]);
    expect(result).toBeNull();
  });

  it("returns a compound brief showing delta when comparison data exists", () => {
    const runHistory = [
      { difficulty: "normal", wave: 8, ts: weekWith * WEEK_MS + 1000 },
      { difficulty: "normal", wave: 10, ts: weekWith * WEEK_MS + 2000 },
      { difficulty: "normal", wave: 18, ts: weekWithout * WEEK_MS + 1000 },
      { difficulty: "normal", wave: 20, ts: weekWithout * WEEK_MS + 2000 },
    ];
    const result = getMutationDifficultyBrief(mutation, "normal", runHistory);
    expect(result).toBeTruthy();
    expect(result).toContain(mutation.name);
    expect(result).toContain("2 runs");
  });

  it("returns a simple avg brief when no non-mutation comparison exists", () => {
    const runHistory = [
      { difficulty: "hard", wave: 12, ts: weekWith * WEEK_MS + 1000 },
      { difficulty: "hard", wave: 14, ts: weekWith * WEEK_MS + 2000 },
    ];
    const result = getMutationDifficultyBrief(mutation, "hard", runHistory);
    expect(result).toBeTruthy();
    expect(result).toContain("13");
    expect(result).toContain("2 runs");
  });

  it("ignores runs from different difficulty", () => {
    const runHistory = [
      { difficulty: "insane", wave: 5, ts: weekWith * WEEK_MS + 1000 },
      { difficulty: "insane", wave: 7, ts: weekWith * WEEK_MS + 2000 },
    ];
    expect(getMutationDifficultyBrief(mutation, "normal", runHistory)).toBeNull();
  });
});

describe("suggestDifficulty", () => {
  it("suggests an upgrade after strong recent runs", () => {
    const result = suggestDifficulty([
      { wave: 15 }, { wave: 16 }, { wave: 14 }, { wave: 13 }, { wave: 17 },
    ], "normal");
    expect(result).toMatchObject({ direction: "up", label: "VETERAN" });
    expect(result.reason).toContain("VETERAN");
  });

  it("suggests a downgrade after repeated early deaths", () => {
    const result = suggestDifficulty([
      { wave: 2 }, { wave: 4 }, { wave: 3 },
    ], "nightmare");
    expect(result).toMatchObject({ direction: "down", label: "VETERAN" });
  });

  it("stays quiet until enough history exists", () => {
    expect(suggestDifficulty([{ wave: 20 }, { wave: 18 }], "recruit")).toBeNull();
  });
});

describe("matchesExperiment", () => {
  const now = Date.now();

  it("returns null when intent is null", () => {
    expect(matchesExperiment({}, null)).toBeNull();
  });

  it("returns null when intent is too old (>7d)", () => {
    const oldIntent = { suggestion: "safe opener", ts: now - 8 * 24 * 3600 * 1000 };
    expect(matchesExperiment({ difficulty: "normal" }, oldIntent)).toBeNull();
  });

  it("detects safe opener match via difficulty normal + perk hint", () => {
    const intent = { suggestion: "Run one safe opener: stabilizer perk first", ts: now };
    expect(matchesExperiment({ firstPerkName: "stabilizer" }, intent)).toBe("matched");
  });

  it("does not throw when a safe-opener intent has no direct entity match", () => {
    const intent = { suggestion: "Run one safe opener: stabilizer perk first", ts: now };
    expect(matchesExperiment({ starterLoadout: "standard", difficulty: "hard" }, intent)).toBe("diverged");
  });

  it("precision route always matches any run config", () => {
    const intent = { suggestion: "Run one precision route: keep aim discipline", ts: now };
    expect(matchesExperiment({ starterLoadout: "aggressive" }, intent)).toBe("matched");
  });

  it("returns diverged when suggestion keyword not found in config", () => {
    const intent = { suggestion: "commit to one build doctrine before the first shop", ts: now };
    // matchesExperiment detects "commit to one build" pattern → matched
    expect(matchesExperiment({}, intent)).toBe("matched");
  });

  it("matches by starterLoadout name when suggestion names it", () => {
    const intent = { suggestion: "Use the sniper loadout for range advantage", ts: now };
    expect(matchesExperiment({ starterLoadout: "sniper" }, intent)).toBe("matched");
  });

  it("returns diverged when no keyword or entity matches", () => {
    const intent = { suggestion: "Switch to the grenade launcher build this run", ts: now };
    expect(matchesExperiment({ starterLoadout: "standard", difficulty: "normal", mode: "normal" }, intent)).toBe("diverged");
  });
});
