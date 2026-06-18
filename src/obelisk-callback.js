// obelisk-passport — SPA callback handler (generated).
// Mount at /auth/callback. Reads the returned token and exchanges it for a
// verified identity via your backend proxy (which must call the IdP — never
// verify on the client, and never embed a secret). If you have no backend, run
// the included Cloudflare Worker (see OBELISK_PASSPORT.md).
export async function handleObeliskCallback({ verifyEndpoint = "/api/obelisk-verify" } = {}) {
  const token = new URLSearchParams(location.search).get("obelisk_session");
  if (!token) return { ok: false, reason: "no-token" };
  const res = await fetch(verifyEndpoint, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token }) });
  let body = null;
  try { body = await res.json(); } catch {}
  return res.ok ? body : { ok: false, reason: body?.reason || "verify-failed", detail: body?.detail || null };
}
