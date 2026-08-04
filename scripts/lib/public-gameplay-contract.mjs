import { BOSS_ROTATION } from "../../src/gameHelpers.js";
import {
  DIFFICULTIES,
  ENEMY_TYPES,
  META_UPGRADES,
  STARTER_LOADOUTS,
  WEAPONS,
  WEAPON_MASTERY_LEVELS,
} from "../../src/constants.js";
import { REPLAY_DIFFICULTIES, REPLAY_MODES, REPLAY_STARTERS } from "../../src/utils/replayCode.js";
import { FORMATION_COUNTERPLAY } from "../../src/systems/pressureArc.js";
import { killsRequiredForAccountLevel, PRESTIGE_REQUIRED_LEVEL } from "../../src/utils/progressionCurve.js";

function label(id) {
  return String(id).split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

export function buildPublicGameplayContract() {
  const bossTypes = new Set(BOSS_ROTATION);
  return {
    schemaVersion: "gameplay-contract-v2",
    canonicalUrl: "https://callofdoodie.wtf/",
    publisher: "VaultSpark Studios LLC",
    rights: "Proprietary — All Rights Reserved, VaultSpark Studios LLC",
    cost: { freeTierCostStatus: "cost-neutral", paidInferenceRequired: false },
    trust: {
      replayEvidence: "advisory deterministic decision-stream evidence",
      excludedClaim: "not full physics resimulation",
      publicWriteActions: "not-offered",
    },
    loop: ["move", "shoot", "dash", "grenade", "switch_weapon", "choose_perk", "choose_route", "survive_wave", "review_debrief"],
    formations: Object.entries(FORMATION_COUNTERPLAY).map(([id, formation]) => ({ id, label: formation.label, counterplay: formation.drill })),
    modes: REPLAY_MODES.map((id) => ({ id, label: label(id), seededReplayCode: true })),
    difficulties: REPLAY_DIFFICULTIES.map((id) => ({
      id,
      label: DIFFICULTIES[id]?.label || label(id),
      playerHp: Number(DIFFICULTIES[id]?.playerHP) || null,
      spawnMultiplier: Number(DIFFICULTIES[id]?.spawnMult) || null,
    })),
    starterLoadouts: REPLAY_STARTERS.map((id) => {
      const loadout = STARTER_LOADOUTS.find((entry) => entry.id === id);
      return { id, name: loadout?.name || label(id), description: loadout?.desc || "" };
    }),
    weapons: WEAPONS.map((weapon, index) => ({
      index,
      name: weapon.name,
      emoji: weapon.emoji,
      availableAtStart: true,
      masteryAccountLevel: WEAPON_MASTERY_LEVELS[index] ?? 1,
    })),
    enemies: ENEMY_TYPES.map((enemy, index) => ({
      index,
      name: enemy.name,
      emoji: enemy.emoji,
      ranged: Boolean(enemy.ranged),
      boss: bossTypes.has(index),
    })),
    permanentUpgrades: META_UPGRADES.map((group) => ({
      id: group.id,
      name: group.name,
      tiers: group.tiers.map((tier, index) => ({ tier: index + 1, cost: tier.cost, description: tier.desc })),
    })),
    prestige: {
      requiredAccountLevel: PRESTIGE_REQUIRED_LEVEL,
      totalKillsRequired: killsRequiredForAccountLevel(PRESTIGE_REQUIRED_LEVEL),
      levelFormula: "floor(sqrt(totalCareerKills / 20)) + 1",
      projectionScenariosKillsPerRun: [10, 25, 50],
      projectionClaimScope: "descriptive scenario, not promised player outcome",
      source: "src/utils/progressionCurve.js",
    },
    challengeLinks: {
      replayCode: { queryParameter: "replay", format: "12 hexadecimal characters", captures: ["seed", "mode", "difficulty", "weapon", "starter_loadout"] },
      rivalry: { queryParameters: ["seed", "diff", "vs", "vsName"], note: "Player choices remain player-controlled." },
      scenarioCartridge: {
        schemaVersion: "sewer-scenario-v1",
        queryParameter: "scenario",
        captures: ["seed", "mode", "difficulty", "starter_loadout", "optional_target_score", "optional_rival"],
        integrity: "FNV-1a checksum rejects accidental or opportunistic field tampering; it is not a cryptographic signature.",
        relay: "Account-free asynchronous URL handoff. Loading never auto-starts a run.",
      },
    },
    resources: {
      agents: "https://callofdoodie.wtf/agents.json",
      llms: "https://callofdoodie.wtf/.well-known/llms.txt",
      privacy: "https://callofdoodie.wtf/privacy/",
      terms: "https://callofdoodie.wtf/terms/",
      rights: "https://callofdoodie.wtf/ip/",
      fieldManual: "https://callofdoodie.wtf/field-manual.json",
      status: "https://callofdoodie.wtf/status.json",
    },
  };
}
