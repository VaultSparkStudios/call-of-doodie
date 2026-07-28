import { BOSS_ROTATION } from "../../src/gameHelpers.js";
import {
  DIFFICULTIES,
  ENEMY_TYPES,
  META_UPGRADES,
  STARTER_LOADOUTS,
  WEAPONS,
  WEAPON_UNLOCK_LEVELS,
} from "../../src/constants.js";
import { REPLAY_DIFFICULTIES, REPLAY_MODES, REPLAY_STARTERS } from "../../src/utils/replayCode.js";
import { FORMATION_COUNTERPLAY } from "../../src/systems/pressureArc.js";

function label(id) {
  return String(id).split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

export function buildPublicGameplayContract() {
  const bossTypes = new Set(BOSS_ROTATION);
  return {
    schemaVersion: "gameplay-contract-v1",
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
      unlockAccountLevel: WEAPON_UNLOCK_LEVELS[index] ?? 1,
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
    challengeLinks: {
      replayCode: { queryParameter: "replay", format: "12 hexadecimal characters", captures: ["seed", "mode", "difficulty", "weapon", "starter_loadout"] },
      rivalry: { queryParameters: ["seed", "diff", "vs", "vsName"], note: "Player choices remain player-controlled." },
    },
    resources: {
      agents: "https://callofdoodie.wtf/agents.json",
      llms: "https://callofdoodie.wtf/.well-known/llms.txt",
      privacy: "https://callofdoodie.wtf/privacy/",
      terms: "https://callofdoodie.wtf/terms/",
      rights: "https://callofdoodie.wtf/ip/",
    },
  };
}
