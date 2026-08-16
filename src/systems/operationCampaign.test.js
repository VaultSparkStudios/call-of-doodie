import { describe, expect, it } from "vitest";
import { ENCOUNTER_VERBS, OPERATIONS, getOperation, validateOperationCampaign } from "./operationCampaign.js";

describe("operationCampaign", () => {
  it("publishes three authored 12–18 minute seven-encounter operations", () => {
    expect(OPERATIONS).toHaveLength(3);
    expect(validateOperationCampaign()).toEqual({ valid: true, errors: [] });
    for (const operation of OPERATIONS) {
      expect(operation.durationMinutes).toEqual([12, 18]);
      expect(operation.encounters.map((entry) => entry.verb)).toEqual(ENCOUNTER_VERBS);
      expect(operation.routeOptions).toHaveLength(2);
      expect(Object.isFrozen(operation)).toBe(true);
    }
  });

  it("looks up authored ids without silently starting an unknown operation", () => {
    expect(getOperation("porcelain-siege")?.seed).toBe(4102);
    expect(getOperation("missing")).toBeNull();
  });
});
