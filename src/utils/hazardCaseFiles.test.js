import { describe, expect, it } from "vitest";
import {
  buildHazardCaseFileRows,
  incrementHazardChronicle,
  normalizeHazardChronicle,
  resolveHazardCaseId,
} from "./hazardCaseFiles.js";

describe("hazard case files", () => {
  it("maps only observed environmental damage to a stable case id", () => {
    expect(resolveHazardCaseId({ evidenceLevel: "observed", hazard: true, sourceName: "Sewer flood" })).toBe("sewer_flood");
    expect(resolveHazardCaseId({ evidenceLevel: "hypothesis", hazard: true, sourceName: "Sewer flood" })).toBeNull();
    expect(resolveHazardCaseId({ evidenceLevel: "observed", hazard: false, sourceName: "Sewer flood" })).toBeNull();
    expect(resolveHazardCaseId({ evidenceLevel: "observed", hazard: true, sourceName: "untrusted label" })).toBeNull();
  });

  it("increments typed events without allowing arbitrary keys", () => {
    let value = incrementHazardChronicle({}, "sewer_flood", "death");
    value = incrementHazardChronicle(value, "extraction_lockdown", "encounter");
    value = incrementHazardChronicle(value, "made_up", "death");
    expect(value).toEqual({
      sewer_flood: { deaths: 1, encounters: 0 },
      extraction_lockdown: { deaths: 0, encounters: 1 },
    });
  });

  it("normalizes corrupt counts and migrates known legacy display keys", () => {
    expect(normalizeHazardChronicle({ sewer_flood: { deaths: Infinity, encounters: -3 }, made_up: { deaths: 7 } }, { "Sewer flood": 4, Unknown: 9 })).toEqual({
      sewer_flood: { deaths: 4, encounters: 0 },
    });
  });

  it("renders deaths and lockdown encounters with truthful metric language and deterministic order", () => {
    const rows = buildHazardCaseFileRows({
      hazardChronicle: {
        extraction_lockdown: { encounters: 3 },
        sewer_flood: { deaths: 5 },
      },
    });
    expect(rows.map((row) => [row.id, row.metric])).toEqual([
      ["sewer_flood", "killed you 5×"],
      ["extraction_lockdown", "sealed the exit 3×"],
    ]);
    expect(rows.every((row) => row.countermeasure.length > 20)).toBe(true);
  });
});
