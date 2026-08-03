import { META_UPGRADES } from "../constants.js";
import { buildArsenalMasteryContract } from "./arsenalMastery.js";

const DEFAULT_KILLS_PER_RUN = Object.freeze([10, 25, 50]);

function count(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.floor(number)) : 0;
}

function runsForKills(kills, scenarios = DEFAULT_KILLS_PER_RUN) {
  const required = count(kills);
  return Object.fromEntries(
    scenarios
      .map(count)
      .filter((value) => value > 0)
      .map((killsPerRun) => [String(killsPerRun), Math.ceil(required / killsPerRun)]),
  );
}

export function getAccountLevel(totalKills) {
  return Math.floor(Math.sqrt(count(totalKills) / 20)) + 1;
}

export function killsRequiredForAccountLevel(level) {
  const normalizedLevel = Math.max(1, count(level));
  return 20 * (normalizedLevel - 1) ** 2;
}

export function buildProgressionRunway({
  totalKills = 0,
  careerPoints = 0,
  upgradeTiers = {},
  killsPerRunScenarios = DEFAULT_KILLS_PER_RUN,
} = {}) {
  const kills = count(totalKills);
  const points = count(careerPoints);
  const accountLevel = getAccountLevel(kills);

  const arsenalMastery = buildArsenalMasteryContract(accountLevel);
  const nextMastery = arsenalMastery.nextMastery
    ? {
        ...arsenalMastery.nextMastery,
        accountLevel: arsenalMastery.nextMastery.masteryAccountLevel,
        totalKillsRequired: killsRequiredForAccountLevel(arsenalMastery.nextMastery.masteryAccountLevel),
      }
    : null;
  if (nextMastery) {
    nextMastery.killsRemaining = Math.max(0, nextMastery.totalKillsRequired - kills);
    nextMastery.runsByKillsPerRun = runsForKills(nextMastery.killsRemaining, killsPerRunScenarios);
  }

  const upgradeCandidates = META_UPGRADES.flatMap((group) => {
    const ownedTier = Math.min(group.tiers.length, count(upgradeTiers?.[group.id]));
    const tier = group.tiers[ownedTier];
    return tier ? [{
      id: group.id,
      name: group.name,
      tier: ownedTier + 1,
      cost: count(tier.cost),
      description: tier.desc,
    }] : [];
  }).sort((a, b) => a.cost - b.cost || a.name.localeCompare(b.name));

  const nextUpgrade = upgradeCandidates[0] || null;
  if (nextUpgrade) {
    nextUpgrade.pointsRemaining = Math.max(0, nextUpgrade.cost - points);
    nextUpgrade.runsByKillsPerRun = runsForKills(nextUpgrade.pointsRemaining, killsPerRunScenarios);
  }

  const nextAccountLevel = accountLevel + 1;
  const nextLevelKills = killsRequiredForAccountLevel(nextAccountLevel);

  return {
    schemaVersion: "progression-runway-v2",
    source: "career-kills-and-points",
    arsenal: {
      availability: arsenalMastery.availability,
      totalWeapons: arsenalMastery.weapons.length,
      masteredCount: arsenalMastery.masteredCount,
    },
    assumptions: {
      careerPointsPerKill: 1,
      scenariosAreDescriptiveNotTargets: true,
      killsPerRun: killsPerRunScenarios.map(count).filter((value) => value > 0),
    },
    current: { totalKills: kills, careerPoints: points, accountLevel },
    nextLevel: {
      accountLevel: nextAccountLevel,
      totalKillsRequired: nextLevelKills,
      killsRemaining: Math.max(0, nextLevelKills - kills),
      runsByKillsPerRun: runsForKills(Math.max(0, nextLevelKills - kills), killsPerRunScenarios),
    },
    nextMastery,
    nextUpgrade,
    remainingUpgradePaths: upgradeCandidates.length,
  };
}

export function describeProgressionRunway(runway) {
  if (!runway?.current) return "Progression runway unavailable.";
  if (runway.nextUpgrade?.pointsRemaining === 0) {
    return `${runway.nextUpgrade.name} tier ${runway.nextUpgrade.tier} is affordable now; no balance outcome is inferred.`;
  }
  if (runway.nextMastery && runway.nextUpgrade) {
    return `${runway.nextMastery.name} mastery needs ${runway.nextMastery.killsRemaining} more career kills; ${runway.nextUpgrade.name} tier ${runway.nextUpgrade.tier} needs ${runway.nextUpgrade.pointsRemaining} more career points.`;
  }
  if (runway.nextUpgrade) {
    return `All weapon mastery badges earned; ${runway.nextUpgrade.name} tier ${runway.nextUpgrade.tier} needs ${runway.nextUpgrade.pointsRemaining} more career points.`;
  }
  return "Every weapon mastery badge and permanent upgrade path is complete.";
}
