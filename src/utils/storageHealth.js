export const STORAGE_HEALTH_EVENT = "cod:storage-health";

const MAX_FAILURES = 8;
const state = {
  successCount: 0,
  failureCount: 0,
  lastSuccessAt: null,
  lastFailureAt: null,
  failures: [],
  activeFailures: new Map(),
};

function timestamp(value = Date.now()) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.floor(number)) : Date.now();
}

function cleanSurface(value) {
  const text = String(value || "local-state").toLowerCase().replace(/[^a-z0-9._-]/g, "-");
  return text.slice(0, 40) || "local-state";
}

export function classifyStorageFailure(error) {
  const name = String(error?.name || "").toLowerCase();
  const code = Number(error?.code);
  if (name.includes("quota") || code === 22 || code === 1014) return "quota-exceeded";
  if (name.includes("security") || name.includes("denied")) return "access-denied";
  if (name.includes("invalidstate")) return "storage-unavailable";
  return "write-failed";
}

export function getStorageHealth() {
  const degraded = state.activeFailures.size > 0;
  const recovered = !degraded && state.failureCount > 0;
  const activeFailures = [...state.activeFailures.values()].sort((a, b) => a.at - b.at);
  return {
    version: 1,
    status: degraded ? "degraded" : recovered ? "recovered" : "healthy",
    label: degraded ? "LOCAL SAVE DEGRADED" : recovered ? "LOCAL SAVE RECOVERED" : "LOCAL SAVE READY",
    successCount: state.successCount,
    failureCount: state.failureCount,
    lastSuccessAt: state.lastSuccessAt,
    lastFailureAt: state.lastFailureAt,
    activeFailureCount: activeFailures.length,
    lastFailure: activeFailures.at(-1) || state.failures.at(-1) || null,
    failures: state.failures.map((entry) => ({ ...entry })),
  };
}

function emit() {
  const receipt = getStorageHealth();
  try {
    globalThis.window?.dispatchEvent?.(new CustomEvent(STORAGE_HEALTH_EVENT, { detail: receipt }));
  } catch (_) {
    // Diagnostics must never turn a storage failure into a runtime failure.
  }
  return receipt;
}

function recordSuccess(surface, now) {
  state.successCount += 1;
  state.lastSuccessAt = timestamp(now);
  state.activeFailures.delete(cleanSurface(surface));
  return emit();
}

function recordFailure(surface, error, now) {
  const at = timestamp(now);
  state.failureCount += 1;
  state.lastFailureAt = at;
  const failure = { surface: cleanSurface(surface), code: classifyStorageFailure(error), at };
  state.failures.push(failure);
  state.activeFailures.set(failure.surface, failure);
  if (state.failures.length > MAX_FAILURES) state.failures.splice(0, state.failures.length - MAX_FAILURES);
  return emit();
}

export function writeLocalState(key, value, {
  storage = globalThis.localStorage,
  surface = "local-state",
  now = Date.now(),
} = {}) {
  try {
    if (!storage || typeof storage.setItem !== "function") throw Object.assign(new Error("storage unavailable"), { name: "InvalidStateError" });
    storage.setItem(key, value);
    return { ok: true, receipt: recordSuccess(surface, now) };
  } catch (error) {
    return { ok: false, receipt: recordFailure(surface, error, now) };
  }
}

export function removeLocalState(key, {
  storage = globalThis.localStorage,
  surface = "local-state",
  now = Date.now(),
} = {}) {
  try {
    if (!storage || typeof storage.removeItem !== "function") throw Object.assign(new Error("storage unavailable"), { name: "InvalidStateError" });
    storage.removeItem(key);
    return { ok: true, receipt: recordSuccess(surface, now) };
  } catch (error) {
    return { ok: false, receipt: recordFailure(surface, error, now) };
  }
}

export function probeLocalStorage(storage = globalThis.localStorage, now = Date.now()) {
  const key = "__cod_storage_health_probe__";
  try {
    const previous = storage?.getItem?.(key) ?? null;
    const written = writeLocalState(key, "1", { storage, surface: "health-probe", now });
    if (!written.ok) return written;
    if (previous == null) return removeLocalState(key, { storage, surface: "health-probe", now: timestamp(now) + 1 });
    return writeLocalState(key, previous, { storage, surface: "health-probe", now: timestamp(now) + 1 });
  } catch (error) {
    return { ok: false, receipt: recordFailure("health-probe", error, now) };
  }
}

export function resetStorageHealthForTests() {
  state.successCount = 0;
  state.failureCount = 0;
  state.lastSuccessAt = null;
  state.lastFailureAt = null;
  state.failures.length = 0;
  state.activeFailures.clear();
}
