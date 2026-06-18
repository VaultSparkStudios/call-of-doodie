import { describe, expect, it } from "vitest";
import { buildNextRunDrill } from "./drillDirector.js";

describe("buildNextRunDrill", () => {
  it("prioritizes community choke point coaching", () => {
    const drill = buildNextRunDrill({
      runSeed: 123,
      runCoach: { brain: { chokeWarning: { wave: 12, tip: "Save health for wave 12." } } },
    });

    expect(drill).toMatchObject({
      id: "choke_point_rematch",
      action: "replay_seed",
      seed: 123,
      title: "Solve wave 12",
    });
  });

  it("uses enemy lab drills before generic pathing", () => {
    const drill = buildNextRunDrill({
      runSeed: 42,
      runCoach: {
        enemyLab: {
          counterVerb: "Sidestep",
          name: "Karen",
          drill: "Sidestep: move perpendicular.",
          nextRunCue: "Practice before the boss.",
        },
      },
      ghostDeathReadout: { headline: "Pinned", detail: "You got boxed in." },
    });

    expect(drill.id).toBe("enemy_lab_rematch");
    expect(drill.detail).toContain("Sidestep");
  });

  it("falls back to play again when no seed exists", () => {
    const drill = buildNextRunDrill({ debrief: { actions: ["Use grenades earlier."] } });

    expect(drill.action).toBe("play_again");
    expect(drill.cta).toBe("PLAY THE FIX");
    expect(drill.detail).toContain("Use grenades");
  });
});
