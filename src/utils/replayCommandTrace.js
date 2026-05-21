const MAX_EVENTS = 240;
export const MAX_TRACE_BODY_BYTES = 10000;
const FRAME_BUCKET = 6;
const VALID_ACTIONS = new Set([
  "move",
  "aim",
  "shoot",
  "reload",
  "dash",
  "grenade",
  "perk",
  "route",
  "shop",
  "swap",
  "pause",
]);

function safeInt(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? Math.floor(num) : fallback;
}

function clamp(num, min, max) {
  return Math.max(min, Math.min(max, num));
}

function cleanAction(action) {
  const value = String(action || "").trim().toLowerCase();
  return VALID_ACTIONS.has(value) ? value : "move";
}

function cleanValue(value) {
  if (value == null) return "";
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_.:-]/g, "")
    .slice(0, 24);
}

export function directionBucket(dx = 0, dy = 0) {
  const x = Number(dx) || 0;
  const y = Number(dy) || 0;
  if (Math.hypot(x, y) < 0.01) return "neutral";
  const angle = Math.atan2(y, x);
  const octants = ["e", "se", "s", "sw", "w", "nw", "n", "ne"];
  const idx = Math.round(angle / (Math.PI / 4));
  return octants[(idx + 8) % 8];
}

function checksum(serialized) {
  let hash = 2166136261;
  for (let i = 0; i < serialized.length; i++) {
    hash ^= serialized.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).toUpperCase().padStart(8, "0");
}

export function normalizeReplayCommandTrace(events = [], { maxEvents = MAX_EVENTS } = {}) {
  const normalized = events
    .map((event) => ({
      f: clamp(safeInt(event?.frame ?? event?.f, 0), 0, 999999),
      a: cleanAction(event?.action ?? event?.a),
      v: cleanValue(event?.value ?? event?.v),
    }))
    .filter((event) => event.f >= 0)
    .sort((left, right) => left.f - right.f || left.a.localeCompare(right.a) || left.v.localeCompare(right.v))
    .slice(0, clamp(safeInt(maxEvents, MAX_EVENTS), 1, MAX_EVENTS));

  let lastKey = "";
  return normalized.filter((event) => {
    event.f = Math.floor(event.f / FRAME_BUCKET) * FRAME_BUCKET;
    const key = `${event.f}:${event.a}:${event.v}`;
    if (key === lastKey) return false;
    lastKey = key;
    return true;
  });
}

export function recordReplayCommandEvent(events = [], event = {}, options = {}) {
  const maxEvents = clamp(safeInt(options.maxEvents, MAX_EVENTS), 1, MAX_EVENTS);
  const target = Array.isArray(events) ? events : [];
  target.push({
    frame: safeInt(event.frame ?? event.f, 0),
    action: cleanAction(event.action ?? event.a),
    value: cleanValue(event.value ?? event.v),
  });
  if (target.length > maxEvents) {
    target.splice(0, target.length - maxEvents);
  }
  return target;
}

export function serializeReplayCommandTrace(events = [], options = {}) {
  return normalizeReplayCommandTrace(events, options)
    .map((event) => `${event.f.toString(36)}.${event.a}.${event.v}`)
    .join("~");
}

export function encodeReplayCommandTrace(events = [], options = {}) {
  const body = serializeReplayCommandTrace(events, options);
  return {
    v: 1,
    bucket: FRAME_BUCKET,
    count: body ? body.split("~").length : 0,
    body,
    digest: checksum(body),
  };
}

export function isValidReplayCommandTrace(trace) {
  if (!trace || trace.v !== 1 || trace.bucket !== FRAME_BUCKET) return false;
  if (typeof trace.body !== "string" || !/^[a-z0-9._:~-]*$/.test(trace.body)) return false;
  if (trace.body.length > MAX_TRACE_BODY_BYTES) return false;
  const events = decodeReplayCommandTrace(trace);
  return events != null && trace.digest === checksum(trace.body) && events.length === trace.count;
}

export function decodeReplayCommandTrace(trace) {
  if (!trace || typeof trace.body !== "string") return null;
  if (trace.body === "") return [];
  const events = trace.body.split("~").map((part) => {
    const [frame, action, value = ""] = part.split(".");
    return {
      f: parseInt(frame, 36),
      a: action,
      v: value,
    };
  });
  if (events.some((event) => !Number.isFinite(event.f) || !VALID_ACTIONS.has(event.a))) return null;
  return events;
}

export function summarizeReplayCommandTrace(trace) {
  const events = decodeReplayCommandTrace(trace) || [];
  const actions = {};
  for (const event of events) actions[event.a] = (actions[event.a] || 0) + 1;
  return {
    v: trace?.v ?? 1,
    count: events.length,
    firstFrame: events[0]?.f ?? null,
    lastFrame: events.at(-1)?.f ?? null,
    actions,
    digest: trace?.digest ?? checksum(""),
  };
}

export function analyzeReplayCommandTrace(trace) {
  const valid = isValidReplayCommandTrace(trace);
  const events = valid ? decodeReplayCommandTrace(trace) || [] : [];
  const summary = summarizeReplayCommandTrace(valid ? trace : null);
  const durationFrames = events.length > 1 ? Math.max(0, events.at(-1).f - events[0].f) : 0;
  const movementCount = summary.actions.move || 0;
  const aimCount = summary.actions.aim || 0;
  const shootCount = summary.actions.shoot || 0;
  const interactionCount = ["shoot", "reload", "dash", "grenade", "perk", "route", "shop", "swap", "pause"]
    .reduce((total, action) => total + (summary.actions[action] || 0), 0);
  const weaknessReasons = [];

  if (!valid) weaknessReasons.push("invalid-trace");
  if (events.length === 0) weaknessReasons.push("no-events");
  if (events.length > 0 && events.length < 3) weaknessReasons.push("too-few-events");
  if (durationFrames > 0 && durationFrames < 60) weaknessReasons.push("short-duration");
  if (movementCount < 2) weaknessReasons.push("low-movement-evidence");
  if (aimCount < 1 && shootCount > 0) weaknessReasons.push("missing-aim-evidence");
  if (interactionCount < 2) weaknessReasons.push("low-interaction-evidence");

  let evidenceLevel = "none";
  if (valid && events.length > 0) evidenceLevel = "weak";
  if (valid && events.length >= 3 && interactionCount >= 1 && durationFrames >= 24) evidenceLevel = "basic";
  if (valid && events.length >= 6 && durationFrames >= 60 && movementCount >= 2 && aimCount >= 1 && interactionCount >= 2) {
    evidenceLevel = "rich";
  }

  return {
    valid,
    evidenceLevel,
    count: events.length,
    durationFrames,
    firstFrame: summary.firstFrame,
    lastFrame: summary.lastFrame,
    actions: summary.actions,
    movementCount,
    aimCount,
    shootCount,
    interactionCount,
    digest: summary.digest,
    weaknessReasons,
  };
}
