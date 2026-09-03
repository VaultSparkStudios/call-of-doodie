// cloudBackup — Porcelain Passport progress backup via /api/profile (S163).
//
// The Pages Function verifies the Obelisk token upstream and stores one JSON
// blob per subject. When the service is not deployed the client reports
// "disabled" and every surface stays guest-safe.

const ENDPOINT = "/api/profile";
const MAX_BLOB_BYTES = 512 * 1024;

function headersFor(passport) {
  return { "content-type": "application/json", "x-profile-key": String(passport?.profileKey || "") };
}

export async function fetchCloudBackup(passport, { fetchImpl = globalThis.fetch } = {}) {
  if (!passport?.subject || !passport?.profileKey || !fetchImpl) return { state: "disabled" };
  try {
    const res = await fetchImpl(`${ENDPOINT}?subject=${encodeURIComponent(passport.subject)}`, { headers: headersFor(passport) });
    if (res.status === 404) return { state: "empty" };
    if (res.status === 503) return { state: "disabled", message: "Cloud backup is not enabled on this deployment yet." };
    if (!res.ok) return { state: "error", message: `Cloud backup unavailable (${res.status}).` };
    const body = await res.json();
    return { state: "found", backup: body.backup, updatedAt: body.updatedAt || null };
  } catch {
    return { state: "unavailable", message: "Cloud backup is unreachable right now." };
  }
}

export async function pushCloudBackup(passport, backup, { fetchImpl = globalThis.fetch } = {}) {
  if (!passport?.subject || !passport?.profileKey || !fetchImpl) return { state: "disabled" };
  const text = JSON.stringify(backup);
  if (text.length > MAX_BLOB_BYTES) return { state: "error", message: "Backup is too large for cloud storage." };
  try {
    const res = await fetchImpl(ENDPOINT, { method: "PUT", headers: headersFor(passport), body: JSON.stringify({ subject: passport.subject, backup }) });
    if (res.status === 503) return { state: "disabled", message: "Cloud backup is not enabled on this deployment yet." };
    if (!res.ok) return { state: "error", message: `Cloud backup rejected (${res.status}).` };
    const body = await res.json();
    return { state: "saved", updatedAt: body.updatedAt || new Date().toISOString() };
  } catch {
    return { state: "unavailable", message: "Cloud backup is unreachable right now." };
  }
}
