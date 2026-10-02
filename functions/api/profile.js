// /api/profile — cloud backups require a live Obelisk session.
//
// GET  ?subject=<id>  → { backup, updatedAt }  (404 when none)
// PUT  { subject, backup } → { updatedAt }
//
// Trust model: each request re-verifies the session with Obelisk. A leaked
// historical profile hash or portable Passport receipt cannot authorize access.
// Storage is
// one row per subject in the Supabase `cod_profiles` table through the service-role
// key. When any secret is missing the endpoint answers 503 and the client
// stays guest-safe.

import { BACKUP_SCHEMA, previewProgressBackup } from "../../src/utils/progressBackup.js";
import { verifyProfileCapability } from "../../src/server/profileCapability.js";
import { readBoundedJson } from "../../src/server/httpIngress.js";
import { createLocalRateLimiter } from "../../src/server/localRateLimiter.js";

const ALLOWED_ORIGINS = new Set([
  "https://callofdoodie.wtf",
  "https://www.callofdoodie.wtf",
  "https://playcallofdoodie.com",
  "https://www.playcallofdoodie.com",
  "http://localhost:5173",
  "http://localhost:4173",
  "http://localhost:4174",
]);
const MAX_BLOB_BYTES = 512 * 1024;
const MAX_REQUEST_BYTES = MAX_BLOB_BYTES + 2048;
const RATE_LIMIT_PER_MINUTE = 20;
const consumeLocalRate = createLocalRateLimiter(RATE_LIMIT_PER_MINUTE);

function isAllowedOrigin(origin) {
  if (!origin) return true;
  if (ALLOWED_ORIGINS.has(origin)) return true;
  try {
    const url = new URL(origin);
    return url.protocol === "https:" && (url.hostname.endsWith(".call-of-doodie.pages.dev") || url.hostname === "call-of-doodie.pages.dev");
  } catch { return false; }
}

function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers } });
}

async function verifySubject(env, request, subject, fetchImpl, now) {
  const authorization = request.headers.get("authorization") || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  const capability = request.headers.get("x-profile-capability") || "";
  if (!token || token.length > 4096 || !env.OBELISK_VERIFY_URL ||
      !(await verifyProfileCapability(env.OBELISK_VERIFY_SECRET, capability, subject, token, now))) return { ok: false, error: "unverified", status: 401 };
  const signal = AbortSignal.timeout(5000);
  try {
    const response = await fetchImpl(env.OBELISK_VERIFY_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(env.OBELISK_VERIFY_SECRET ? { authorization: `Bearer ${env.OBELISK_VERIFY_SECRET}` } : {}),
      },
      body: JSON.stringify({ token, project: "Call of Doodie" }),
      signal,
    });
    if (!response.ok) return { ok: false, error: "unverified", status: 401 };
    const verified = await response.json();
    if (verified?.ok === false || verified?.verified === false) return { ok: false, error: "unverified", status: 401 };
    const identity = verified?.identity || verified?.user || verified?.account || verified;
    return String(identity?.subject || identity?.sub || identity?.id || identity?.userId || "") === subject
      ? { ok: true }
      : { ok: false, error: "unverified", status: 401 };
  } catch {
    return signal.aborted
      ? { ok: false, error: "verify_timeout", status: 504 }
      : { ok: false, error: "verify_unavailable", status: 502 };
  }
}

async function supabaseRest(env, path, init = {}, fetchImpl = fetch) {
  const url = `${env.SUPABASE_URL}/rest/v1/${path}`;
  const svc = env.SUPABASE_SERVICE_ROLE_KEY;
  return fetchImpl(url, {
    ...init,
    signal: init.signal || AbortSignal.timeout(5000),
    headers: {
      apikey: svc,
      authorization: `Bearer ${svc}`,
      "content-type": "application/json",
      ...(init.headers || {}),
    },
  });
}

