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
});
