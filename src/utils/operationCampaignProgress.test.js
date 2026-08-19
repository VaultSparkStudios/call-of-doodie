import { describe, expect, it } from "vitest";
import { bestOperationScore, createOperationCampaignProgress, deriveOperationCampaignCarryIn, recordOperationCompletion } from "./operationCampaignProgress.js";

describe("Operation campaign progress", () => {
  it("records an identity-free completion once and derives authored carry-in", () => {
    const initial = createOperationCampaignProgress();
    const receipt = { operationId: "blacksite-flush", route: "service-tunnel", fingerprint: "9A7F20C1", score: 1200 };
    const progress = recordOperationCompletion(initial, receipt);
    expect(recordOperationCompletion(progress, receipt)).toEqual(progress);
    expect(deriveOperationCampaignCarryIn(progress, "porcelain-siege")).toMatchObject({
      id: "tunnel-debt",
      sourceOperationId: "blacksite-flush",
      sourceRoute: "service-tunnel",
      transition: { targetId: "valve-east", command: "power" },
    });
  });

  it("does not fabricate carry-in for an unmatched route", () => {
    const progress = recordOperationCompletion(createOperationCampaignProgress(), {
      operationId: "blacksite-flush", route: "executive-washroom", fingerprint: "9A7F20C2", score: 500,
    });
    expect(deriveOperationCampaignCarryIn(progress, "porcelain-siege")).toBeNull();
  });

  it("bestOperationScore returns null for uncompleted operations and the maximum score across multiple completions", () => {
    const empty = createOperationCampaignProgress();
    expect(bestOperationScore(empty, "blacksite-flush")).toBeNull();

    const after1 = recordOperationCompletion(empty, {
      operationId: "blacksite-flush", route: "service-tunnel", fingerprint: "AA001122", score: 1500,
    });
    const after2 = recordOperationCompletion(after1, {
      operationId: "blacksite-flush", route: "executive-washroom", fingerprint: "BB334455", score: 3200,
    });
    const after3 = recordOperationCompletion(after2, {
      operationId: "blacksite-flush", route: "service-tunnel", fingerprint: "CC667788", score: 2100,
    });

    expect(bestOperationScore(after3, "blacksite-flush")).toBe(3200);
    expect(bestOperationScore(after3, "porcelain-siege")).toBeNull();
    expect(bestOperationScore(after3, "")).toBeNull();
  });
});