export async function profileRequest({ request, env, fetchImpl = fetch, now = Date.now }) {
  const origin = request.headers.get("origin");
  if (!isAllowedOrigin(origin)) return json({ error: "origin_not_allowed" }, 403);
  if (request.method !== "GET" && request.method !== "PUT") return json({ error: "method_not_allowed" }, 405);
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY || !env.OBELISK_VERIFY_URL || !env.OBELISK_VERIFY_SECRET) return json({ error: "cloud_backup_disabled" }, 503);
  const ip = request.headers.get("cf-connecting-ip") || "unknown";
  if (!consumeLocalRate(ip, now())) return json({ error: "rate_limited" }, 429, { "retry-after": "60" });

  if (request.method === "GET") {
    const subject = new URL(request.url).searchParams.get("subject") || "";
    if (!subject || subject.length > 200) return json({ error: "bad_subject" }, 400);
    const verified = await verifySubject(env, request, subject, fetchImpl, now());
    if (!verified.ok) return json({ error: verified.error }, verified.status, verified.status === 504 ? { "retry-after": "5" } : {});
    let res;
    try { res = await supabaseRest(env, `cod_profiles?subject=eq.${encodeURIComponent(subject)}&select=backup,updated_at&limit=1`, {}, fetchImpl); }
    catch (error) { return json({ error: error?.name === "TimeoutError" ? "storage_timeout" : "storage_unavailable" }, error?.name === "TimeoutError" ? 504 : 502, error?.name === "TimeoutError" ? { "retry-after": "5" } : {}); }
    if (!res.ok) return json({ error: "storage_unavailable" }, 502);
    const rows = await res.json();
    if (!rows.length) return json({ error: "not_found" }, 404);
    try {
      const safe = previewProgressBackup(rows[0].backup);
      return json({ backup: { schema: BACKUP_SCHEMA, exportedAt: safe.exportedAt, keys: safe.restored, entries: safe.entries }, updatedAt: rows[0].updated_at, ignored: safe.ignored });
    } catch { return json({ error: "invalid_stored_backup" }, 422); }
  }

  if (request.method === "PUT") {
    const parsed = await readBoundedJson(request, MAX_REQUEST_BYTES);
    if (parsed.error) return json({ error: parsed.error }, parsed.status, parsed.status === 408 ? { "retry-after": "5" } : {});
    const { body } = parsed;
    if (Object.keys(body).some((key) => key !== "subject" && key !== "backup")) return json({ error: "bad_request" }, 400);
    const subject = typeof body.subject === "string" ? body.subject : "";
    if (!subject || subject.length > 200) return json({ error: "bad_subject" }, 400);
    if (!body.backup || Array.isArray(body.backup) || body.backup.schema !== BACKUP_SCHEMA) return json({ error: "bad_backup" }, 400);
    if (new TextEncoder().encode(JSON.stringify(body.backup)).length > MAX_BLOB_BYTES) return json({ error: "too_large" }, 413);
    let safe;
    try { safe = previewProgressBackup(body.backup); } catch { return json({ error: "bad_backup" }, 400); }
    if (safe.ignored.length) return json({ error: "bad_backup" }, 400);
    const verified = await verifySubject(env, request, subject, fetchImpl, now());
    if (!verified.ok) return json({ error: verified.error }, verified.status, verified.status === 504 ? { "retry-after": "5" } : {});
    const updatedAt = new Date(now()).toISOString();
    let res;
    try { res = await supabaseRest(env, "cod_profiles?on_conflict=subject", {
      method: "POST",
      headers: { prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify([{ subject, backup: body.backup, updated_at: updatedAt }]),
    }, fetchImpl); }
    catch (error) { return json({ error: error?.name === "TimeoutError" ? "storage_timeout" : "storage_unavailable" }, error?.name === "TimeoutError" ? 504 : 502, error?.name === "TimeoutError" ? { "retry-after": "5" } : {}); }
    if (!res.ok) return json({ error: "storage_unavailable" }, 502);
    return json({ updatedAt });
  }

  return json({ error: "method_not_allowed" }, 405);
}

export async function onRequest({ request, env }) { return profileRequest({ request, env }); }
