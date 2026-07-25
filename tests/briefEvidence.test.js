import { describe, expect, it } from "vitest";
import { presentCostSignal, selectCurrentTestingSurfaces, validateBriefEvidence } from "../scripts/lib/brief-evidence.mjs";

describe("brief evidence projection", () => {
  it("keeps stable endpoints and selects authoritative current test counts", () => {
    const surfaces = [
      { type: "production", url: "https://example.test/", status: "green" },
      { type: "tests", command: "npm test — 10/10", status: "green" },
      { type: "staging-preview", url: "https://old.example.test/", status: "green" },
      { type: "tests", command: "npm test — 20/20", status: "green" },
      { type: "staging-preview", url: "https://new.example.test/", status: "green" },
    ];

    const result = selectCurrentTestingSurfaces(surfaces, { testsPassing: 30, testsTotal: 30 });

    expect(result).toContainEqual(expect.objectContaining({ url: "https://example.test/" }));
    expect(result).toContainEqual(expect.objectContaining({ url: "https://new.example.test/" }));
    expect(result).not.toContainEqual(expect.objectContaining({ url: "https://old.example.test/" }));
    expect(result).toContainEqual(expect.objectContaining({ command: "npm test — 30/30 passing" }));
    expect(result.some((surface) => surface.command === "npm test — 10/10")).toBe(false);
  });

  it("deduplicates production smoke commands and keeps the newest two", () => {
    const result = selectCurrentTestingSurfaces([
      { type: "production-smoke", command: "npm run alpha", status: "green" },
      { type: "production-smoke", command: "npm run beta", status: "green" },
      { type: "production-smoke", command: "npm run alpha", status: "green" },
      { type: "production-smoke", command: "npm run gamma", status: "green" },
    ]);
    expect(result.map((surface) => surface.command)).toEqual(["npm run alpha", "npm run gamma"]);
  });

  it("never converts Max Plan notional usage into a spend alarm", () => {
    expect(presentCostSignal({ sig: "⛔", realMetered7d: 99 }, { modelPlanMode: true })).toEqual({
      sig: "✓",
      detail: "flat-rate Max Plan · usage ledger informational · alarms disabled",
      alarmEligible: false,
    });
  });

  it("preserves metered signals outside plan mode", () => {
    const result = presentCostSignal({ sig: "⚠", realMetered7d: 1.25, reasons: ["threshold exceeded"] });
    expect(result).toMatchObject({ sig: "⚠", alarmEligible: true });
    expect(result.detail).toContain("$1.25/7d");
  });

  it("self-validates authoritative test counts and Max Plan semantics", () => {
    const status = { testsPassing: 30, testsTotal: 30, modelPlanMode: true };
    expect(validateBriefEvidence("Unit tests → npm test — 30/30 passing ✓\n║  ✓  Cost          flat-rate Max Plan · usage ledger informational", status)).toEqual({
      ok: true,
      issues: [],
    });
    expect(validateBriefEvidence("Unit tests → npm test — 10/10 ✓\n║  ⛔  Cost          $99", status)).toEqual({
      ok: false,
      issues: [
        "WHERE TO TEST must include authoritative receipt: npm test — 30/30 passing",
        "Max Plan cost must remain informational and non-alarming",
        "Max Plan cost provenance is missing from SIGNALS",
      ],
    });
  });
});
