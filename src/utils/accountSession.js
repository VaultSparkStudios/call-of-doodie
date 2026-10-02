import { clearCloudSession, inspectCloudSession, readCloudSession, saveCloudSession } from "./cloudSession.js";

export function describeAccountState(passport, sessionState, cloudAvailable) {
  if (!passport?.subject) return { state: "guest", label: "Guest · progress saved on this device" };
  if (sessionState === "expired") return { state: "expired", label: "Session ended · local progress is safe" };
  if (sessionState === "unavailable") return { state: "unavailable", label: "Verification service unavailable · local progress is safe" };
  if (sessionState === "verified") return cloudAvailable
    ? { state: "cloud-available", label: "Obelisk session verified · cloud save available" }
    : { state: "verified", label: "Obelisk session verified · game progress stays local" };
  return { state: "receipt", label: "Local Passport receipt · verify again for an active session" };
}

export async function revalidateAccountSession(passport, { fetchImpl = globalThis.fetch, storage = globalThis.sessionStorage, now = Date.now() } = {}) {
  if (!passport?.subject) return { state: "guest" };
  if (inspectCloudSession(passport.subject, storage, now) === "expired") { clearCloudSession(storage); return { state: "expired" }; }
  const session = readCloudSession(passport.subject, storage, now);
  if (!session) return { state: "receipt" };
  if (typeof fetchImpl !== "function") return { state: "unavailable" };
  try {
    const response = await fetchImpl("/api/obelisk-verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token: session.token }),
      signal: AbortSignal.timeout(5000),
    });
    const body = await response.json().catch(() => null);
    if (response.status === 401 || body?.reason === "verify-failed") {
      clearCloudSession(storage);
      return { state: "expired" };
    }
    if (!response.ok || !body?.ok) return { state: "unavailable" };
    if (body.identity?.subject !== passport.subject) {
      clearCloudSession(storage);
      return { state: "expired" };
    }
    const cloudCapability = body.profileCapability && body.profileCapabilityExpiresAt
      ? saveCloudSession({ token: session.token, subject: passport.subject, capability: body.profileCapability, expiresAt: body.profileCapabilityExpiresAt }, storage, now)
      : false;
    return { state: "verified", verifiedAt: body.verifiedAt || now, cloudCapability };
  } catch {
    return { state: "unavailable" };
  }
}
