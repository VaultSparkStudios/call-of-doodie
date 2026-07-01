const CALIBRATION_KEY = "cod-input-calibration";

function safeStorage(storage = globalThis.localStorage) {
  return storage && typeof storage.getItem === "function" ? storage : null;
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
} = {}) {
  const hasCalibration = Boolean(calibration);
  const calibrationComplete = Boolean(calibration?.complete);
  const connectedType = gamepadConnected ? (controllerType || "controller") : null;
  const rememberedType = controllerProfile?.type || null;
  const deviceType = connectedType || rememberedType || calibration?.controllerType || calibration?.source || "unknown";
  const coverage = calibrationComplete
    ? "four-direction"
    : hasCalibration
      ? `${new Set(calibration.buckets || []).size}/4-direction`
      : "none";
  const status = calibrationComplete && (gamepadConnected || controllerProfile || calibration?.source)
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
    coverage,
    label: status === "ready" ? "INPUT QA READY" : status === "needs-repeat" ? "INPUT QA RECHECK" : "INPUT QA MISSING",
    summary: `${String(deviceType).toUpperCase()} · ${coverage}`,
    timestamp,
  };
}

export function buildInputCalibrationNudge(record, { debugEnabled = false } = {}) {
  const buckets = Array.isArray(record?.buckets) ? record.buckets : [];
  const complete = Boolean(record?.complete);
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
