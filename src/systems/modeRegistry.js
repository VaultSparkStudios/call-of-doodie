// modeRegistry — dependency-free mode metadata (S163 bundle diet).
//
// App.jsx reads this at zero cost. The heavy mode runtime (definitions,
// allies, zones, verb handlers) lives in `modeDefinition.js` and is loaded
// with a dynamic import only when a run needs it: a new mode, or an Operation.

import { NEW_MODE_CATALOG } from "../config/modeCatalog.js";
import { LEGACY_MODE_IDS } from "./modeRules.js";

const NEW_IDS = new Set(NEW_MODE_CATALOG.map((mode) => mode.id));

export function isNewModeId(id) {
  return NEW_IDS.has(id);
}

/** Lightweight passthrough definition for legacy ids (no allies, no mechanic). */
export function getModeMeta(id = "standard") {
  const safe = LEGACY_MODE_IDS.includes(id) ? id : "standard";
  return Object.freeze({
    id: safe,
    kind: "legacy",
    replayEligible: true,
    rulesetId: safe,
    usesDirectorObjectives: true,
    label: null,
    isBossWave: null,
    waveEnemyCount: null,
    onBossDefeated: null,
  });
}

/** Does this run need the mode runtime chunk? */
export function needsModeRuntime(id, { operation = false } = {}) {
  return operation || isNewModeId(id);
}

/** Load the runtime chunk once; returns the module namespace or null. */
let runtimePromise = null;
export function loadModeRuntime(id, { operation = false } = {}) {
  if (!needsModeRuntime(id, { operation })) return Promise.resolve(null);
  if (!runtimePromise) runtimePromise = import("./modeDefinition.js");
  return runtimePromise;
}
