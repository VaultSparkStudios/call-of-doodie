const RPC_PATH = "/rest/v1/rpc/get_cod_community_stats";
const UPSTREAM_TIMEOUT_MS = 5000;

// S147 — same origin-allowlist + rate-bucket pattern as obelisk-verify.js.
// Requests without an Origin header (curl, server-to-server, same-origin
// page loads in some browsers) are allowed; browser requests from foreign
// origins are rejected. This is a public read endpoint, so the rate ceiling
// is higher than the auth-adjacent obelisk-verify budget.
const ALLOWED_ORIGINS = new Set([
  "https://callofdoodie.wtf",
  "https://www.callofdoodie.wtf",
  "https://playcallofdoodie.com",
  "https://www.playcallofdoodie.com",
  "http://localhost:5173",
  "http://localhost:4173",
]);

function isAllowedOrigin(origin) {
  if (!origin) return true;
  if (ALLOWED_ORIGINS.has(origin)) return true;
  try {
    const host = new URL(origin).hostname;
    return host.endsWith(".call-of-doodie.pages.dev") || host === "call-of-doodie.pages.dev";
  } catch { return false; }
}

// Best-effort per-isolate rate bucket (60 requests/min per client IP). Not a
// distributed quota — it bounds abuse cheaply on this public read-heavy
// endpoint until a KV/DO budget is justified.
const RATE_LIMIT_PER_MINUTE = 60;
const rateBuckets = new Map();

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

function json(body, init = {}) {
  return new Response(JSON.stringify(body), {
    status: init.status || 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": init.cacheControl || "no-store",
      ...init.headers,
    },
  });
}

export async function readCommunityStats({ request, env = {}, fetchImpl = fetch, now = () => Date.now() }) {
  if (request.method !== "GET") {
    return json({ ok: false, reason: "method-not-allowed" }, {
      status: 405,
      headers: { allow: "GET" },
    });
  }

  if (!isAllowedOrigin(request.headers.get("origin"))) {
    return json({ ok: false, reason: "origin-not-allowed" }, { status: 403 });
  }

  const clientIp = request.headers.get("cf-connecting-ip") || "unknown";
  if (!consumeLocalRate(clientIp, now())) {
    return json({ ok: false, reason: "rate-limited" }, { status: 429, headers: { "retry-after": "60" } });
  }

  const supabaseUrl = String(env.SUPABASE_URL || env.VITE_SUPABASE_URL || "").replace(/\/+$/, "");
  const anonKey = String(env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY || "");
  if (!supabaseUrl || !anonKey) {
    return json({ ok: false, reason: "stats-not-configured" }, { status: 503 });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  let upstream;
  try {
    upstream = await fetchImpl(`${supabaseUrl}${RPC_PATH}`, {
      method: "POST",
      headers: {
        apikey: anonKey,
        authorization: `Bearer ${anonKey}`,
        "content-type": "application/json",
      },
      body: "{}",
      signal: controller.signal,
    });
  } catch {
    return json({ ok: false, reason: "stats-unreachable" }, { status: 502 });
  } finally {
    clearTimeout(timer);
  }
  if (!upstream.ok) {
    return json({ ok: false, reason: "stats-upstream-rejected" }, { status: 502 });
  }
  const payload = await upstream.json().catch(() => null);
  const stats = Array.isArray(payload) ? payload[0] : payload;
  if (!stats || stats.scope !== "all_available_server_history" || !stats.coverage) {
    return json({ ok: false, reason: "stats-contract-invalid" }, { status: 502 });
  }
  return json({
    schemaVersion: "community-stats-live-v1",
    checkedAt: new Date().toISOString(),
    stats,
  }, {
    cacheControl: "public, max-age=0, s-maxage=10, stale-while-revalidate=60",
    headers: { "x-community-stats-source": "supabase-aggregate" },
  });
}

export function onRequestGet(context) {
  return readCommunityStats({
    request: context.request,
    env: context.env,
  });
}

export function onRequest(context) {
  return readCommunityStats({
    request: context.request,
    env: context.env,
  });
}
