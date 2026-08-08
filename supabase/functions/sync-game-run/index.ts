import { createClient } from "npm:@supabase/supabase-js@2";
import { consumeRateLimit, corsHeadersFor, rejectDisallowedOrigin, requestBucket } from "../_shared/http-trust.ts";

const VALID_MODES = new Set(["standard", "normal", "score_attack", "daily_challenge", "boss_rush", "cursed", "speedrun", "gauntlet", "zombies"]);
const VALID_DIFFICULTIES = new Set(["easy", "normal", "hard", "insane"]);
const VALID_FEEDBACK = new Set(["too_easy", "dialed_in", "brutal"]);
const encoder = new TextEncoder();

function clampInt(value: unknown, min: number, max: number, fallback = min) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
}

function cleanText(value: unknown, max: number, fallback = "") {
  const text = String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, "").trim();
  return text ? text.slice(0, max) : fallback;
}

function base64Url(bytes: ArrayBuffer) {
  let binary = "";
  for (const byte of new Uint8Array(bytes)) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function signSummary(secret: string, payload: Record<string, unknown>) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const serialized = JSON.stringify({
    uid: payload.uid,
    token: payload.token,
    mode: payload.mode,
    difficulty: payload.difficulty,
    seed: payload.seed,
    starterLoadout: payload.starterLoadout,
    expiresAt: payload.expiresAt,
  });
  return base64Url(await crypto.subtle.sign("HMAC", key, encoder.encode(serialized)));
}

Deno.serve(async (req) => {
  const corsHeaders = corsHeadersFor(req);
  const originRejection = rejectDisallowedOrigin(req, corsHeaders);
  if (originRejection) return originRejection;
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!supabaseUrl || !anonKey || !serviceRoleKey) throw new Error("Missing Supabase env configuration.");

    const serviceClient = createClient(supabaseUrl, serviceRoleKey);
    const bucket = await requestBucket(req, Deno.env.get("RUN_TOKEN_SIGNING_SECRET") ?? serviceRoleKey, "sync-game-run");
    if (!await consumeRateLimit(serviceClient, `${bucket}:minute`, 30, 60)) {
      return new Response(JSON.stringify({ error: "Run sync limit reached." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json();
    const runToken = cleanText(body.runToken, 160);
    const summarySig = cleanText(body.summarySig, 200);
    const clientUid = typeof body.clientUid === "string" && /^[0-9a-f-]{36}$/i.test(body.clientUid) ? body.clientUid : null;
    if (!runToken || !summarySig || !clientUid) {
      return new Response(JSON.stringify({ error: "Run identity is incomplete." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await userClient.auth.getUser().catch(() => ({ data: { user: null } }));
    const playerKey = user?.id ?? clientUid;

    const { data: tokenRow, error: tokenError } = await serviceClient
      .from("run_tokens")
      .select("token,uid,mode,difficulty,seed,created_at,expires_at")
      .eq("token", runToken)
      .maybeSingle();
    if (tokenError) throw tokenError;
    if (!tokenRow || tokenRow.uid !== playerKey) {
      return new Response(JSON.stringify({ error: "Invalid run token." }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const mode = VALID_MODES.has(String(body.mode ?? "")) ? String(body.mode) : "standard";
    const tokenMode = tokenRow.mode || null;
    const normalizedMode = mode === "standard" ? null : mode;
    const difficulty = VALID_DIFFICULTIES.has(String(body.difficulty ?? "")) ? String(body.difficulty) : "normal";
    const seed = body.seed == null ? null : clampInt(body.seed, 0, 999999999, 0);
    const starterLoadout = cleanText(body.starterLoadout, 24, "standard");
    if (tokenMode !== normalizedMode || tokenRow.difficulty !== difficulty || (tokenRow.seed ?? null) !== seed) {
      return new Response(JSON.stringify({ error: "Run claim does not match its token." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const expectedSig = await signSummary(Deno.env.get("RUN_TOKEN_SIGNING_SECRET") ?? serviceRoleKey, {
      uid: playerKey,
      token: tokenRow.token,
      mode: tokenMode,
      difficulty,
      seed,
      starterLoadout,
      expiresAt: new Date(tokenRow.expires_at).toISOString(),
    });
    if (summarySig !== expectedSig) {
      return new Response(JSON.stringify({ error: "Run summary signature mismatch." }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const callsign = cleanText(body.name, 24, "Anonymous");
    const lastWords = cleanText(body.lastWords, 60) || null;
    const feedback = VALID_FEEDBACK.has(String(body.feedbackDifficulty ?? "")) ? String(body.feedbackDifficulty) : null;
    const isSynthetic = callsign.startsWith("hc-") && seed === 424242 && lastWords === "health-check clear";
    const row = {
      run_key: runToken,
      player_key: playerKey,
      user_id: user?.id ?? null,
      game_id: "cod",
      callsign,
      mode,
      difficulty,
      seed,
      score: clampInt(body.score, 0, 10000000, 0),
      kills: clampInt(body.kills, 0, 1000000, 0),
      wave: clampInt(body.wave, 1, 10000, 1),
      duration_s: clampInt(body.durationSeconds, 0, 86400, 0),
      total_damage: clampInt(body.totalDamage, 0, 100000000, 0),
      total_shots: clampInt(body.totalShots, 0, 10000000, 0),
      total_hits: clampInt(body.totalHits, 0, 10000000, 0),
      total_crits: clampInt(body.totalCrits, 0, 1000000, 0),
      boss_kills: clampInt(body.bossKills, 0, 100000, 0),
      feedback_difficulty: feedback,
      last_words: lastWords,
      practice: Boolean(body.practice),
      is_synthetic: isSynthetic,
      completed_at: new Date(Math.max(new Date(tokenRow.created_at).getTime(), Date.now() - 86400000)).toISOString(),
      received_at: new Date().toISOString(),
    };
    const { error: upsertError } = await serviceClient.from("game_run_facts").upsert([row], { onConflict: "run_key" });
    if (upsertError) throw upsertError;
    const { data: stats, error: statsError } = await serviceClient.rpc("get_cod_community_stats");
    if (statsError) throw statsError;
    return new Response(JSON.stringify({ ok: true, stats }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown run sync failure";
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
