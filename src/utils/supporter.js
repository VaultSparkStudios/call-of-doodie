import { supabase } from "../supabase.js";

const VERIFIED_KEY = "cod-supporter-verification-v2";
export const SUPPORTER_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const LEGACY_SELF_ATTESTED_KEY = "cod-supporter-v1";

function safeStorage(storage = globalThis.localStorage) {
  return storage && typeof storage.getItem === "function" ? storage : null;
}

export function normalizeSupporterCallsign(value) {
  return String(value || "").trim().slice(0, 24);
}

export function normalizeSupporterVerification(value) {
  if (!value || value.version !== 2 || value.verified !== true) return null;
  const callsign = normalizeSupporterCallsign(value.callsign);
  const verifiedAt = Number(value.verifiedAt);
  if (!callsign || !Number.isFinite(verifiedAt) || verifiedAt <= 0) return null;
  return { version: 2, verified: true, callsign, verifiedAt };
}

export function loadSupporterVerification(storage = globalThis.localStorage) {
  const target = safeStorage(storage);
  if (!target) return null;
  try {
    return normalizeSupporterVerification(JSON.parse(target.getItem(VERIFIED_KEY) || "null"));
  } catch {
    return null;
  }
}

export function saveVerifiedSupporter(callsign, storage = globalThis.localStorage, now = Date.now()) {
  const target = safeStorage(storage);
  const normalizedCallsign = normalizeSupporterCallsign(callsign);
  if (!target || !normalizedCallsign) return null;
  const record = normalizeSupporterVerification({
    version: 2,
    verified: true,
    callsign: normalizedCallsign,
    verifiedAt: Number(now),
  });
  if (!record) return null;
  try {
    target.setItem(VERIFIED_KEY, JSON.stringify(record));
    target.removeItem?.(LEGACY_SELF_ATTESTED_KEY);
    return record;
  } catch {
    return null;
  }
}

export function clearSupporterVerification(storage = globalThis.localStorage) {
  try { safeStorage(storage)?.removeItem?.(VERIFIED_KEY); } catch { /* storage unavailable */ }
}

export function isSupporter(callsign = null, storage = globalThis.localStorage, now = Date.now()) {
  const record = loadSupporterVerification(storage);
  if (!record || Number(now) - record.verifiedAt > SUPPORTER_CACHE_TTL_MS) return false;
  const expected = normalizeSupporterCallsign(callsign);
  return expected ? record.callsign === expected : true;
}

export function supporterVerificationStatus(callsign, storage = globalThis.localStorage, now = Date.now()) {
  const expected = normalizeSupporterCallsign(callsign);
  const record = loadSupporterVerification(storage);
  if (!expected) return { status: "missing-callsign", verified: false, callsign: "", record };
  if (record?.callsign === expected && Number(now) - record.verifiedAt > SUPPORTER_CACHE_TTL_MS) return { status: "stale", verified: false, callsign: expected, record };
  if (record?.callsign === expected) return { status: "verified", verified: true, callsign: expected, record };
  return { status: "unverified", verified: false, callsign: expected, record };
}

export async function verifySupporterCallsign(callsign, {
  client = supabase,
  storage = globalThis.localStorage,
  now = Date.now,
} = {}) {
  const normalizedCallsign = normalizeSupporterCallsign(callsign);
  if (!normalizedCallsign) return { status: "missing-callsign", verified: false, callsign: "" };
  if (!client) return { status: "offline", verified: false, callsign: normalizedCallsign };

  try {
    const { data, error } = await client
      .from("callsign_claims")
      .select("name,supporter")
      .eq("name", normalizedCallsign)
      .maybeSingle();
    if (error) throw error;
    if (data?.name === normalizedCallsign && data?.supporter === true) {
      const record = saveVerifiedSupporter(normalizedCallsign, storage, now());
      return { status: "verified", verified: true, callsign: normalizedCallsign, record };
    }
    if (loadSupporterVerification(storage)?.callsign === normalizedCallsign) clearSupporterVerification(storage);
    return { status: "pending", verified: false, callsign: normalizedCallsign };
  } catch {
    return { status: "unavailable", verified: false, callsign: normalizedCallsign };
  }
}