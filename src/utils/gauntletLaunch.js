import { DIFFICULTIES, PERKS, WEAPONS } from '../constants.js';
import { getPerkArchetypeMatches } from './buildArchetypes.js';

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
  const startPerk = PERKS[startPerkIndex] || null;
  // The fixed opening perk implicitly leans toward one build doctrine — surface it as
  // flavor text on the Gauntlet card so the two systems read as connected, not coincidental.
  const doctrineTag = getPerkArchetypeMatches(startPerk)[0] || null;

  return {
    schemaVersion: 'weekly-gauntlet-launch-v1',
    week: Math.max(0, Math.floor(Number(contract?.weekNum) || 0)),
    seed,
    difficulty,
    weaponIndex,
    startPerkIndex,
    startPerkId: startPerk?.id || null,
    noShop: true,
    noPerkChoice: true,
    themeId: contract?.theme?.id || contract?.theme?.label || null,
    doctrineTagId: doctrineTag?.id || null,
    doctrineTagName: doctrineTag?.doctrineName || null,
  };
}
