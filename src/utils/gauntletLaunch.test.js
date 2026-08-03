import { describe, expect, it } from 'vitest';
import { PERKS, WEAPONS } from '../constants.js';
import { buildWeeklyGauntletLaunch } from './gauntletLaunch.js';

describe('weekly Gauntlet launch contract', () => {
  it('binds deterministic seed, difficulty, weapon, perk, and no-choice rules', () => {
    const plan = buildWeeklyGauntletLaunch({
      weekNum: 42,
      seed: 553,
      diffId: 'hard',
      weaponIdx: 11,
      startPerkRoll: 0.5,
      theme: { id: 'porcelain' },
    });

    expect(plan).toMatchObject({
      schemaVersion: 'weekly-gauntlet-launch-v1',
      week: 42,
      seed: 553,
      difficulty: 'hard',
      weaponIndex: 11,
      noShop: true,
      noPerkChoice: true,
      themeId: 'porcelain',
    });
    expect(plan.startPerkId).toBe(PERKS[plan.startPerkIndex].id);
  });

  it('fails closed into bounded playable defaults for hostile values', () => {
    const plan = buildWeeklyGauntletLaunch({ seed: -4, diffId: 'impossible', weaponIdx: 999, startPerkRoll: 4 });
    expect(plan.seed).toBe(1);
    expect(plan.difficulty).toBe('normal');
    expect(plan.weaponIndex).toBe(WEAPONS.length - 1);
    expect(plan.startPerkIndex).toBe(PERKS.length - 1);
  });
});
