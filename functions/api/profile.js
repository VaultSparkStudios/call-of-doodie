// /api/profile — Porcelain Passport cloud backup (S163).
//
// GET  ?subject=<id>  → { backup, updatedAt }  (404 when none)
// PUT  { subject, backup } → { updatedAt }
//
// Trust model: /api/obelisk-verify mints a project-scoped profile key after a
// successful upstream verification (sha256 of the deployment secret and the
// subject). Presenting that key unlocks only that subject's blob. Storage is
// one row per subject in the Supabase `profiles` table through the service-role
// key. When any secret is missing the endpoint answers 503 and the client
// stays guest-safe.

const ALLOWED_ORIGINS = new Set([
  "https://callofdoodie.wtf",
  "https://www.callofdoodie.wtf",
  "https://playcallofdoodie.com",
  "https://www.playcallofdoodie.com",
  "http://localhost:5173",
  "http://localhost:4173",
]);
const MAX_BLOB_BYTES = 512 * 1024;
const RATE_LIMIT_PER_MINUTE = 20;
const rateBuckets = new Map();

function isAllowedOrigin(origin) {
  if (!origin) return true;
  if (ALLOWED_ORIGINS.has(origin)) return true;
  try {
    const host = new URL(origin).hostname;
    return host.endsWith(".call-of-doodie.pages.dev") || host === "call-of-doodie.pages.dev";
  } catch { return false; }
}

function consumeLocalRate(key, now = Date.now()) {
  const minute = Math.floor(now / 60000);
  const bucket = rateBuckets.get(key);
  if (!bucket || bucket.minute !== minute) {
    rateBuckets.set(key, { minute, count: 1 });
    if (rateBuckets.size > 2048) rateBuckets.clear();
    return true;
  }
  bucket.count += 1;
  return bucket.count <= RATE_LIMIT_PER_MINUTE;
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
}

async function sha256Hex(value) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(value)));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// The profile key is minted by /api/obelisk-verify after a successful upstream
// verification: sha256("profile:" + OBELISK_VERIFY_SECRET + ":" + subject). It
// unlocks only this subject's backup blob and is never the Obelisk token.
async function verifySubject(env, request, subject) {
  const presented = String(request.headers.get("x-profile-key") || "").toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(presented) || !env.OBELISK_VERIFY_SECRET) return false;
  const expected = await sha256Hex(`profile:${env.OBELISK_VERIFY_SECRET}:${subject}`);
  if (expected.length !== presented.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i += 1) diff |= expected.charCodeAt(i) ^ presented.charCodeAt(i);
  return diff === 0;
}

async function supabaseRest(env, path, init = {}) {
  const url = `${env.SUPABASE_URL}/rest/v1/${path}`;
  const serviceRole = env.SUPABASE_SERVICE_ROLE_KEY;
  return fetch(url, {
    ...init,
    headers: {
      apikey: serviceRole,
      authorization: `Bearer ${serviceRole}`,
      "content-type": "application/json",
      ...(init.headers || {}),
    },
  });
}

export async function onRequest({ request, env }) {
  const origin = request.headers.get("origin");
  if (!isAllowedOrigin(origin)) return json({ error: "origin_not_allowed" }, 403);
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY || !env.OBELISK_VERIFY_SECRET) return json({ error: "cloud_backup_disabled" }, 503);
  const ip = request.headers.get("cf-connecting-ip") || "unknown";
  if (!consumeLocalRate(ip)) return json({ error: "rate_limited" }, 429);

  if (request.method === "GET") {
    const subject = new URL(request.url).searchParams.get("subject") || "";
    if (!subject || subject.length > 200) return json({ error: "bad_subject" }, 400);
    if (!(await verifySubject(env, request, subject))) return json({ error: "unverified" }, 401);
    const res = await supabaseRest(env, `profiles?subject=eq.${encodeURIComponent(subject)}&select=backup,updated_at&limit=1`);
    if (!res.ok) return json({ error: "storage_unavailable" }, 502);
    const rows = await res.json();
    if (!rows.length) return json({ error: "not_found" }, 404);
    return json({ backup: rows[0].backup, updatedAt: rows[0].updated_at });
  }

  if (request.method === "PUT") {
    let body;
    try { body = await request.json(); } catch { return json({ error: "bad_json" }, 400); }
    const subject = String(body?.subject || "");
    if (!subject || subject.length > 200) return json({ error: "bad_subject" }, 400);
    if (!body?.backup || body.backup.schema !== "cod-progress-backup-v1") return json({ error: "bad_backup" }, 400);
    if (JSON.stringify(body.backup).length > MAX_BLOB_BYTES) return json({ error: "too_large" }, 413);
    if (!(await verifySubject(env, request, subject))) return json({ error: "unverified" }, 401);
    const updatedAt = new Date().toISOString();
    const res = await supabaseRest(env, "profiles?on_conflict=subject", {
      method: "POST",
      headers: { prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify([{ subject, backup: body.backup, updated_at: updatedAt }]),
    });
    if (!res.ok) return json({ error: "storage_unavailable" }, 502);
    return json({ updatedAt });
  }

  return json({ error: "method_not_allowed" }, 405);
}
