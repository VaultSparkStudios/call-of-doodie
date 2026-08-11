import { describe, expect, it } from "vitest";
import { buildCommandersOrder, sanitizeNextRunContract } from "./commandersOrders.js";

const primary = { id: "deploy", title: "Deploy", cta: "DEPLOY", action: "deploy", accent: "#f60" };
const journey = {
  label: "Return Run",
  detail: "Pick one intention.",
  primary,
  secondary: { id: "missions", title: "Mission Cleanup", detail: "Finish one mission.", cta: "MISSIONS", action: "missions", reasonCode: "mission_cleanup" },
};

describe("commandersOrders", () => {
  it("sanitizes and bounds the death-to-menu contract", () => {
    const result = sanitizeNextRunContract({
      id: " tempo ",
      focus: "  Spend   cooldowns ",
      target: "x".repeat(400),
      proof: "Use one grenade.",
      ignored: "nope",
    });
    expect(result).toEqual(expect.objectContaining({ id: "tempo", focus: "Spend cooldowns", proof: "Use one grenade." }));
    expect(result.target).toHaveLength(220);
    expect(result.ignored).toBeUndefined();
    expect(sanitizeNextRunContract({ id: "missing-fields" })).toBeNull();
  });

  it("uses explicit input, onboarding, contract, journey, then intelligence precedence", () => {
    const aim = buildCommandersOrder({ aimCheck: { status: "needed", label: "Aim Check", detail: "Sweep four ways." }, journey });
    expect(aim.kind).toBe("input-proof");

    const onboarding = buildCommandersOrder({
      aimCheck: { status: "verified" },
      onboarding: { activeRun: 2, completedRuns: 1, steps: [{ title: "Prove It", text: "Replay.", active: true }] },
      pendingNextRunContract: { id: "tempo", focus: "Spend", target: "Throw.", proof: "No unused grenade." },
      journey,
    });
    expect(onboarding.kind).toBe("first-runs");

    const contract = buildCommandersOrder({
      aimCheck: { status: "verified" },
      pendingNextRunContract: { id: "tempo", focus: "Spend", target: "Throw.", proof: "No unused grenade." },
      journey,
    });
    expect(contract).toMatchObject({ kind: "next-run-contract", dismissible: true, reasonCode: "next-run-contract:tempo" });

    expect(buildCommandersOrder({ aimCheck: { status: "verified" }, journey }).kind).toBe("journey");
    expect(buildCommandersOrder({ aimCheck: { status: "verified" }, runIntel: { focus: "safe_opener", directive: "Keep space." } }).kind).toBe("run-intelligence");
  });

  it("fails closed when an invalid carried contract is supplied", () => {
    const order = buildCommandersOrder({
      aimCheck: { status: "verified" },
      pendingNextRunContract: { id: "partial" },
      journey,
    });
    expect(order.kind).toBe("journey");
  });
});

