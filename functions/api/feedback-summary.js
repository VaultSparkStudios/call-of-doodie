import { createLocalRateLimiter } from "../../src/server/localRateLimiter.js";

const consumeRate = createLocalRateLimiter(60);
const allowedOrigins = new Set([
  "https://callofdoodie.wtf", "https://www.callofdoodie.wtf",
  "https://playcallofdoodie.com", "https://www.playcallofdoodie.com",
  "http://localhost:5173", "http://localhost:4173", "http://localhost:4174",
]);

function allowedOrigin(origin) {
  if (!origin || allowedOrigins.has(origin)) return true;
  try {
    const url = new URL(origin);
    return url.protocol === "https:" && (url.hostname === "call-of-doodie.pages.dev" || url.hostname.endsWith(".call-of-doodie.pages.dev"));
  } catch { return false; }
}

function reply(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), { status, headers: {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    ...headers,
  } });
}

export async function readFeedbackSummary({ request, env = {}, fetchImpl = fetch, now = () => Date.now() }) {
  if (request.method !== "GET") return reply({ ok: false, reason: "method-not-allowed" }, 405, { allow: "GET" });
  if (!allowedOrigin(request.headers.get("origin"))) return reply({ ok: false, reason: "origin-not-allowed" }, 403);
  if (!consumeRate(request.headers.get("cf-connecting-ip") || "unknown", now())) return reply({ ok: false, reason: "rate-limited" }, 429, { "retry-after": "60" });

  const supabaseUrl = String(env.SUPABASE_URL || env.VITE_SUPABASE_URL || "").replace(/\/+$/, "");
  const anonKey = String(env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY || "");
  if (!supabaseUrl || !anonKey) return reply({ ok: false, reason: "summary-not-configured" }, 503);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  let upstream;
  try {
    upstream = await fetchImpl(`${supabaseUrl}/rest/v1/rpc/get_cod_field_report_summary`, {
      method: "POST",
      headers: { apikey: anonKey, authorization: `Bearer ${anonKey}`, "content-type": "application/json" },
      body: "{}",
      signal: controller.signal,
    });
  } catch {
    return reply({ ok: false, reason: "summary-unreachable" }, 502);
  } finally {
    clearTimeout(timer);
  }
  if (!upstream.ok) return reply({ ok: false, reason: "summary-upstream-rejected" }, 502);
  const summary = await upstream.json().catch(() => null);
  if (!summary || summary.schemaVersion !== "field-report-summary-v1" || !Number.isInteger(summary.responses) || summary.responses < 0) {
    return reply({ ok: false, reason: "summary-contract-invalid" }, 502);
  }
  return reply({ checkedAt: new Date(now()).toISOString(), summary }, 200, {
    "cache-control": "public, max-age=0, s-maxage=30, stale-while-revalidate=60",
    "x-feedback-summary-source": "supabase-aggregate",
  });
}

export function onRequestGet(context) { return readFeedbackSummary({ request: context.request, env: context.env }); }
export function onRequest(context) { return readFeedbackSummary({ request: context.request, env: context.env }); }
