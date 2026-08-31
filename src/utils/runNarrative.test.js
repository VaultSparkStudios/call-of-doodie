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

  it("emits FLAWLESS when two or more waves were survived without damage", () => {
    expect(buildRunNarrative({ wave: 8, noHitWaves: 2 }).moments).toEqual([
      { label: "FLAWLESS", desc: "2 waves survived without taking damage." },
    ]);
    expect(buildRunNarrative({ wave: 8, noHitWaves: 1 }).moments).toEqual([]);
  });

  it("emits WEAPON SPECIALIST when one weapon dominates with meaningful kill count", () => {
    const topWeapon = { name: "Spicy Squirt Gun", kills: 12, share: 0.72 };
    expect(buildRunNarrative({ wave: 8, topWeapon }).moments).toEqual([
      { label: "WEAPON SPECIALIST", desc: "SPICY SQUIRT GUN responsible for 12 kills (72% of run)." },
    ]);
    // Does not fire below kill or share threshold
    expect(buildRunNarrative({ wave: 8, topWeapon: { name: "X", kills: 4, share: 0.72 } }).moments).toEqual([]);
    expect(buildRunNarrative({ wave: 8, topWeapon: { name: "X", kills: 10, share: 0.59 } }).moments).toEqual([]);
  });

  it("emits DEMOLITION when grenade kills are high enough", () => {
    expect(buildRunNarrative({ wave: 8, grenadeKills: 4 }).moments).toEqual([
      { label: "DEMOLITION", desc: "4 kills via grenades — explosive output paid off." },
    ]);
    expect(buildRunNarrative({ wave: 8, grenadeKills: 3 }).moments).toEqual([]);
  });

  it("new moments fill the card without exceeding three, lower-priority moments yield", () => {
    // Near-death + precision + boss fills all 3 slots; FLAWLESS/SPECIALIST/DEMOLITION/CHAIN should not appear
    const result = buildRunNarrative({
      wave: 30,
      nearDeathEvents: [{ hpLeft: 5, wave: 8 }],
      precisionPeakStreak: 8,
      bossKillCount: 2,
      noHitWaves: 5,
      grenadeKills: 10,
      bestStreak: 30,
      topWeapon: { name: "Laser", kills: 20, share: 0.9 },
    });
    expect(result.moments).toHaveLength(3);
    expect(result.moments.map((m) => m.label)).toEqual(["LAST STAND", "AIM LOCKED", "BOSS SLAYER"]);
  });

  it("fills remaining slots with new moments when higher-priority ones are absent", () => {
    const result = buildRunNarrative({
      wave: 12,
      bossKillCount: 1,
      noHitWaves: 3,
      topWeapon: { name: "Confetti Cannon", kills: 8, share: 0.75 },
      grenadeKills: 6,
    });
    expect(result.moments).toHaveLength(3);
    expect(result.moments.map((m) => m.label)).toEqual(["BOSS SLAYER", "FLAWLESS", "WEAPON SPECIALIST"]);
  });

  it("handles missing and null inputs gracefully", () => {
    expect(() => buildRunNarrative({})).not.toThrow();
    expect(() => buildRunNarrative({ topWeapon: null, nearDeathEvents: null })).not.toThrow();
    const r = buildRunNarrative({ topWeapon: null });
    expect(r.moments).toEqual([]);
  });
});
