import { describe, expect, it } from "vitest";
import { buildRunBrain } from "./runBrain.js";

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

});
