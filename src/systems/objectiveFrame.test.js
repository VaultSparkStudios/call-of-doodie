import { describe, expect, it, vi } from "vitest";
import { resolveObjectiveFrame } from "./objectiveFrame.js";

function fixture(reward = "score") {
  return {
    currentWave: 6,
    score: 100,
    coins: 2,
    screenShake: 1,
    activeObjective: { type: "test", label: "TEST ORDER", color: "#0ff", reward },
  };
}

const complete = { tick: () => ({ completed: true, expired: false }), recordResult: () => ({ completedTotal: 1 }) };

describe("objective frame orchestration", () => {
  it("applies exact score rewards and returns bounded presentation effects", () => {
    const gs = fixture("score");
    const result = resolveObjectiveFrame(gs, {}, complete);
    expect(gs.score).toBe(500);
    expect(gs.activeObjective).toBeNull();
    expect(gs.objectivesCompleted).toEqual([{ type: "test", label: "TEST ORDER" }]);
    expect(result).toMatchObject({ kind: "completed", message: "+400 TEST ORDER CLEARED!", achievementCheck: true });
  });

  it("synchronizes coin and perk rewards without owning React state", () => {
    const coins = resolveObjectiveFrame(fixture("coins"), {}, complete);
    const perk = resolveObjectiveFrame(fixture("perk_reroll"), {}, complete);
    expect(coins).toMatchObject({ coinsTotal: 9, bankedPerkDelta: 0 });
    expect(perk).toMatchObject({ coinsTotal: null, bankedPerkDelta: 1 });
  });

  it("records expiration without awarding or shaking the screen", () => {
    const gs = fixture("score");
    const recordResult = vi.fn(() => ({ hotZoneStreak: 0 }));
    const result = resolveObjectiveFrame(gs, {}, { tick: () => ({ completed: false, expired: true }), recordResult });
    expect(gs.score).toBe(100);
    expect(gs.screenShake).toBe(1);
    expect(gs.objectivesFailed).toEqual([{ type: "test", label: "TEST ORDER" }]);
    expect(result).toMatchObject({ kind: "expired", message: "TEST ORDER FAILED", achievementCheck: false });
    expect(recordResult).toHaveBeenCalledOnce();
  });

  it("returns null while an objective remains active", () => {
    const gs = fixture("score");
    expect(resolveObjectiveFrame(gs, {}, { tick: () => ({ completed: false, expired: false }) })).toBeNull();
    expect(gs.activeObjective).not.toBeNull();
  });

  it("fails contradictory terminal outcomes closed without granting a reward", () => {
    const gs = fixture("score");
    const result = resolveObjectiveFrame(gs, {}, { tick: () => ({ completed: true, expired: true }) });
    expect(gs.score).toBe(100);
    expect(gs.objectivesFailed).toHaveLength(1);
    expect(result).toMatchObject({ kind: "expired", consistency: "contradictory-terminal-outcome", achievementCheck: false });
  });
});
