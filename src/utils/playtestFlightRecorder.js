const STORAGE_KEY = "cod-playtest-flight-v1";
const OPT_IN_KEY = "cod-playtest-pulse-enabled";
const PULSE_KEY = "cod-playtest-pulse-v1";
const ALLOWED_MILESTONES = new Set(["run_start", "move", "shoot", "kill", "dash", "grenade", "perk", "death", "continuation"]);
const MAX_META_KEYS = 8;
const ALLOWED_META_KEYS = new Set(["difficulty", "seed", "practice", "frame", "kills", "wave", "score", "source", "mode", "action"]);

function safeNow(now = Date.now()) {
  const value = Number(typeof now === "function" ? now() : now);
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : Date.now();
}

function safeString(value, max = 48) {
  return String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, max);
}

function sanitizeMeta(meta = {}) {
  const output = {};
  for (const [key, value] of Object.entries(meta).slice(0, MAX_META_KEYS)) {
    const safeKey = safeString(key, 32);
    if (!safeKey || !ALLOWED_META_KEYS.has(safeKey)) continue;
    if (typeof value === "boolean") output[safeKey] = value;
    else if (Number.isFinite(Number(value)) && value !== "") output[safeKey] = Number(value);
    else if (value != null) output[safeKey] = safeString(value);
  }
  return output;
}

export function isPlaytestMode(search = globalThis.location?.search || "") {
  try {
    const query = new URLSearchParams(String(search)).get("playtest");
    if (query === "1") return true;
    if (query === "0") return false;
    return globalThis.localStorage?.getItem(OPT_IN_KEY) === "1";
  } catch {
    return false;
  }
}

export function setPlaytestPulseEnabled(enabled, storage = globalThis.localStorage) {
  try {
    storage?.setItem(OPT_IN_KEY, enabled ? "1" : "0");
    return Boolean(enabled);
  } catch { return false; }
}

export function createPlaytestFlight({ now = Date.now(), meta = {} } = {}) {
  const startedAt = safeNow(now);
  return {
    schemaVersion: "playtest-flight-v1",
    privacy: "session-local-no-network-no-callsign-no-free-text",
    startedAt,
    flightId: `flight-${startedAt.toString(36)}`,
    finalizedAt: null,
    milestones: {},
    annotations: { deathClarity: null, replayIntent: null },
    continuation: null,
    run: sanitizeMeta(meta),
    previousRun: null,
  };
}

export function recordPlaytestMilestone(receipt, milestone, { now = Date.now(), meta = {} } = {}) {
  const type = safeString(milestone, 24);
  if (!receipt || receipt.schemaVersion !== "playtest-flight-v1" || !ALLOWED_MILESTONES.has(type)) return receipt;
  if (receipt.milestones[type]) return receipt;
  const at = safeNow(now);
  return {
    ...receipt,
    milestones: {
      ...receipt.milestones,
      [type]: {
        elapsedMs: Math.max(0, at - receipt.startedAt),
        meta: sanitizeMeta(meta),
      },
    },
    finalizedAt: type === "death" ? at : receipt.finalizedAt,
  };
}

export function annotatePlaytestFlight(receipt, annotations = {}) {
  if (!receipt || receipt.schemaVersion !== "playtest-flight-v1") return receipt;
  const deathClarity = ["clear", "partial", "unclear"].includes(annotations.deathClarity)
    ? annotations.deathClarity
    : receipt.annotations.deathClarity;
  const replayIntent = ["now", "later", "no"].includes(annotations.replayIntent)
    ? annotations.replayIntent
    : receipt.annotations.replayIntent;
  const continuation = annotations.continuation
    ? safeString(annotations.continuation, 32)
    : receipt.continuation;
  return {
    ...receipt,
    annotations: { deathClarity, replayIntent },
    continuation,
  };
}

