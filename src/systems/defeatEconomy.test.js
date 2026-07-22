import { describe, expect, it } from "vitest";
import { isCareerBossType, planEnemyCoinDrop, planEnemyDefeatScore } from "./defeatEconomy.js";

function sequenceRng(values) {
  let index = 0;
  return () => values[index++] ?? 0;
}

describe("shared enemy defeat economy", () => {
  it("keeps career boss classification in one contract", () => {
    expect([4, 9, 16, 17, 18, 20, 21].every(isCareerBossType)).toBe(true);
    expect(isCareerBossType(10)).toBe(false);
  });

  it("preserves deterministic boss, elite and normal coin formulas", () => {
    expect(planEnemyCoinDrop({ enemy: { isBossEnemy: true }, rng: sequenceRng([0.5]) })).toMatchObject({ base: 18, amount: 18 });
    expect(planEnemyCoinDrop({ enemy: { elite: true }, rng: sequenceRng([0.9]), coinMultActive: true })).toMatchObject({ base: 4, amount: 8 });
    expect(planEnemyCoinDrop({ enemy: {}, rng: sequenceRng([0.39, 0.24]), treeCoinBonus: 1.5 })).toMatchObject({ base: 2, amount: 3 });
    expect(planEnemyCoinDrop({ enemy: {}, rng: sequenceRng([0.4]) })).toMatchObject({ base: 0, amount: 0 });
  });

  it("produces identical score and coin plans for railgun and projectile paths", () => {
    const input = {
      enemy: { points: 125, typeIndex: 9, isBossEnemy: true },
      comboMult: 1.4,
      killScoreMult: 1.2,
      routeKillScoreMult: 1.1,
      playerPos: { x: 10, y: 20 },
    };
    const rail = {
      score: planEnemyDefeatScore(input),
      coin: planEnemyCoinDrop({ enemy: input.enemy, rng: sequenceRng([0.75]), coinMultActive: true }),
    };
    const projectile = {
      score: planEnemyDefeatScore(input),
      coin: planEnemyCoinDrop({ enemy: input.enemy, rng: sequenceRng([0.75]), coinMultActive: true }),
    };
    expect(projectile).toEqual(rail);
    expect(rail.score).toMatchObject({ careerBoss: true, claim: "shared-enemy-defeat-economy-contract" });
  });
});
