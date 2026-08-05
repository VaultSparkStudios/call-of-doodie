import { describe, expect, it } from "vitest";
import { buildFieldManualTruth } from "./fieldManualTruth.js";

describe("field manual truth graph", () => {
  it("publishes source-bound human and agent claims", () => {
    const graph = buildFieldManualTruth({ weapons: [1, 2], enemies: [1], modes: [1, 2, 3] });
    expect(graph.claims.find((claim) => claim.id === "content").value).toBe("2 weapons · 1 enemies · 3 modes");
    expect(graph.agentProjection.proof.source).toBe("/gameplay-contract.json");
    expect(graph.claims.find((claim) => claim.id === "proof").coverage.schemaVersion).toBe("replay-coverage-v1");
  });
});
