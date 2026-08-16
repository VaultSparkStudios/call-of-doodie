import { describe, expect, it } from "vitest";
import {
  buildOperationRematchCartridge,
  buildOperationReplayReceipt,
  buildOperationRivalState,
  inspectOperationRivalBudget,
  MAX_OPERATION_BRANCHES,
  MAX_OPERATION_GHOST_SAMPLES,
  MAX_OPERATION_SPLITS,
  OPERATION_RIVAL_BUDGETS,
} from "./operationRivals.js";

describe("asynchronous Operation rivals", () => {
  it("bounds splits, branch ghosts, path samples, and the serialized payload", () => {
    const receipt = buildOperationReplayReceipt({
      operationId: "sewer-crown",
      seed: 42,
      scoringContract: "operation-score-v1",
      routeOptions: ["left", "right"],
      splits: Array.from({ length: 100 }, (_, index) => ({ room: `room-${index}`, elapsedMs: index * 1000 })),
      branchGhost: Array.from({ length: 40 }, (_, index) => ({ fork: `fork-${index}`, choice: "left" })),
      ghostPath: Array.from({ length: 500 }, (_, index) => ({ elapsedMs: index * 50, x: index, y: -index, room: "hall" })),
      objectives: [{ id: "flush-valve", outcome: "complete", elapsedMs: 5000 }],
      finalScore: 1200,
      durationMs: 60_000,
      completed: true,
    });
    expect(receipt.splits).toHaveLength(MAX_OPERATION_SPLITS);
    expect(receipt.branchGhost).toHaveLength(MAX_OPERATION_BRANCHES);
    expect(receipt.ghostPath.length).toBeLessThanOrEqual(MAX_OPERATION_GHOST_SAMPLES);
    expect(inspectOperationRivalBudget(receipt)).toMatchObject({ withinPayloadBudget: true, withinShapeBudget: true });
    expect(OPERATION_RIVAL_BUDGETS.cost.realtimeConnections).toBe(0);
  });

  it("drops identity and combat-shaped fields and makes rival state presentation-only", () => {
    const receipt = buildOperationReplayReceipt({
      operationId: "sewer-crown",
      seed: 7,
      scoringContract: "operation-score-v1",
      playerId: "private-player",
      email: "private@example.com",
      health: 999,
      enemies: [{ id: "enemy" }],
      splits: [{ room: "intake", elapsedMs: 2500, score: 40, projectiles: ["unsafe"] }],
      branchGhost: [{ fork: "sluice", choice: "left", elapsedMs: 2000, worldState: "unsafe" }],
    });
    const rival = buildOperationRivalState(receipt, 3000);
    expect(rival).toMatchObject({ combatAuthority: "none", canMutateWorld: false, canAuthorScore: false });
    expect(receipt.trust).toMatchObject({ combatAuthority: "none", leaderboardEligible: false });
    expect(JSON.stringify(receipt)).not.toMatch(/private-player|private@example|health|enemies|projectiles|worldState/);
  });

  it("creates a deterministic configuration-only rematch cartridge", () => {
    const receipt = buildOperationReplayReceipt({
      operationId: "sewer-crown",
      seed: 99,
      routeOptions: ["sluice", "overflow"],
      scoringContract: "operation-score-v1",
      splits: [{ room: "intake", elapsedMs: 1000 }],
    });
    const first = buildOperationRematchCartridge(receipt);
    const second = buildOperationRematchCartridge(receipt);
    expect(first).toEqual(second);
    expect(first).toMatchObject({
      seed: 99,
      routeOptions: ["sluice", "overflow"],
      scoringContract: "operation-score-v1",
      trust: "configuration-only-no-combat-or-score-authority",
    });
    expect(first).not.toHaveProperty("result");
    expect(first).not.toHaveProperty("ghostPath");
  });
});
