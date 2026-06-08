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
