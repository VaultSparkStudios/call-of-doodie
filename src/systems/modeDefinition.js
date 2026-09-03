// modeDefinition — the layer that makes a mode a different game (S163).
//
// `modeRules.js` stays the *ruleset* contract (timer, score multiplier, shop/
// draft/routes booleans, zombie mutation) for the eight replay-eligible legacy
// ids. A mode definition sits on top and owns everything the ruleset cannot:
// allies, arena theme pool, objective set, wave script, win condition, and a
// per-frame mechanic. Legacy ids resolve to a passthrough definition so
// nothing changes for them.

import { getModeRules, LEGACY_MODE_IDS } from "./modeRules.js";
import { spawnAlly, summarizeSquad } from "./allyUnit.js";
import { stepAllies } from "./allyUnit.js";
import { summarizeZones } from "./zones.js";
import { getVerbObjectiveHud, tickVerbObjective } from "./objectiveHandlers.js";
import { BOSS_GAUNTLET } from "../modes/bossGauntlet.js";
import { HOLD_THE_THRONE } from "../modes/holdTheThrone.js";

function passthrough(id) {
  return Object.freeze({
    id,
    kind: LEGACY_MODE_IDS.includes(id) ? "legacy" : "mode",
    replayEligible: true,
    rulesetId: id,
    allies: null,
    arena: { themePool: null },
    hud: { squad: false, zones: false, parTimer: false, verbObjective: false },
    usesDirectorObjectives: true,
    init: null, onWaveStart: null, step: null, isBossWave: null, waveEnemyCount: null, winCondition: null,
  });
}

const DEFINITIONS = new Map([
  [BOSS_GAUNTLET.id, BOSS_GAUNTLET],
  [HOLD_THE_THRONE.id, HOLD_THE_THRONE],
]);

export const PLAYABLE_MODE_IDS = Object.freeze([...LEGACY_MODE_IDS, ...DEFINITIONS.keys()]);

export function getModeDefinition(id = "standard") {
  if (DEFINITIONS.has(id)) return DEFINITIONS.get(id);
  return passthrough(LEGACY_MODE_IDS.includes(id) ? id : "standard");
}

export function isNewModeId(id) {
  return DEFINITIONS.has(id);
}

export function getModeRuleset(modeDef) {
  return getModeRules(modeDef?.rulesetId || "standard");
}

/**
 * Fields to merge into gs at run start. Also spawns the declared squad once
 * the player position exists.
 */
export function createModeState(modeDef, gs, ctx = {}) {
  const base = {
    modeId: modeDef.id,
    modeKind: modeDef.kind,
    replayEligible: modeDef.replayEligible !== false,
    allies: [], zones: [], structures: [], flood: null, alarm: 0,
    activeVerbObjective: null,
    _targetables: [],
    _modeStartFrame: 0,
    _modeWon: false,
  };
  Object.assign(gs, base);
  if (Array.isArray(modeDef.allies)) {
    for (const personality of modeDef.allies) spawnAlly(gs, personality);
  }
  if (modeDef.arena?.themePool?.length) {
    const pool = modeDef.arena.themePool;
    gs.mapTheme = pool[(Number(gs.runSeed) >>> 0) % pool.length];
  }
  modeDef.init?.(gs, ctx);
  return gs;
}

export function onModeWaveStart(gs, modeDef, ctx = {}) {
  if (!modeDef?.onWaveStart) return;
  modeDef.onWaveStart(gs, ctx);
}

/**
 * Per-frame mode mechanics. Runs after enemies have moved. Returns a verdict
 * ("win" | "lose") or null.
 */
export function stepMode(gs, modeDef, ctx = {}) {
  if (Number.isFinite(ctx.frame)) gs.frame = ctx.frame;
  if (gs.allies?.length) stepAllies(gs, ctx);
  if (gs.activeVerbObjective) tickVerbObjective(gs, ctx);
  modeDef?.step?.(gs, ctx);
  if (gs._modeWon) return "win";
  if (gs._modeLost) return "lose";
  const verdict = modeDef?.winCondition?.(gs) || null;
  if (verdict === "win") gs._modeWon = true;
  if (verdict === "lose") gs._modeLost = true;
  return verdict;
}

export function isModeBossWave(modeDef, gs, legacyIsBoss) {
  if (modeDef?.isBossWave) return !!modeDef.isBossWave(gs);
  return !!legacyIsBoss;
}

export function getModeWaveEnemyCount(modeDef, gs, computed) {
  if (modeDef?.waveEnemyCount) return Math.max(0, Math.floor(modeDef.waveEnemyCount(gs, computed)));
  return computed;
}

/** HUD model: squad strip, zones, verb objective, par timer, mode banner. */
export function getModeHudModel(gs, modeDef) {
  if (!gs || !modeDef || modeDef.kind === "legacy") return null;
  return {
    id: modeDef.id,
    label: modeDef.label || modeDef.id,
    squad: modeDef.hud?.squad ? summarizeSquad(gs) : [],
    zones: modeDef.hud?.zones ? summarizeZones(gs) : [],
    verbObjective: modeDef.hud?.verbObjective ? getVerbObjectiveHud(gs) : null,
    banner: modeDef.banner?.(gs) || null,
    progress: modeDef.progress?.(gs) || null,
  };
}

export function listNewModes() {
  return [...DEFINITIONS.values()];
}
