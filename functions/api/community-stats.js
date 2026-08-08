const RPC_PATH = "/rest/v1/rpc/get_cod_community_stats";
const UPSTREAM_TIMEOUT_MS = 5000;

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

export async function readCommunityStats({ request, env = {}, fetchImpl = fetch }) {
  if (request.method !== "GET") {
    return json({ ok: false, reason: "method-not-allowed" }, {
      status: 405,
      headers: { allow: "GET" },
    });
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
