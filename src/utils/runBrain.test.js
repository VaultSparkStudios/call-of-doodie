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
});
