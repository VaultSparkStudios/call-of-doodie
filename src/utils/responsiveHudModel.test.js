import { describe, expect, it } from "vitest";
import { buildResponsiveHudModel } from "./responsiveHudModel.js";

describe("responsive HUD model", () => {
  it("orders integrity and the active contract ahead of lower-urgency context", () => {
    const model = buildResponsiveHudModel({
      runIntegrity: { onlineEligible: false, detail: "Recovered state" },
      activeWaveContract: { label: "No-hit contract", description: "Avoid damage" },
      runModifier: { name: "Glass cannon", desc: "Damage up" },
      topGhosts: [{ id: 1 }],
    });
    expect(model.detailRows.map((item) => item.id)).toEqual(["integrity", "contract", "abilities", "modifier", "ghosts"]);
    expect(model.primary.id).toBe("integrity");
  });

  it("exposes truthful readiness states for every compact action", () => {
    const model = buildResponsiveHudModel({ dashReady: true, grenadeReady: false, isReloading: true });
    expect(model.actionStates).toEqual([
      { id: "dash", label: "DASH", hint: "SHIFT", ready: true },
      { id: "grenade", label: "GRENADE", hint: "Q", ready: false },
      { id: "reload", label: "RELOAD", hint: "R", ready: false },
    ]);
    expect(model.detailRows.find((item) => item.id === "abilities")?.detail).toContain("Grenade cooling");
    expect(model.capabilityReceipt.unique).toBe(true);
    expect(model.capabilityReceipt.alwaysVisible).toEqual(expect.arrayContaining(["health", "weapon", "ability-readiness"]));
    expect(model.capabilityReceipt.actionIds).toEqual(["dash", "grenade", "reload"]);
  });

  it("carries persisted order evidence without claiming practice mastery", () => {
    const model = buildResponsiveHudModel({
      activeDrill: { title: "Hold the lane", detail: "Keep one exit open." },
      drillProgress: { label: "BASELINE PASSED · W6" },
      practiceEvidence: { label: "EVIDENCE 1/2", repeatable: false },
      dashReady: true,
      grenadeReady: true,
    });
    expect(model.detailRows.map((item) => item.id)).toEqual(["drill", "drill-evidence"]);
    expect(model.detailRows[1]).toMatchObject({ label: "Order evidence", detail: "EVIDENCE 1/2", tone: "gold" });
    expect(JSON.stringify(model)).not.toContain("mastery");
  });
});
