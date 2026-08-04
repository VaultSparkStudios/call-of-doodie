import { describe, expect, it } from 'vitest';
import { buildPrestigeRunway, killsRequiredForAccountLevel, PRESTIGE_REQUIRED_LEVEL } from '../src/utils/progressionCurve.js';

describe('prestige pressure gauge', () => {
  it('derives the level-25 threshold and scenario range from the canonical curve', () => {
    const runway = buildPrestigeRunway();
    expect(runway.totalKillsRequired).toBe(11_520);
    expect(runway.totalKillsRequired).toBe(killsRequiredForAccountLevel(PRESTIGE_REQUIRED_LEVEL));
    expect(runway.projectedRuns).toEqual({ fastest: 231, slowest: 1152 });
    expect(runway.claimScope).toBe('scenario-projection-not-player-outcome');
  });

  it('reconciles boundary eligibility without retuning progression', () => {
    expect(buildPrestigeRunway({ totalKills: 11_519 })).toMatchObject({ eligible: false, killsRemaining: 1, currentLevel: 24 });
    expect(buildPrestigeRunway({ totalKills: 11_520 })).toMatchObject({ eligible: true, killsRemaining: 0, currentLevel: 25 });
  });
});