export function buildPortablePlaytestReceipt(receipt) {
  if (!receipt || receipt.schemaVersion !== "playtest-flight-v1") return null;
  const order = ["run_start", "move", "shoot", "kill", "dash", "grenade", "perk", "death", "continuation"];
  return {
    schemaVersion: "playtest-flight-v1",
    evidenceScope: "observed-input-and-explicit-tester-answers",
    privacy: receipt.privacy,
    flightId: safeString(receipt.flightId, 32) || null,
    run: sanitizeMeta(receipt.run),
    milestones: Object.fromEntries(order.filter((key) => receipt.milestones?.[key]).map((key) => [key, receipt.milestones[key]])),
    annotations: {
      deathClarity: receipt.annotations?.deathClarity || null,
      replayIntent: receipt.annotations?.replayIntent || null,
    },
    continuation: receipt.continuation || null,
    previousRun: receipt.previousRun || null,
    complete: Boolean(receipt.milestones?.death && receipt.annotations?.deathClarity && receipt.annotations?.replayIntent),
  };
}

export function recordPlaytestPulse(receipt, storage = globalThis.localStorage) {
  const portable = buildPortablePlaytestReceipt(receipt);
  if (!portable?.complete) return null;
  try {
    const current = JSON.parse(storage?.getItem(PULSE_KEY) || "null");
    const flights = Array.isArray(current?.flights) ? current.flights : [];
    const nextFlights = [portable, ...flights.filter((item) => item.flightId !== portable.flightId)].slice(0, 20);
    const clarity = { clear: 0, partial: 0, unclear: 0 };
    const replay = { now: 0, later: 0, no: 0 };
    nextFlights.forEach((item) => {
      if (clarity[item.annotations.deathClarity] != null) clarity[item.annotations.deathClarity] += 1;
      if (replay[item.annotations.replayIntent] != null) replay[item.annotations.replayIntent] += 1;
    });
    const pulse = { schemaVersion: "playtest-pulse-v1", privacy: "device-local-aggregate-no-upload", sampleSize: nextFlights.length, clarity, replay, flights: nextFlights };
    storage?.setItem(PULSE_KEY, JSON.stringify(pulse));
    return pulse;
  } catch { return null; }
}

export function loadPlaytestPulse(storage = globalThis.localStorage) {
  try {
    const value = JSON.parse(storage?.getItem(PULSE_KEY) || "null");
    return value?.schemaVersion === "playtest-pulse-v1" ? value : { schemaVersion: "playtest-pulse-v1", privacy: "device-local-aggregate-no-upload", sampleSize: 0, clarity: { clear: 0, partial: 0, unclear: 0 }, replay: { now: 0, later: 0, no: 0 }, flights: [] };
  } catch { return null; }
}

export function loadPlaytestFlight(storage = globalThis.sessionStorage) {
  try {
    const value = JSON.parse(storage?.getItem(STORAGE_KEY) || "null");
    return value?.schemaVersion === "playtest-flight-v1" ? value : null;
  } catch {
    return null;
  }
}

export function savePlaytestFlight(receipt, storage = globalThis.sessionStorage) {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(receipt));
    return true;
  } catch {
    return false;
  }
}

export function startActivePlaytestFlight(options = {}, storage = globalThis.sessionStorage) {
  const previous = loadPlaytestFlight(storage);
  const fresh = createPlaytestFlight(options);
  fresh.previousRun = previous?.finalizedAt ? buildPortablePlaytestReceipt({ ...previous, previousRun: null }) : null;
  const receipt = recordPlaytestMilestone(fresh, "run_start", { now: options.now, meta: options.meta });
  savePlaytestFlight(receipt, storage);
  return receipt;
}

export function recordActivePlaytestMilestone(milestone, options = {}, storage = globalThis.sessionStorage) {
  const current = loadPlaytestFlight(storage);
  if (!current) return null;
  const next = recordPlaytestMilestone(current, milestone, options);
  savePlaytestFlight(next, storage);
  return next;
}

export function annotateActivePlaytestFlight(annotations = {}, storage = globalThis.sessionStorage) {
  const current = loadPlaytestFlight(storage);
  if (!current) return null;
  const next = annotatePlaytestFlight(current, annotations);
  savePlaytestFlight(next, storage);
  return next;
}

export function clearPlaytestFlight(storage = globalThis.sessionStorage) {
  try {
    storage?.removeItem(STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}
