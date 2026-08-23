import { describe, expect, it } from "vitest";
import { getOperation } from "./operationCampaign.js";
import { OPERATION_SCORE_SCHEMA, scoreOperationEncounter, summarizeOperationScore } from "./operationScore.js";

const operation = getOperation("blacksite-flush");
const breach = operation.encounters[0];
const boss = operation.encounters.at(-1);

describe("operationScore v2", () => {
  it("makes clean tempo skill expressive on the same route", () => {
    const clean = scoreOperationEncounter({ operation, encounter: breach, interactionBonus: 40, elapsedMs: 45_000, reinforcementCount: 0, routeMultiplier: 1 });
    const slow = scoreOperationEncounter({ operation, encounter: breach, interactionBonus: 40, elapsedMs: 180_000, reinforcementCount: 2, routeMultiplier: 1 });
    expect(clean.awarded).toBeGreaterThan(slow.awarded);
    expect(clean).toMatchObject({ schemaVersion: OPERATION_SCORE_SCHEMA, objective: 1000, interaction: 40, pressurePenalty: 0 });
    expect(slow.pressurePenalty).toBe(200);
  });

  it("keeps every component exact and bounded before applying the route bargain", () => {
    const score = scoreOperationEncounter({ operation, encounter: boss, interactionBonus: 100, elapsedMs: 60_000, reinforcementCount: 1, routeMultiplier: 1.1 });
    expect(score.extraction).toBe(500);
    expect(score.subtotal).toBe(score.objective + score.interaction + score.tempo + score.extraction - score.pressurePenalty);
    expect(score.awarded).toBe(Math.floor(score.subtotal * 1.1));
    expect(score.evidence).toMatchObject({ elapsedMs: 60_000, reinforcementCount: 1, completed: true });
  });

  it("aggregates only versioned v2 breakdowns", () => {
    const first = scoreOperationEncounter({ operation, encounter: breach, elapsedMs: 60_000 });
    const second = scoreOperationEncounter({ operation, encounter: boss, elapsedMs: 60_000 });
    const summary = summarizeOperationScore([
      { scoreBreakdown: first },
      { scoreBreakdown: { schemaVersion: "operation-score-v1", awarded: 99_999 } },
      { scoreBreakdown: second },
    ]);
    expect(summary.awarded).toBe(first.awarded + second.awarded);
    expect(summary.extraction).toBe(500);
  });

  it("fails closed when an encounter is incomplete", () => {
    expect(scoreOperationEncounter({ operation, encounter: breach, completed: false, routeMultiplier: 9 })).toMatchObject({
      awarded: 0,
      routeMultiplier: 2,
    });
  });
});
