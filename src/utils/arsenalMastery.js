import { WEAPONS, WEAPON_ARSENAL_MILESTONE_LEVELS } from '../constants.js';

function level(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(1, Math.floor(number)) : 1;
}

export function getWeaponArsenalMilestone(weaponIndex, accountLevel = 1) {
  const index = Math.max(0, Math.min(WEAPONS.length - 1, Math.floor(Number(weaponIndex) || 0)));
  const arsenalMilestoneLevel = WEAPON_ARSENAL_MILESTONE_LEVELS[index] ?? 1;
  const currentAccountLevel = level(accountLevel);
  return {
    index,
    name: WEAPONS[index]?.name || `Weapon ${index + 1}`,
    available: true,
    reached: currentAccountLevel >= arsenalMilestoneLevel,
    arsenalMilestoneLevel,
    levelsRemaining: Math.max(0, arsenalMilestoneLevel - currentAccountLevel),
  };
}

// S145 — real per-weapon mastery derived from career kills with that weapon
// (career.weaponLegendKills, the same source as the 1000-kill LEGEND
// evolution). Account-level thresholds are separate arsenal milestones; they
// never imply mastery of a weapon the player has not used.
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

export function buildWeaponMasteryContract(weaponKills = null) {
  const evidenceAvailable = Array.isArray(weaponKills);
  const weapons = WEAPONS.map((_, index) => (
    evidenceAvailable ? getWeaponKillMastery(index, weaponKills[index] || 0) : null
  ));
  const targets = weapons
    .filter(Boolean)
    .filter((weapon) => weapon.nextTier)
    .sort((a, b) => a.nextTier.killsNeeded - b.nextTier.killsNeeded || a.index - b.index);
  return {
    schemaVersion: 'weapon-mastery-v1',
    source: 'career.weaponLegendKills',
    availability: 'all-open',
    evidenceAvailable,
    weapons,
    masteredCount: evidenceAvailable ? weapons.filter((weapon) => weapon.tier === 'legend').length : null,
    nextMastery: targets[0]
      ? { ...targets[0], name: WEAPONS[targets[0].index]?.name || `Weapon ${targets[0].index + 1}` }
      : null,
  };
}

export function buildArsenalMilestoneContract(accountLevel = 1) {
  const currentAccountLevel = level(accountLevel);
  const weapons = WEAPONS.map((_, index) => getWeaponArsenalMilestone(index, currentAccountLevel));
  return {
    schemaVersion: 'arsenal-milestones-v1',
    availability: 'all-open',
    currentAccountLevel,
    weapons,
    reachedCount: weapons.filter((weapon) => weapon.reached).length,
    nextMilestone: weapons.find((weapon) => !weapon.reached) || null,
  };
}
