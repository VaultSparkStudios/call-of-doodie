// deathAttribution — one pure authority for "what killed you" (S167).
//
// Before this module, handlePlayerDeath read `gs._lastDamageBy` (never written
// since the S163 enemy-frame extraction) and fell back to the nearest enemy's
// `.type` — a field enemies do not carry (they carry `typeIndex`). Every
// consumer of the killer — MOST WANTED killed-by counts, adaptive telegraphing,
// the Run Coach "what killed you" pattern, nemesis boss tracking, ghost and
// run-history killedByType — therefore received nothing.
//
// Evidence order:
//   1. the last recorded damage-sequence event (observed; carries the exact
//      source type and name, including non-enemy hazards such as the flood),
//   2. the nearest live enemy at the moment of death (a proximity hypothesis).
// The result says which it used, so no surface can present a guess as proof.

const SEQUENCE_SCHEMA = "damage-sequence-v1";

function finite(value) {
  if (value == null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function cleanName(value) {
  return String(value || "").replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 40) || null;
}

function liveEnemies(gs) {
  return (gs?.enemies || []).filter((enemy) => enemy && !enemy._defeatResolved && Number.isFinite(enemy.x) && Number.isFinite(enemy.y));
}

function nearestEnemy(gs) {
  const player = gs?.player;
  if (!player || !Number.isFinite(player.x) || !Number.isFinite(player.y)) return null;
  let best = null;
  let bestDistance = Infinity;
  for (const enemy of liveEnemies(gs)) {
    const distance = Math.hypot(enemy.x - player.x, enemy.y - player.y);
    if (distance < bestDistance) { bestDistance = distance; best = enemy; }
  }
  return best ? { enemy: best, distance: bestDistance } : null;
}

function lastDamageEvent(gs) {
  const sequence = gs?.damageSequence;
  if (sequence?.schemaVersion !== SEQUENCE_SCHEMA || !Array.isArray(sequence.events)) return null;
  for (let index = sequence.events.length - 1; index >= 0; index -= 1) {
    const event = sequence.events[index];
    if (event && finite(event.damage) > 0) return event;
  }
  return null;
}

/**
 * @returns {null | {
 *   typeIndex: number | null,      // ENEMY_TYPES index when an enemy is the source
 *   sourceName: string | null,
 *   kind: string,                   // damage kind, or "proximity" for the fallback
 *   evidenceLevel: "observed" | "hypothesis",
 *   basis: "damage-sequence" | "nearest-enemy",
 *   boss: boolean,
 *   hazard: boolean,                // true when the observed source is not an enemy
 *   distance: number | null,        // only for the proximity fallback
 * }}
 */
export function resolveDeathAttribution(gs) {
  const event = lastDamageEvent(gs);
  if (event) {
    const typeIndex = finite(event.sourceType);
    const kind = String(event.kind || "unknown");
    const matching = typeIndex == null ? null : liveEnemies(gs).find((enemy) => finite(enemy.typeIndex) === typeIndex) || null;
    return {
      typeIndex,
      sourceName: cleanName(event.sourceName),
      kind,
      evidenceLevel: "observed",
      basis: "damage-sequence",
      boss: kind === "boss" || !!matching?.isBossEnemy,
      hazard: typeIndex == null,
      distance: null,
    };
  }
  const nearest = nearestEnemy(gs);
  if (!nearest) return null;
  const typeIndex = finite(nearest.enemy.typeIndex);
  if (typeIndex == null) return null;
  return {
    typeIndex,
    sourceName: cleanName(nearest.enemy.name),
    kind: "proximity",
    evidenceLevel: "hypothesis",
    basis: "nearest-enemy",
    boss: !!nearest.enemy.isBossEnemy,
    hazard: false,
    distance: Math.round(nearest.distance),
  };
}

/** Bounded, serializable receipt for run history and agent projections. */
export function describeDeathAttribution(attribution) {
  if (!attribution) return "No killer could be attributed for this run.";
  const who = attribution.sourceName || (attribution.typeIndex != null ? `enemy type ${attribution.typeIndex}` : "an unrecorded source");
  if (attribution.basis === "damage-sequence") {
    return attribution.hazard
      ? `The last recorded damage came from ${who} (${attribution.kind}).`
      : `The last recorded damage came from ${who}.`;
  }
  return `No damage was recorded; ${who} was the nearest threat (${attribution.distance}px) when the run ended.`;
}
