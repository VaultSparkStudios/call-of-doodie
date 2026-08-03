import { DIFFICULTIES, PERKS, WEAPONS } from '../constants.js';

function boundedIndex(value, length) {
  const index = Math.floor(Number(value));
  if (!Number.isFinite(index)) return 0;
  return Math.max(0, Math.min(length - 1, index));
}

export function buildWeeklyGauntletLaunch(contract) {
  const seed = Math.max(1, Math.floor(Number(contract?.seed) || 1));
  const difficulty = DIFFICULTIES[contract?.diffId] ? contract.diffId : 'normal';
  const weaponIndex = boundedIndex(contract?.weaponIdx, WEAPONS.length);
  const roll = Math.max(0, Math.min(0.999999, Number(contract?.startPerkRoll) || 0));
  const startPerkIndex = boundedIndex(Math.floor(roll * PERKS.length), PERKS.length);

  return {
    schemaVersion: 'weekly-gauntlet-launch-v1',
    week: Math.max(0, Math.floor(Number(contract?.weekNum) || 0)),
    seed,
    difficulty,
    weaponIndex,
    startPerkIndex,
    startPerkId: PERKS[startPerkIndex]?.id || null,
    noShop: true,
    noPerkChoice: true,
    themeId: contract?.theme?.id || contract?.theme?.label || null,
  };
}
