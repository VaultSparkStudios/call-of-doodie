import { createLocalRateLimiter } from "../../src/server/localRateLimiter.js";

const consumeRate = createLocalRateLimiter(60);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const origins = new Set(["https://callofdoodie.wtf", "https://www.callofdoodie.wtf", "http://localhost:5173", "http://localhost:4173", "http://localhost:4174"]);

function allowedOrigin(origin) {
  if (!origin || origins.has(origin)) return true;
  try { const url = new URL(origin); return url.protocol === "https:" && (url.hostname === "call-of-doodie.pages.dev" || url.hostname.endsWith(".call-of-doodie.pages.dev")); } catch { return false; }
}
function reply(body, status = 200) { return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } }); }

export async function readDuelPreview({ request, env = {}, fetchImpl = fetch, now = () => Date.now() }) {
  if (request.method !== "GET") return reply({ ok: false, reason: "method-not-allowed" }, 405);
  if (!allowedOrigin(request.headers.get("origin"))) return reply({ ok: false, reason: "origin-not-allowed" }, 403);
  if (!consumeRate(request.headers.get("cf-connecting-ip") || "unknown", now())) return reply({ ok: false, reason: "rate-limited" }, 429);
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!UUID.test(String(id || "")) || [...url.searchParams.keys()].some((key) => key !== "id") || url.searchParams.getAll("id").length !== 1) return reply({ ok: false, reason: "invalid-duel-id" }, 400);
  const supabaseUrl = String(env.SUPABASE_URL || env.VITE_SUPABASE_URL || "").replace(/\/+$/, "");
  const anonKey = String(env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY || "");
  if (!supabaseUrl || !anonKey) return reply({ ok: false, reason: "duel-preview-not-configured" }, 503);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  let upstream;
  try {
    upstream = await fetchImpl(`${supabaseUrl}/rest/v1/duels?id=eq.${id}&select=id,seed,mode,difficulty,challenger_name,challenger_score,expires_at,responder_score`, {
      headers: { apikey: anonKey, authorization: `Bearer ${anonKey}`, accept: "application/json" },
      signal: controller.signal,
    });
  } catch { return reply({ ok: false, reason: "duel-preview-unreachable" }, 502); }
  finally { clearTimeout(timer); }
  if (!upstream.ok) return reply({ ok: false, reason: "duel-preview-rejected" }, 502);
  const rows = await upstream.json().catch(() => null);
  const row = Array.isArray(rows) && rows.length === 1 ? rows[0] : null;
  if (!row || row.id !== id || !Number.isInteger(row.seed) || !Number.isInteger(row.challenger_score) || !Number.isFinite(Date.parse(row.expires_at))) return reply({ ok: false, reason: "duel-not-found" }, 404);
  const duel = {
    id: row.id, seed: row.seed, mode: row.mode, difficulty: row.difficulty,
    name: row.challenger_name, score: row.challenger_score, expiresAt: row.expires_at,
    status: Date.parse(row.expires_at) <= now() ? "expired" : row.responder_score != null ? "answered" : "open",
  };
  return reply({ duel });
}

export function onRequestGet(context) { return readDuelPreview({ request: context.request, env: context.env }); }
export function onRequest(context) { return readDuelPreview({ request: context.request, env: context.env }); }
