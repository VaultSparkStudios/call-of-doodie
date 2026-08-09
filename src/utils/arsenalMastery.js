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

// S145 — real per-weapon mastery derived from career kills with that weapon
// (career.weaponLegendKills, the same source as the 1000-kill LEGEND
// evolution). Account-level mastery labels remain as the legacy fallback.
export const WEAPON_KILL_TIERS = Object.freeze([
  { id: "rookie", label: "ROOKIE", kills: 0, color: "#8A949C" },
  { id: "trained", label: "TRAINED", kills: 50, color: "#5EE68A" },
  { id: "veteran", label: "VETERAN", kills: 250, color: "#7FE6FF" },
  { id: "legend", label: "LEGEND", kills: 1000, color: "#FFD700" },
]);

export function getWeaponKillMastery(weaponIndex, weaponKills = 0) {
  const index = Math.max(0, Math.min(WEAPONS.length - 1, Math.floor(Number(weaponIndex) || 0)));
  const kills = Math.max(0, Math.floor(Number(weaponKills) || 0));
  let tier = WEAPON_KILL_TIERS[0];
  for (const candidate of WEAPON_KILL_TIERS) {
    if (kills >= candidate.kills) tier = candidate;
  }
  const nextTier = WEAPON_KILL_TIERS[WEAPON_KILL_TIERS.indexOf(tier) + 1] || null;
  return {
    index,
    kills,
    tier: tier.id,
    tierLabel: tier.label,
    tierColor: tier.color,
    nextTier: nextTier ? { id: nextTier.id, label: nextTier.label, killsNeeded: nextTier.kills - kills } : null,
    progress: nextTier ? Math.min(1, (kills - tier.kills) / (nextTier.kills - tier.kills)) : 1,
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
