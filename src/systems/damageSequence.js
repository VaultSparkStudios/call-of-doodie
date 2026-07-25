const MAX_EVENTS = 12;
const MAX_FRAME = 10_000_000;
const VALID_KINDS = new Set(["projectile", "contact", "boss", "hazard", "mine", "unknown"]);

function finite(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function boundedFrame(value) {
  return Math.max(0, Math.min(MAX_FRAME, Math.floor(finite(value))));
}

function sourceType(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.min(999, Math.floor(number))) : null;
}

function sourceName(value) {
  return String(value || "Unknown source").replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 40) || "Unknown source";
}

export function createDamageSequence() {
  return { schemaVersion: "damage-sequence-v1", events: [] };
}

export function recordDamageEvent(sequence, event = {}) {
  const target = sequence?.schemaVersion === "damage-sequence-v1" ? sequence : createDamageSequence();
  const frame = boundedFrame(event.frame);
  const healthBefore = Math.max(0, finite(event.healthBefore));
  const healthAfter = Math.max(0, finite(event.healthAfter, healthBefore));
  const damage = Math.max(0, finite(event.damage, healthBefore - healthAfter));
  if (damage <= 0) return target;

  const normalized = {
    startFrame: frame,
    endFrame: frame,
    wave: Math.max(1, Math.floor(finite(event.wave, 1))),
    kind: VALID_KINDS.has(event.kind) ? event.kind : "unknown",
    sourceType: sourceType(event.sourceType),
    sourceName: sourceName(event.sourceName),
    damage: Math.round(damage * 10) / 10,
    hits: 1,
    healthBefore: Math.round(healthBefore * 10) / 10,
    healthAfter: Math.round(healthAfter * 10) / 10,
  };

  const last = target.events.at(-1);
  const sameSource = last
    && last.kind === normalized.kind
    && last.sourceType === normalized.sourceType
    && last.sourceName === normalized.sourceName;
  if (sameSource && frame - last.endFrame <= 2 && frame - last.startFrame <= 30) {
    last.endFrame = frame;
    last.damage = Math.round((last.damage + normalized.damage) * 10) / 10;
    last.hits += 1;
    last.healthAfter = normalized.healthAfter;
    return target;
  }

  target.events.push(normalized);
  if (target.events.length > MAX_EVENTS) target.events.splice(0, target.events.length - MAX_EVENTS);
  return target;
}

export function applyObservedPlayerDamage(gs, event = {}) {
  const player = gs?.player;
  if (!player) return { healthBefore: 0, healthAfter: 0, damage: 0 };
  const healthBefore = Math.max(0, finite(player.health));
  const requestedAfter = Number(event.healthAfter);
  const amount = Math.max(0, finite(event.damage));
  // Preserve the game's existing health arithmetic (including a negative
  // terminal value). Only the persisted receipt is clamped to observable HP.
  const healthAfter = Number.isFinite(requestedAfter)
    ? requestedAfter
    : healthBefore - amount;
  player.health = healthAfter;
  gs.damageSequence = recordDamageEvent(gs.damageSequence, {
    ...event,
    frame: event.frame ?? gs.frameCount ?? 0,
    wave: event.wave ?? gs.currentWave ?? 1,
    healthBefore,
    healthAfter: Math.max(0, healthAfter),
    damage: Math.max(0, Math.min(healthBefore, healthBefore - healthAfter)),
  });
  return { healthBefore, healthAfter, damage: Math.max(0, healthBefore - healthAfter) };
}

export function finalizeDamageSequence(sequence, { maxHealth = 100, finalFrame = null } = {}) {
  const events = Array.isArray(sequence?.events) ? sequence.events.slice(-MAX_EVENTS) : [];
  const sanitized = events.map((event) => ({
    startFrame: boundedFrame(event.startFrame),
    endFrame: boundedFrame(event.endFrame),
    wave: Math.max(1, Math.floor(finite(event.wave, 1))),
    kind: VALID_KINDS.has(event.kind) ? event.kind : "unknown",
    sourceType: sourceType(event.sourceType),
    sourceName: sourceName(event.sourceName),
    damage: Math.max(0, Math.round(finite(event.damage) * 10) / 10),
    hits: Math.max(1, Math.min(999, Math.floor(finite(event.hits, 1)))),
    healthBefore: Math.max(0, Math.round(finite(event.healthBefore) * 10) / 10),
    healthAfter: Math.max(0, Math.round(finite(event.healthAfter) * 10) / 10),
  })).filter((event) => event.damage > 0);

  const endFrame = finalFrame == null ? (sanitized.at(-1)?.endFrame || 0) : boundedFrame(finalFrame);
  const recent = sanitized.filter((event) => event.endFrame >= endFrame - 360);
  const totalDamage = recent.reduce((sum, event) => sum + event.damage, 0);
  const hitCount = recent.reduce((sum, event) => sum + event.hits, 0);
  const finalTwoSecondDamage = recent
    .filter((event) => event.endFrame >= endFrame - 120)
    .reduce((sum, event) => sum + event.damage, 0);
  const safeMaxHealth = Math.max(1, finite(maxHealth, 100));
  const durationFrames = recent.length ? Math.max(0, endFrame - recent[0].startFrame) : 0;
  const largestEventDamage = recent.reduce((max, event) => Math.max(max, event.damage), 0);
  const finishStyle = finalTwoSecondDamage >= safeMaxHealth * 0.45 || largestEventDamage >= safeMaxHealth * 0.35
    ? "burst"
    : durationFrames >= 240 && finalTwoSecondDamage < safeMaxHealth * 0.3
      ? "attrition"
      : "mixed";

  const bySource = new Map();
  for (const event of recent) {
    const key = `${event.sourceType ?? "x"}|${event.sourceName}`;
    const current = bySource.get(key) || { sourceType: event.sourceType, sourceName: event.sourceName, damage: 0, hits: 0 };
    current.damage += event.damage;
    current.hits += event.hits;
    bySource.set(key, current);
  }
  const topSource = [...bySource.values()].sort((a, b) => b.damage - a.damage)[0] || null;

  return {
    schemaVersion: "damage-sequence-v1",
    claim: "observed-final-damage-window-not-causality",
    windowFrames: 360,
    finalFrame: endFrame,
    durationFrames,
    totalDamage: Math.round(totalDamage * 10) / 10,
    finalTwoSecondDamage: Math.round(finalTwoSecondDamage * 10) / 10,
    hitCount,
    finishStyle,
    topSource: topSource ? { ...topSource, damage: Math.round(topSource.damage * 10) / 10 } : null,
    events: recent,
  };
}

export function describeDamageSequence(receipt) {
  if (!receipt || receipt.schemaVersion !== "damage-sequence-v1" || receipt.hitCount < 1) {
    return "No final damage sequence was captured for this run.";
  }
  const seconds = Math.round((receipt.durationFrames / 60) * 10) / 10;
  const style = receipt.finishStyle === "burst"
    ? "a burst finish"
    : receipt.finishStyle === "attrition"
      ? "an attrition finish"
      : "a mixed finish";
  const source = receipt.topSource?.sourceName ? ` Top source: ${receipt.topSource.sourceName}.` : "";
  return `${receipt.totalDamage} damage across ${receipt.hitCount} recorded hit${receipt.hitCount === 1 ? "" : "s"} over ${seconds}s; ${receipt.finalTwoSecondDamage} landed in the final two seconds, ${style}.${source} This describes the captured window, not unrecorded causality.`;
}
