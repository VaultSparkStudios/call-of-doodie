import { WEAPONS, WEAPON_MASTERY_LEVELS } from '../constants.js';

function level(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(1, Math.floor(number)) : 1;
}

export function getWeaponMastery(weaponIndex, accountLevel = 1) {
  const index = Math.max(0, Math.min(WEAPONS.length - 1, Math.floor(Number(weaponIndex) || 0)));
  const masteryAccountLevel = WEAPON_MASTERY_LEVELS[index] ?? 1;
  const currentAccountLevel = level(accountLevel);
  return {
    index,
    name: WEAPONS[index]?.name || `Weapon ${index + 1}`,
    available: true,
    mastered: currentAccountLevel >= masteryAccountLevel,
    masteryAccountLevel,
    levelsRemaining: Math.max(0, masteryAccountLevel - currentAccountLevel),
  };
}

export function buildArsenalMasteryContract(accountLevel = 1) {
  const currentAccountLevel = level(accountLevel);
  const weapons = WEAPONS.map((_, index) => getWeaponMastery(index, currentAccountLevel));
  return {
    schemaVersion: 'arsenal-mastery-v2',
    availability: 'all-open',
    currentAccountLevel,
    weapons,
    masteredCount: weapons.filter((weapon) => weapon.mastered).length,
    nextMastery: weapons.find((weapon) => !weapon.mastered) || null,
  };
}
