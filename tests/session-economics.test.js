import { describe, expect, it } from "vitest";
import { sessionFloorVerdict } from "../scripts/lib/session-economics.mjs";

describe("session floor verdict", () => {
  it("stops on a reverified exhausted list even below the historical velocity floor", () => {
    const result = sessionFloorVerdict({
      contextPct: 0.16,
      itemsShipped: 5,
      velocityFloor: 8,
      listExhausted: true,
    });
    expect(result.verdict).toBe("STOP");
    expect(result.reason).toContain("list exhausted + re-verified");
  });

  it("keeps an explicit unmet token budget authoritative over list exhaustion", () => {
    const result = sessionFloorVerdict({
      contextPct: 0.16,
      itemsShipped: 5,
      velocityFloor: 8,
      listExhausted: true,
      budgetTotal: 100_000,
      budgetSpent: 50_000,
    });
    expect(result.verdict).toBe("CONTINUE");
    expect(result.reason).toContain("budget floor not met");
  });

  it("continues below the floor while executable work remains", () => {
    const result = sessionFloorVerdict({
      contextPct: 0.16,
      itemsShipped: 5,
      velocityFloor: 8,
      listExhausted: false,
    });
    expect(result.verdict).toBe("CONTINUE");
  });
});
