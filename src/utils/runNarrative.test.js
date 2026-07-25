import { describe, expect, it } from "vitest";
import { buildRunNarrative, getRunAct } from "./runNarrative.js";

describe("run narrative", () => {
  it.each([
    [1, "THE OPENER"],
    [10, "THE GRIND"],
    [25, "THE PUSH"],
    [35, "THE LEGEND"],
  ])("classifies wave %i as %s", (wave, act) => {
    expect(getRunAct(wave)).toBe(act);
  });

  it("orders observed moments and caps the card at three", () => {
    expect(buildRunNarrative({
      wave: 30,
      nearDeathEvents: [{ hpLeft: 2, wave: 12 }, { hpLeft: 1, wave: 29 }],
      precisionPeakStreak: 14,
      flowStateFired: 2,
      bossKillCount: 3,
      bestStreak: 44,
    })).toEqual({
      act: "THE PUSH",
      actDesc: "Past the mid-game wall — the run had real legs.",
      moments: [
        { label: "LAST STAND", desc: "Dropped to 2 HP on wave 12 (2× total near-deaths)." },
        { label: "AIM LOCKED", desc: "Peak 14× precision streak — triggered FLOW STATE 2×." },
        { label: "BOSS HUNTER", desc: "3 bosses defeated including phase-two pressure." },
      ],
    });
  });

  it("uses the streak fallback only when higher-priority moments leave room", () => {
    expect(buildRunNarrative({ wave: 8, bestStreak: 20 }).moments).toEqual([
      { label: "CHAIN REACTION", desc: "20-kill streak at peak momentum." },
    ]);
    expect(buildRunNarrative({ wave: 8, bestStreak: 19 }).moments).toEqual([]);
  });
});
