const MAX_EVENTS = 240;
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
