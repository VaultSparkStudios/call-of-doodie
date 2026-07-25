const MAX_SOURCE_LENGTH = 32;
const MAX_LABEL_LENGTH = 48;

function boundedLabel(value, fallback, maxLength) {
  const normalized = typeof value === "string" ? value.trim() : "";
  return (normalized || fallback).slice(0, maxLength);
}

function optionalWeaponIndex(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 && parsed <= 99 ? parsed : null;
}

export function sanitizeEnemyDefeatMeta(meta = {}) {
  return {
    source: boundedLabel(meta.source, "unknown", MAX_SOURCE_LENGTH),
    weaponIdx: optionalWeaponIndex(meta.weaponIdx),
    weaponName: boundedLabel(meta.weaponName, "ENVIRONMENT", MAX_LABEL_LENGTH),
    beatEligible: meta.beatEligible === true,
  };
}

/**
 * Marks an already-lethal enemy for the single defeat-effect executor.
 * The first lethal source wins; later collisions in the same frame cannot
 * overwrite attribution or award the enemy twice.
 */
export function queueEnemyDefeat(enemy, meta = {}) {
  if (!enemy || Number(enemy.health) > 0 || enemy._defeatResolved || enemy._defeatPending) return false;
  enemy._defeatPending = sanitizeEnemyDefeatMeta(meta);
  return true;
}

/**
 * Applies positive finite damage and atomically queues the lethal transition.
 * Damage math remains owned by the caller; this boundary owns only mutation
 * ordering and exactly-once lethal attribution.
 */
export function applyEnemyDamage(enemy, amount, meta = {}) {
  if (!enemy || enemy._defeatResolved) return { applied: 0, lethal: false, queued: false };
  const applied = Number.isFinite(Number(amount)) ? Math.max(0, Number(amount)) : 0;
  if (applied <= 0) return { applied: 0, lethal: Number(enemy.health) <= 0, queued: false };
  enemy.health = (Number.isFinite(Number(enemy.health)) ? Number(enemy.health) : 0) - applied;
  const lethal = enemy.health <= 0;
  return {
    applied,
    lethal,
    queued: lethal ? queueEnemyDefeat(enemy, meta) : false,
  };
}

export function collectQueuedEnemyDefeats(enemies = []) {
  return Array.isArray(enemies)
    ? enemies.filter((enemy) => enemy?._defeatPending && !enemy._defeatResolved)
    : [];
}

/**
 * Finds lethal enemies that bypassed the attribution boundary. The live frame
 * reconciles these fail-closed as unattributed defeats and emits an integrity
 * receipt, so a future damage source cannot silently strand a corpse or evade
 * the exactly-once executor.
 */
export function collectUnqueuedLethalEnemies(enemies = []) {
  return Array.isArray(enemies)
    ? enemies.filter((enemy) => enemy && Number(enemy.health) <= 0 && !enemy._defeatPending && !enemy._defeatResolved)
    : [];
}

/**
 * Claims one queued defeat. Claiming immediately tombstones the enemy so any
 * recursive chain damage sees a resolved target and remains idempotent.
 */
export function takeQueuedEnemyDefeat(enemy) {
  if (!enemy?._defeatPending || enemy._defeatResolved) return null;
  const meta = sanitizeEnemyDefeatMeta(enemy._defeatPending);
  enemy._defeatResolved = true;
  delete enemy._defeatPending;
  enemy.health = -999;
  return meta;
}

/**
 * Ends an enemy without awarding a combat defeat. Reserved for explicit
 * self-removal or bulk-effect policies (for example Kamikaze and Tactical
 * Nuke) whose scoring contract intentionally differs from a weapon kill.
 */
export function retireEnemyWithoutDefeat(enemy, reason = "retired") {
  if (!enemy || enemy._defeatResolved) return false;
  enemy._defeatResolved = true;
  enemy._retireReason = boundedLabel(reason, "retired", MAX_SOURCE_LENGTH);
  delete enemy._defeatPending;
  enemy.health = -999;
  return true;
}
