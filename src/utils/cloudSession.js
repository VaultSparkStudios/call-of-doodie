// Tab-scoped Obelisk session. The upstream verifier can revoke it at any time;
// this local deadline also forces a fresh sign-in after fifteen minutes.
const KEY = "cod-cloud-session-v1";
const LIFETIME_MS = 15 * 60 * 1000;

export function saveCloudSession({ token, subject, capability, expiresAt } = {}, storage = globalThis.sessionStorage, now = Date.now()) {
  if (typeof token !== "string" || !token || token.length > 4096 || typeof subject !== "string" || !subject || subject.length > 200 ||
      typeof capability !== "string" || !/^v1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(capability) ||
      !Number.isSafeInteger(expiresAt) || expiresAt <= now || expiresAt > now + LIFETIME_MS + 30_000) return false;
  try {
    storage.setItem(KEY, JSON.stringify({ token, subject, capability, expiresAt }));
    return true;
  } catch { return false; }
}

export function readCloudSession(subject, storage = globalThis.sessionStorage, now = Date.now()) {
  try {
    const value = JSON.parse(storage.getItem(KEY) || "null");
    if (value?.subject === subject && value.expiresAt > now && value.expiresAt <= now + LIFETIME_MS + 30_000 &&
        typeof value.token === "string" && value.token.length <= 4096 &&
        typeof value.capability === "string" && /^v1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value.capability)) {
      return { token: value.token, capability: value.capability };
    }
    if (value?.expiresAt <= now) storage.removeItem(KEY);
  } catch {}
  return null;
}

export function inspectCloudSession(subject, storage = globalThis.sessionStorage, now = Date.now()) {
  try {
    const value = JSON.parse(storage.getItem(KEY) || "null");
    if (!value || value.subject !== subject) return "missing";
    if (Number.isSafeInteger(value.expiresAt) && value.expiresAt <= now) return "expired";
    return readCloudSession(subject, storage, now) ? "present" : "missing";
  } catch { return "missing"; }
}

export function clearCloudSession(storage = globalThis.sessionStorage) {
  try { storage.removeItem(KEY); } catch {}
}
