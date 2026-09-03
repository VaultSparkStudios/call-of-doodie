// Keys on `gs` that are presentation-only: they never influence simulation
// outcomes and are stripped before hashing a sim snapshot (S163). Keep this
// list additive; a key that is missing here but *is* presentation will only
// cause spurious hash mismatches, never a wrong simulation.
export const PRESENTATION_KEYS = Object.freeze([
  "particles",
  "floatingTexts",
  "dyingEnemies",
  "screenShake",
  "damageFlash",
  "killFlash",
  "muzzleFlash",
  "trail",
  "flowField",
  "_enemyFrameIndex",
  "_runRngStreams",
  "_runRngSeed",
  "_ffTimer",
  "_ffPx",
  "_ffPy",
  "_globalTauntCooldown",
  "_formationToastedThisWave",
  "_lastFormationLabel",
  "_movementReceipt",
  "_emptyClickAt",
  "visualPack",
  "pressureArc",
  "damageSequence",
  "wavePlanLedger",
  "waveTelemetryBand",
]);

const PRESENTATION_SET = new Set(PRESENTATION_KEYS);

// Per-entity fields that are cosmetic timers.
const ENTITY_PRESENTATION_FIELDS = new Set([
  "hitFlash", "_spawnFlashTimer", "_tauntCooldown", "phantomVisible", "phantomTimer", "wobble",
]);

function plain(value, depth) {
  if (depth > 6) return null;
  if (value === null || value === undefined) return value;
  if (typeof value === "function" || typeof value === "symbol") return undefined;
  if (typeof value === "number") return Number.isFinite(value) ? Math.round(value * 1000) / 1000 : null;
  if (typeof value !== "object") return value;
  if (value instanceof Map || value instanceof Set) return undefined;
  if (Array.isArray(value)) return value.map((item) => plain(item, depth + 1));
  const out = {};
  for (const key of Object.keys(value).sort()) {
    if (depth === 1 && ENTITY_PRESENTATION_FIELDS.has(key)) continue;
    const v = plain(value[key], depth + 1);
    if (v !== undefined) out[key] = v;
  }
  return out;
}

/** Return a JSON-safe, sorted, presentation-stripped copy of a sim state. */
export function snapshotSimState(gs = {}) {
  const out = {};
  for (const key of Object.keys(gs).sort()) {
    if (PRESENTATION_SET.has(key)) continue;
    const v = plain(gs[key], 0);
    if (v !== undefined) out[key] = v;
  }
  return out;
}

/** Stable 32-bit FNV-1a hash of a sim snapshot (hex). */
export function hashSimState(gs = {}) {
  const text = JSON.stringify(snapshotSimState(gs));
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}
