import { describe, expect, it } from "vitest";
import { buildLocalBalanceLab } from "./balanceLab.js";

describe("buildLocalBalanceLab", () => {
  it("detects repeated death waves", () => {
    const lab = buildLocalBalanceLab({
      runHistory: [{ wave: 7 }, { wave: 7 }, { wave: 4 }],
    });

    expect(lab.status).toBe("signals-found");
    expect(lab.topInsight).toMatchObject({ id: "repeat_wave_deaths" });
  });

  it("surfaces repeated observed overrun finishes without causal wording", () => {
    const pressureReceipt = { schemaVersion: "pressure-arc-v2", collapseBand: "overrun" };
    const lab = buildLocalBalanceLab({ runHistory: [{ wave: 4, pressureReceipt }, { wave: 7, pressureReceipt }] });
    const insight = lab.insights.find((entry) => entry.id === "pressure_arc");
    expect(insight?.detail).toContain("does not prove the cause");
    expect(lab.inspected.pressureRuns).toBe(2);
  });

  it("surfaces repeated final-damage patterns without claiming causality", () => {
    const damageReceipt = { schemaVersion: "damage-sequence-v1", finishStyle: "burst" };
    const lab = buildLocalBalanceLab({ runHistory: [{ wave: 5, damageReceipt }, { wave: 8, damageReceipt }] });
    const insight = lab.insights.find((entry) => entry.id === "damage_finish_pattern");
    expect(insight?.title).toBe("Repeated burst finish");
    expect(insight?.detail).toContain("does not establish unrecorded causality");
    expect(lab.inspected.damageRuns).toBe(2);
  });

  it("detects repeated killer pressure", () => {
    const lab = buildLocalBalanceLab({
      career: { recentDeathsByEnemy: [{ t: 4 }, { t: 4 }, { t: 4 }] },
    });

    expect(lab.insights.some((insight) => insight.id === "repeat_killer")).toBe(true);
  });

  it("detects local mode abandon events", () => {
    const lab = buildLocalBalanceLab({
      studioEvents: [
        { type: "mode_abandon", payload: { mode: "boss_rush" } },
        { type: "mode_abandon", payload: { mode: "boss_rush" } },
      ],
    });

    expect(lab.insights.find((insight) => insight.id === "mode_abandon")?.title).toContain("boss rush");
  });

  it("stays quiet without enough signal", () => {
    const lab = buildLocalBalanceLab();

    expect(lab.status).toBe("quiet");
    expect(lab.topInsight.id).toBe("quiet");
  });

  it("adds a descriptive progression runway without claiming balance quality", () => {
    const lab = buildLocalBalanceLab({
      career: { totalKills: 79 },
      meta: { careerPoints: 50, upgradeTiers: {} },
    });

    const insight = lab.insights.find((entry) => entry.id === "progression_runway");
    expect(insight?.receipt.schemaVersion).toBe("progression-runway-v2");
    expect(insight?.detail).toContain("career kills");
    expect(insight?.detail).not.toMatch(/balanced|retention|optimal/i);
  });
});
