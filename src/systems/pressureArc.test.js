import { describe, expect, it } from "vitest";
import { createPressureArc, describeFormationPressure, describePressureArc, finalizePressureArc, recordFormationExposure, recordPressureSnapshot } from "./pressureArc.js";

describe("pressure arc receipt", () => {
  it("records only band transitions and keeps the maximum ratio", () => {
    const arc = createPressureArc();
    recordPressureSnapshot(arc, { wave: 2, stageId: "scouting", pressureBand: "light", pressureRatio: 0.4 });
    recordPressureSnapshot(arc, { wave: 2, stageId: "pressure", pressureBand: "light", pressureRatio: 0.52 });
    recordPressureSnapshot(arc, { wave: 2, stageId: "climax", pressureBand: "overrun", pressureRatio: 1.42 });

    const receipt = finalizePressureArc(arc, { deathWave: 2 });
    expect(receipt.transitionCount).toBe(2);
    expect(receipt.counts).toEqual({ light: 1, stable: 0, overrun: 1 });
    expect(receipt.maxPressureRatio).toBe(1.42);
    expect(receipt.collapseBand).toBe("overrun");
    expect(describePressureArc(receipt)).toContain("does not prove the cause");
  });

  it("caps history and normalizes unsafe input", () => {
    const arc = createPressureArc();
    for (let index = 0; index < 40; index += 1) {
      recordPressureSnapshot(arc, {
        wave: index + 1,
        stageId: `stage-${index}`,
        pressureBand: index % 2 ? "overrun" : "unknown",
        pressureRatio: index,
      });
    }
    const receipt = finalizePressureArc(arc, { deathWave: -5 });
    expect(receipt.transitions).toHaveLength(24);
    expect(receipt.deathWave).toBe(1);
    expect(receipt.maxPressureRatio).toBe(9.99);
    expect(receipt.claim).toBe("observed-wave-pressure-and-formation-exposure-not-causality");
  });

  it("records bounded formation exposure and derives literal counterplay", () => {
    const arc = createPressureArc();
    recordFormationExposure(arc, { id: "pincer", lane: "left", role: "encircle" }, { wave: 20, stageId: "pressure" });
    recordFormationExposure(arc, { id: "pincer", lane: "right", role: "encircle" }, { wave: 20, stageId: "pressure" });
    recordFormationExposure(arc, { id: "flank", lane: "right", role: "collapse" }, { wave: 20, stageId: "climax" });
    recordFormationExposure(arc, { id: "unknown" }, { wave: 20 });
    const receipt = finalizePressureArc(arc, { deathWave: 20 });
    expect(receipt).toMatchObject({
      schemaVersion: "pressure-arc-v2",
      formationExposureCount: 3,
      dominantFormation: "pincer",
      formationCounts: { pincer: 2, escort: 0, flank: 1, surge: 0 },
    });
    expect(receipt.formationTransitions).toHaveLength(2);
    expect(describeFormationPressure(receipt)).toContain("counterplay drill, not proof");
  });

  it("upgrades legacy arcs without inventing formation evidence", () => {
    const receipt = finalizePressureArc({
      schemaVersion: "pressure-arc-v1",
      counts: { light: 1, stable: 0, overrun: 0 },
      transitions: [{ wave: 1, stage: "scouting", band: "light", pressureRatio: 0.4 }],
      maxPressureRatio: 0.4,
    });
    expect(receipt).toMatchObject({ schemaVersion: "pressure-arc-v2", formationExposureCount: 0, dominantFormation: null });
    expect(describeFormationPressure(receipt)).toContain("No coordinated formation");
  });
});
