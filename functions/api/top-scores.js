// S155 — public read endpoint for the /leaderboard/ page's live top-10.
// Same origin-allowlist + per-isolate rate-bucket pattern as
// community-stats.js (S153 trust decision): browser requests from foreign
// origins are rejected, absent Origin headers are allowed, and a cheap local
// rate ceiling bounds abuse on this read-only surface.

const UPSTREAM_TIMEOUT_MS = 5000;
const TOP_LIMIT = 10;

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

export async function readTopScores({ request, env = {}, fetchImpl = fetch, now = () => Date.now() }) {
  if (request.method !== "GET") {
    return json({ ok: false, reason: "method-not-allowed" }, { status: 405, headers: { allow: "GET" } });
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
    return json({ ok: false, reason: "leaderboard-not-configured" }, { status: 503 });
  }

  // Same anon read the in-game LeaderboardPanel performs, restricted to the
  // public display columns — no seeds, settings, or device metadata.
  const params = new URLSearchParams({
    select: "name,score,kills,wave,mode,difficulty,accountLevel,supporter,ts",
    game_id: "eq.cod",
    order: "score.desc",
    limit: String(TOP_LIMIT),
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  let upstream;
  try {
    upstream = await fetchImpl(`${supabaseUrl}/rest/v1/leaderboard?${params}`, {
      headers: { apikey: anonKey, authorization: `Bearer ${anonKey}` },
      signal: controller.signal,
    });
  } catch {
    return json({ ok: false, reason: "leaderboard-unreachable" }, { status: 502 });
  } finally {
    clearTimeout(timer);
  }
  if (!upstream.ok) {
    return json({ ok: false, reason: "leaderboard-upstream-rejected" }, { status: 502 });
  }
  const rows = await upstream.json().catch(() => null);
  if (!Array.isArray(rows)) {
    return json({ ok: false, reason: "leaderboard-contract-invalid" }, { status: 502 });
  }
  return json({
    schemaVersion: "top-scores-v1",
    checkedAt: new Date(now()).toISOString(),
    limit: TOP_LIMIT,
    entries: rows.map((row) => ({
      name: String(row.name || "UNKNOWN").slice(0, 24),
      score: Number(row.score) || 0,
      kills: Number(row.kills) || 0,
      wave: Number(row.wave) || 0,
      mode: row.mode || "standard",
      difficulty: row.difficulty || "normal",
      accountLevel: Number(row.accountLevel) || 1,
      supporter: Boolean(row.supporter),
      ts: Number(row.ts) || null,
    })),
  }, {
    cacheControl: "public, max-age=0, s-maxage=30, stale-while-revalidate=120",
  });
}

export function onRequestGet(context) {
  return readTopScores({ request: context.request, env: context.env });
}

export function onRequest(context) {
  return readTopScores({ request: context.request, env: context.env });
}
