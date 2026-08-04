export const PASSPORT_STORAGE_KEY = "cod-obelisk-passport-v1";
export const PASSPORT_SCHEMA = "porcelain-passport-v1";

function bounded(value, max = 128) {
  return typeof value === "string" ? value.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, max) : "";
}

function checksum(text) {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).toUpperCase().padStart(8, "0");
}

export function sanitizeObeliskIdentity(result, now = Date.now()) {
  const identity = result?.identity && typeof result.identity === "object" ? result.identity : result;
  const subject = bounded(identity?.subject || identity?.sub || identity?.id);
  if (!result?.ok || !subject) return null;
  return {
    schemaVersion: PASSPORT_SCHEMA,
    issuer: "Obelisk",
    project: "call-of-doodie",
    subject,
    tier: bounded(identity?.tier, 24) || null,
    verifiedAt: new Date(now).toISOString(),
  };
}

export function savePassport(passport, storage = globalThis.localStorage) {
  if (!passport || passport.schemaVersion !== PASSPORT_SCHEMA) return false;
  try {
    storage?.setItem(PASSPORT_STORAGE_KEY, JSON.stringify(passport));
    return true;
  } catch {
    return false;
  }
}

export function readPassport(storage = globalThis.localStorage) {
  try {
    const parsed = JSON.parse(storage?.getItem(PASSPORT_STORAGE_KEY) || "null");
    return parsed?.schemaVersion === PASSPORT_SCHEMA && bounded(parsed.subject) ? parsed : null;
  } catch {
    return null;
  }
}

export function clearPassport(storage = globalThis.localStorage) {
  try { storage?.removeItem(PASSPORT_STORAGE_KEY); } catch {}
}

export function exportPassport(passport) {
  if (!passport || passport.schemaVersion !== PASSPORT_SCHEMA) throw new Error("No valid Porcelain Passport is available.");
  const payload = JSON.stringify(passport);
  return JSON.stringify({ schemaVersion: "porcelain-passport-export-v1", passport, checksum: checksum(payload) }, null, 2);
}

export function importPassport(text) {
  const envelope = JSON.parse(String(text || ""));
  if (envelope?.schemaVersion !== "porcelain-passport-export-v1") throw new Error("Unsupported Passport export.");
  const payload = JSON.stringify(envelope.passport);
  if (checksum(payload) !== envelope.checksum) throw new Error("Passport integrity check failed.");
  if (envelope.passport?.schemaVersion !== PASSPORT_SCHEMA || !bounded(envelope.passport.subject)) throw new Error("Passport identity is incomplete.");
  return envelope.passport;
}
