import { describe, expect, it } from "vitest";
import { computeBuildGrade } from "./buildReport.js";

describe("computeBuildGrade", () => {
  it("rewards synergized efficient late-wave builds", () => {
    const report = computeBuildGrade({
      activeSynergies: [{}, {}, {}],
      weaponKills: [40, 30, 20],
      totalShots: 100,
      wave: 18,
      level: 7,
    });
    expect(report.grade).toBe("A");
    expect(report.label).toBe("BORN SOLDIER");
    expect(report.breakdown).toHaveLength(3);
  });

  it("calls out ammo waste when shots dwarf kills", () => {
    const report = computeBuildGrade({
      activeSynergies: [{}],
      weaponKills: [8, 2],
      totalShots: 80,
      wave: 6,
      level: 4,
    });
    expect(report.label).toBe("TRIGGER HAPPY");
    expect(report.breakdown.find(b => b.id === "ammo").value).toBeLessThan(45);
  });

  it("falls back safely for empty runs", () => {
    const report = computeBuildGrade();
    expect(["B", "C"]).toContain(report.grade);
    expect(report.breakdown.every(b => Number.isFinite(b.value))).toBe(true);
  });
});
