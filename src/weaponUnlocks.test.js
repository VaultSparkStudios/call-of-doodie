import { describe, expect, it } from 'vitest';
import { WEAPONS, WEAPON_MASTERY_LEVELS } from './constants.js';
import { buildArsenalMasteryContract, getWeaponMastery } from './utils/arsenalMastery.js';

describe('open arsenal mastery contract', () => {
  it('covers every weapon with monotonic mastery thresholds', () => {
    expect(WEAPON_MASTERY_LEVELS).toHaveLength(WEAPONS.length);
    for (let index = 1; index < WEAPON_MASTERY_LEVELS.length; index += 1) {
      expect(WEAPON_MASTERY_LEVELS[index]).toBeGreaterThanOrEqual(WEAPON_MASTERY_LEVELS[index - 1]);
    }
  });

  it('makes every weapon available at every account level', () => {
    for (const accountLevel of [1, 5, 16]) {
      const contract = buildArsenalMasteryContract(accountLevel);
      expect(contract.schemaVersion).toBe('arsenal-mastery-v2');
      expect(contract.availability).toBe('all-open');
      expect(contract.weapons).toHaveLength(WEAPONS.length);
      expect(contract.weapons.every((weapon) => weapon.available)).toBe(true);
    }
  });

  it('awards recognition at the threshold without changing access', () => {
    const index = WEAPONS.length - 1;
    const threshold = WEAPON_MASTERY_LEVELS[index];
    expect(getWeaponMastery(index, threshold - 1)).toMatchObject({ available: true, mastered: false, levelsRemaining: 1 });
    expect(getWeaponMastery(index, threshold)).toMatchObject({ available: true, mastered: true, levelsRemaining: 0 });
  });

  it('normalizes hostile indices and account levels safely', () => {
    expect(getWeaponMastery(-99, Number.NaN)).toMatchObject({ index: 0, available: true, masteryAccountLevel: 1 });
    expect(getWeaponMastery(999, 0).index).toBe(WEAPONS.length - 1);
  });
});
