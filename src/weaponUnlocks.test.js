import { describe, expect, it } from 'vitest';
import { WEAPONS, WEAPON_ARSENAL_MILESTONE_LEVELS } from './constants.js';
import {
  buildArsenalMilestoneContract,
  buildWeaponMasteryContract,
  buildWeaponMasteryProjection,
  getWeaponArsenalMilestone,
} from './utils/arsenalMastery.js';

describe('open arsenal milestone contract', () => {
  it('covers every weapon with monotonic account milestones', () => {
    expect(WEAPON_ARSENAL_MILESTONE_LEVELS).toHaveLength(WEAPONS.length);
    for (let index = 1; index < WEAPON_ARSENAL_MILESTONE_LEVELS.length; index += 1) {
      expect(WEAPON_ARSENAL_MILESTONE_LEVELS[index]).toBeGreaterThanOrEqual(WEAPON_ARSENAL_MILESTONE_LEVELS[index - 1]);
    }
  });

  it('makes every weapon available at every account level', () => {
    for (const accountLevel of [1, 5, 16]) {
      const contract = buildArsenalMilestoneContract(accountLevel);
      expect(contract.schemaVersion).toBe('arsenal-milestones-v1');
      expect(contract.availability).toBe('all-open');
      expect(contract.weapons).toHaveLength(WEAPONS.length);
      expect(contract.weapons.every((weapon) => weapon.available)).toBe(true);
    }
  });

  it('awards recognition at the threshold without changing access', () => {
    const index = WEAPONS.length - 1;
    const threshold = WEAPON_ARSENAL_MILESTONE_LEVELS[index];
    expect(getWeaponArsenalMilestone(index, threshold - 1)).toMatchObject({ available: true, reached: false, levelsRemaining: 1 });
    expect(getWeaponArsenalMilestone(index, threshold)).toMatchObject({ available: true, reached: true, levelsRemaining: 0 });
  });

  it('normalizes hostile indices and account levels safely', () => {
    expect(getWeaponArsenalMilestone(-99, Number.NaN)).toMatchObject({ index: 0, available: true, arsenalMilestoneLevel: 1 });
    expect(getWeaponArsenalMilestone(999, 0).index).toBe(WEAPONS.length - 1);
  });

  it('derives mastery only from per-weapon kill evidence', () => {
    const contract = buildWeaponMasteryContract([49, 50, 999, 1000]);
    expect(contract.schemaVersion).toBe('weapon-mastery-v1');
    expect(contract.evidenceAvailable).toBe(true);
    expect(contract.weapons[0]).toMatchObject({ tier: 'rookie', kills: 49 });
    expect(contract.weapons[1]).toMatchObject({ tier: 'trained', kills: 50 });
    expect(contract.weapons[2]).toMatchObject({ tier: 'veteran', kills: 999 });
    expect(contract.weapons[3]).toMatchObject({ tier: 'legend', kills: 1000 });
    expect(contract.masteredCount).toBe(1);
    expect(contract.nextMastery).toMatchObject({ index: 0, name: WEAPONS[0].name });
  });

  it('does not infer mastery when per-weapon evidence is absent', () => {
    expect(buildWeaponMasteryContract()).toMatchObject({ evidenceAvailable: false, masteredCount: null, nextMastery: null });
    expect(buildWeaponMasteryProjection()).toBeNull();
  });

  it('projects the nearest evidence-backed mastery tier without changing access', () => {
    const projection = buildWeaponMasteryProjection([49, 10, 1000]);
    expect(projection).toMatchObject({
      schemaVersion: 'weapon-mastery-projection-v1',
      source: 'career.weaponLegendKills',
      availability: 'all-open',
      complete: false,
      weaponIndex: 0,
      currentTier: 'rookie',
      nextTier: 'trained',
      killsRemaining: 1,
    });
    expect(projection.label).toContain('ROOKIE → TRAINED');
    expect(projection.detail).toContain('1 weapon kill');
  });

  it('reports a complete arsenal only when every weapon has legend evidence', () => {
    expect(buildWeaponMasteryProjection(WEAPONS.map(() => 1000))).toMatchObject({
      complete: true,
      label: 'ARSENAL MASTERY COMPLETE',
      availability: 'all-open',
    });
  });
});
