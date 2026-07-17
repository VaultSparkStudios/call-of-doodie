const CALIBRATION_KEY = "cod-input-calibration";

function safeStorage(storage = globalThis.localStorage) {
  return storage && typeof storage.getItem === "function" ? storage : null;
}

export const AIM_CALIBRATION_BUCKETS = Object.freeze(["north", "east", "south", "west"]);
export const INPUT_CALIBRATION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export function aimBucketFromKey(key) {
  const normalized = String(key || "").toLowerCase();
  if (normalized === "w" || normalized === "arrowup") return "north";
  if (normalized === "d" || normalized === "arrowright") return "east";
  if (normalized === "s" || normalized === "arrowdown") return "south";
  if (normalized === "a" || normalized === "arrowleft") return "west";
  return null;
}

export function aimBucketFromVector(x, y, minMagnitude = 0.35) {
  const vx = Number(x) || 0;
  const vy = Number(y) || 0;
  if (Math.hypot(vx, vy) < Math.max(0, Number(minMagnitude) || 0)) return null;
  return Math.abs(vx) >= Math.abs(vy)
    ? (vx >= 0 ? "east" : "west")
    : (vy >= 0 ? "south" : "north");
}

export function mergeAimCalibrationEvidence(evidence = {}, bucket = null, source = null) {
  const buckets = new Set(Array.isArray(evidence.buckets) ? evidence.buckets : []);
  const sources = new Set(Array.isArray(evidence.sources) ? evidence.sources : []);
  if (AIM_CALIBRATION_BUCKETS.includes(bucket)) buckets.add(bucket);
  if (["gamepad", "keyboard", "mouse", "pen", "touch"].includes(source)) sources.add(source);
  const orderedBuckets = AIM_CALIBRATION_BUCKETS.filter((candidate) => buckets.has(candidate));
  const orderedSources = ["gamepad", "keyboard", "mouse", "pen", "touch"].filter((candidate) => sources.has(candidate));
  return {
    buckets: orderedBuckets,
    sources: orderedSources,
    complete: orderedBuckets.length === AIM_CALIBRATION_BUCKETS.length,
  };
}

export function resolveAimCalibrationSource(sources = []) {
  const unique = [...new Set(sources)].filter(Boolean);
  return unique.length === 0 ? "unknown" : unique.length === 1 ? unique[0] : "mixed";
}

export function isInputCalibrationFresh(record, now = Date.now()) {
  const observedAt = Number(record?.timestamp);
  const age = Number(now) - observedAt;
  return Boolean(record?.complete) && Number.isFinite(observedAt) && observedAt > 0 && age >= 0 && age <= INPUT_CALIBRATION_TTL_MS;
}
export function buildInputCalibrationRecord({ source = "unknown", buckets = [], controllerType = "none", timestamp = Date.now() } = {}) {
  const uniqueBuckets = Array.from(new Set(buckets)).sort();
  return {
    version: 1,
    source,
    controllerType,
    buckets: uniqueBuckets,
    complete: ["east", "north", "south", "west"].every((bucket) => uniqueBuckets.includes(bucket)),
    timestamp,
  };
}

export function loadInputCalibration(storage = globalThis.localStorage) {
  const store = safeStorage(storage);
  if (!store) return null;
  try {
    const parsed = JSON.parse(store.getItem(CALIBRATION_KEY) || "null");
    return parsed?.version === 1 ? parsed : null;
  } catch (_) {
    return null;
  }
}

export function saveInputCalibration(record, storage = globalThis.localStorage) {
  const store = safeStorage(storage);
  if (!store) return record;
  store.setItem(CALIBRATION_KEY, JSON.stringify(record));
  return record;
}

export function summarizeInputCalibration(record) {
  if (!record) return "unverified";
  return record.complete ? `${record.source} verified` : `${record.buckets.length}/4 directions`;
}

export function buildInputQaReceipt({
  calibration = null,
  controllerProfile = null,
  gamepadConnected = false,
  controllerType = null,
  timestamp = Date.now(),
  now = Date.now(),
} = {}) {
  const hasCalibration = Boolean(calibration);
  const calibrationComplete = Boolean(calibration?.complete);
  const calibrationFresh = isInputCalibrationFresh(calibration, now);
  const calibrationAgeDays = hasCalibration && Number.isFinite(Number(calibration?.timestamp))
    ? Math.max(0, Math.floor((Number(now) - Number(calibration.timestamp)) / (24 * 60 * 60 * 1000)))
    : null;
  const connectedType = gamepadConnected ? (controllerType || "controller") : null;
  const rememberedType = controllerProfile?.type || null;
  const deviceType = connectedType || rememberedType || calibration?.controllerType || calibration?.source || "unknown";
  const coverage = calibrationComplete
    ? "four-direction"
    : hasCalibration
      ? `${new Set(calibration.buckets || []).size}/4-direction`
      : "none";
  const status = calibrationComplete && calibrationFresh && (gamepadConnected || controllerProfile || calibration?.source)
    ? "ready"
    : hasCalibration || controllerProfile || gamepadConnected
      ? "needs-repeat"
      : "missing";

  return {
    version: 1,
    status,
    deviceType,
    deviceIndex: controllerProfile?.index ?? null,
    connected: Boolean(gamepadConnected),
    remembered: Boolean(controllerProfile),
    calibrationComplete,
    calibrationFresh,
    calibrationAgeDays,
    coverage,
    label: status === "ready" ? "INPUT QA READY" : status === "needs-repeat" ? "INPUT QA RECHECK" : "INPUT QA MISSING",
    summary: `${String(deviceType).toUpperCase()} · ${coverage}`,
    timestamp,
  };
}

export function buildInputCalibrationNudge(record, { debugEnabled = false, now = Date.now() } = {}) {
  const buckets = Array.isArray(record?.buckets) ? record.buckets : [];
  const complete = Boolean(record?.complete);
  if (complete && !isInputCalibrationFresh(record, now)) {
    return {
      status: "stale",
      label: "AIM CHECK EXPIRED",
      detail: "reverify after 30 days",
      action: "VERIFY",
    };
  }
  if (complete) {
    return {
      status: "verified",
      label: "AIM CHECK VERIFIED",
      detail: summarizeInputCalibration(record),
      action: debugEnabled ? "OPEN DIAGNOSTICS" : "READY",
    };
  }
  const count = new Set(buckets).size;
  const missing = Math.max(0, 4 - count);
  return {
    status: count > 0 ? "partial" : "unverified",
    label: `AIM CHECK ${count}/4`,
    detail: missing === 1 ? "1 direction left" : `${missing} directions left`,
    action: debugEnabled ? "OPEN DIAGNOSTICS" : "VERIFY",
  };
}
