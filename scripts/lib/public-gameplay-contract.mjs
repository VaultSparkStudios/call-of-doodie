import { BOSS_ROTATION } from "../../src/gameHelpers.js";
import {
  DIFFICULTIES,
  ENEMY_TYPES,
  META_UPGRADES,
  STARTER_LOADOUTS,
  WEAPONS,
  WEAPON_ARSENAL_MILESTONE_LEVELS,
} from "../../src/constants.js";
import { REPLAY_DIFFICULTIES, REPLAY_MODES, REPLAY_STARTERS } from "../../src/utils/replayCode.js";
import { FORMATION_COUNTERPLAY } from "../../src/systems/pressureArc.js";
import { killsRequiredForAccountLevel, PRESTIGE_REQUIRED_LEVEL } from "../../src/utils/progressionCurve.js";
import { buildReplayCoveragePassport } from "../../src/utils/replayCoverage.js";
import { OPERATIONS } from "../../src/systems/operationCampaign.js";
import { MODE_CATALOG, NEW_MODE_CATALOG } from "../../src/config/modeCatalog.js";
import { getOperationRouteIntel } from "../../src/systems/operationDirector.js";
import { OPERATION_ENCOUNTER_SCORE } from "../../src/systems/operationAudioDirector.js";
import { FIELD_MANUAL_SECTIONS } from "../../src/content/fieldManual.js";
import { CAPABILITY_EVIDENCE } from "../../src/content/capabilities.js";
import { createHash } from "node:crypto";
import { getModeDifficultyFacts } from "../../src/config/difficultyPolicy.js";
import { SCENARIO_SCHEMA_VERSION } from "../../src/utils/scenarioCartridge.js";

function label(id) {
  return String(id).split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

function weaponPattern(weapon) {
  if (weapon.hitscan) return "beam";
  if (weapon.boomerang) return "return";
  if (weapon.bouncesLeft) return "ricochet";
  if (weapon.pellets > 1) return "spread";
  if (weapon.burst > 1) return "burst";
  return "direct";
}

function weaponRangeCue(weapon) {
  if (/short range|close range/i.test(weapon.desc)) return "Close";
  if (/mid-range|medium range/i.test(weapon.desc)) return "Mid";
  if (weapon.hitscan || /precision/i.test(weapon.desc)) return "Long";
  return "Flexible";
}

function enemyRole(enemy, boss) {
  if (boss) return "boss";
  if (enemy.ranged) return "ranged";
  if (enemy.speed >= 2) return "rusher";
  if (enemy.health >= 100) return "heavy";
  return "pursuer";
}

export function buildPublicGameplayContract() {
  const bossTypes = new Set(BOSS_ROTATION);
  const contract = {
    schemaVersion: "gameplay-contract-v4",
    evidenceAsOf: CAPABILITY_EVIDENCE.checkedAt,
    canonicalUrl: "https://callofdoodie.wtf/",
    publisher: "VaultSpark Studios LLC",
    rights: "Proprietary — All Rights Reserved, VaultSpark Studios LLC",
    cost: { freeTierCostStatus: "cost-neutral", paidInferenceRequired: false },
    trust: {
      replayEvidence: "advisory deterministic decision-stream evidence",
      excludedClaim: "not full physics resimulation",
      replayCoverage: buildReplayCoveragePassport(),
      publicWriteActions: "not-offered",
    },
    loop: ["move", "shoot", "dash", "grenade", "switch_weapon", "interact", "checkpoint_choice", "power_sewer_pumps", "escape_backflow", "resolve_operation_encounter", "survive_wave", "review_debrief"],
    controls: { humanGuide: "/field-manual/", summary: FIELD_MANUAL_SECTIONS.find(([title]) => title === "Controls")?.[1] || "", source: "src/content/fieldManual.js" },
    formations: Object.entries(FORMATION_COUNTERPLAY).map(([id, formation]) => ({ id, label: formation.label, counterplay: formation.drill })),
    operations: OPERATIONS.map((operation) => ({
      id: operation.id,
      title: operation.title,
      brief: operation.brief,
      antagonist: operation.antagonist.name,
      seed: operation.seed,
      durationMinutes: operation.durationMinutes,
      encounterVerbs: operation.encounters.map((encounter) => encounter.verb),
      encounterTitles: operation.encounters.map((encounter) => encounter.title),
      priorRouteConsequence: operation.priorRouteConsequence,
      routeOptions: operation.routeOptions,
      routeIntel: operation.routeOptions.map((routeId) => getOperationRouteIntel(operation.id, routeId)),
      scoring: operation.scoring.summary,
      adaptiveScore: {
        policy: "default-action-vibe-only",
        explicitNonDefaultPreferences: "preserved",
        chapters: operation.encounters.map((encounter) => ({
          verb: encounter.verb,
          vibe: OPERATION_ENCOUNTER_SCORE[encounter.verb] || "boss-runtime",
        })),
      },
      campaignProgression: "local-operation-checkpoint",
      realtimeCoop: "gated-not-live",
    })),
    modes: [
      ...REPLAY_MODES.map((id) => {
        const mode = MODE_CATALOG.find((entry) => entry.id === id);
        return { id, label: mode?.label || label(id), kind: mode?.kind || "mode", objective: mode?.description || "", seededReplayCode: id !== "zombies", scoring: id === "zombies" ? "local-only" : "global-leaderboard-eligible",
          capabilities: { play: "browser-local", officialBoard: id === "zombies" ? "not-offered" : "eligible-only-after-server-check", unrankedPractice: true, liveMultiplayer: false } };
      }),
      ...NEW_MODE_CATALOG.map((mode) => ({ id: mode.id, label: mode.label, kind: mode.kind, objective: mode.description, seededReplayCode: false, scoring: "local-only",
        capabilities: { play: "browser-local", officialBoard: "not-offered", unrankedPractice: true, liveMultiplayer: false } })),
    ],
    difficulties: Object.entries(DIFFICULTIES).map(([id, difficulty]) => ({
      id,
      label: difficulty.label || label(id),
      playerHp: Number(difficulty.playerHP) || null,
      spawnMultiplier: Number(difficulty.spawnMult) || null,
      enemyHealthMultiplier: difficulty.healthMult,
      enemySpeedMultiplier: difficulty.speedMult,
      incomingDamageMultiplier: 1,
      modePolicies: [...MODE_CATALOG, ...NEW_MODE_CATALOG].map(mode => getModeDifficultyFacts(mode.id, id)),
    })),
    replayCodeDifficultySlots: REPLAY_DIFFICULTIES.length,
    starterLoadouts: REPLAY_STARTERS.map((id) => {
      const loadout = STARTER_LOADOUTS.find((entry) => entry.id === id);
      return { id, name: loadout?.name || label(id), description: loadout?.desc || "" };
    }),
    weapons: WEAPONS.map((weapon, index) => ({
      index,
      runtimeId: `weapon:${index}`,
      name: weapon.name,
      emoji: weapon.emoji,
      description: weapon.desc,
      baseDamagePerProjectile: weapon.damage,
      baseFireIntervalMs: weapon.fireRate,
      baseMagazine: weapon.maxAmmo,
      baseReloadMs: weapon.reloadTime,
      projectilesPerTrigger: weapon.pellets || weapon.burst || 1,
      pattern: weaponPattern(weapon),
      rangeCue: weaponRangeCue(weapon),
      availableAtStart: true,
      arsenalMilestoneLevel: WEAPON_ARSENAL_MILESTONE_LEVELS[index] ?? 1,
    })),
    enemies: ENEMY_TYPES.map((enemy, index) => ({
      index,
      runtimeId: `enemy:${index}`,
      name: enemy.name,
      emoji: enemy.emoji,
      ranged: Boolean(enemy.ranged),
      boss: bossTypes.has(index),
      role: enemyRole(enemy, bossTypes.has(index)),
      baseHealth: enemy.health,
      baseSpeed: enemy.speed,
      projectileIntervalFrames: enemy.ranged ? enemy.projRate : null,
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
      rivalry: { route: "/challenge/", schemaVersion: "challenge-invite-v2", queryParameters: ["cv", "seed", "diff", "mode", "loadout", "vs", "vsName", "duel", "exp", "check"],
        maxAgeDays: 7, integrity: "Non-cryptographic checksum; saved duel rows checked separately. Scores remain friendly and self-reported.",
        opponent: "saved-player-run-not-bot-or-live-person", launch: "preview-first-guest-accept-no-auto-start" },
      legacySeedLink: { route: "/", queryParameters: ["seed", "diff", "vs", "vsName"], note: "Direct legacy seed setup remains supported; it is not a verified score receipt." },
      scenarioCartridge: {
        schemaVersion: SCENARIO_SCHEMA_VERSION,
        supportedModes: [...MODE_CATALOG, ...NEW_MODE_CATALOG].map(mode => mode.id),
        supportedDifficulties: Object.keys(DIFFICULTIES),
        acceptsLegacy: "sewer-scenario-v1; authenticated nightmare slots migrate to insane",
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
      runAnalysisSchema: "https://callofdoodie.wtf/run-analysis-schema.json",
      status: "https://callofdoodie.wtf/status.json",
    },
  };
  contract.contentHash = `sha256:${createHash("sha256").update(JSON.stringify(contract)).digest("hex")}`;
  return contract;
}
