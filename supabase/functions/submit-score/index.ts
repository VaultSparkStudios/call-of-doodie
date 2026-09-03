import { createClient } from "npm:@supabase/supabase-js@2";
import { consumeRateLimit, corsHeadersFor, rejectDisallowedOrigin, requestBucket } from "../_shared/http-trust.ts";

const VALID_MODES = new Set(["score_attack", "daily_challenge", "boss_rush", "cursed", "speedrun", "gauntlet", "zombies", "normal"]);
const VALID_FEEDBACK = new Set(["too_easy", "dialed_in", "brutal"]);
const VALID_DIFFICULTIES = new Set(["easy", "normal", "hard", "insane"]);
const VALID_INPUT_DEVICES = new Set(["mouse", "mobile", "controller", "generic", "xbox", "ps"]);
const MAX_TRACE_BODY_BYTES = 10000;
const encoder = new TextEncoder();

function checksum(serialized: string) {
  let hash = 2166136261;
  for (let i = 0; i < serialized.length; i++) {
    hash ^= serialized.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).toUpperCase().padStart(8, "0");
}

function clampInt(value: unknown, min: number, max: number, fallback = min) {
  const num = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(max, Math.max(min, num));
}

function cleanText(value: unknown, maxLen: number, fallback = "") {
  const text = String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, "").trim();
  return text ? text.slice(0, maxLen) : fallback;
}

function parseRunTime(value: string) {
  const match = value.match(/^(\d+):([0-5]\d)$/);
  if (!match) return 0;
  return Number.parseInt(match[1], 10) * 60 + Number.parseInt(match[2], 10);
}

function toBase64Url(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function canonicalSummary(parts: {
  uid: string;
  token: string;
  mode: string | null;
  difficulty: string;
  seed: number | null;
  starterLoadout: string;
  expiresAt: string;
}) {
  return [
    parts.uid,
    parts.token,
    parts.mode ?? "",
    parts.difficulty,
    parts.seed ?? "",
    parts.starterLoadout,
    parts.expiresAt,
  ].join("|");
}

async function signSummary(secret: string, parts: Parameters<typeof canonicalSummary>[0]) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(canonicalSummary(parts)));
  return toBase64Url(signature);
}

async function logRunAnomaly(serviceClient: ReturnType<typeof createClient>, payload: Record<string, unknown>) {
  try {
    await serviceClient.from("run_anomalies").insert([payload]);
  } catch {
    // Optional table; keep trust path compatible until migration is applied.
  }
}

function getDifficultyMultiplier(difficulty: string) {
  switch (difficulty) {
    case "easy": return 0.85;
    case "hard": return 1.15;
    case "insane": return 1.3;
    default: return 1;
  }
}

function getModeMultiplier(mode: string | null) {
  switch (mode) {
    case "score_attack": return 1.35;
    case "daily_challenge": return 1.15;
    case "boss_rush": return 1.55;
    case "cursed": return 1.4;
    case "speedrun": return 1.2;
    case "gauntlet": return 1.25;
    default: return 1;
  }
}

function collectPlausibilityFailures(entry: ReturnType<typeof normalizeEntry>, reportedTime: number) {
  const reasons: string[] = [];
  const modeMult = getModeMultiplier(entry.mode);
  const difficultyMult = getDifficultyMultiplier(entry.difficulty);
  const scale = modeMult * difficultyMult;
  const safeTime = Math.max(reportedTime, 1);

  const maxKills = Math.floor((80 + entry.wave * 28 + entry.wave * entry.wave * 1.6 + safeTime * 14) * scale);
  const maxDamage = Math.floor((120000 + entry.kills * 4500 + entry.wave * 18000 + safeTime * 10000) * scale);
  const maxScore = Math.floor((250000 + entry.kills * 18000 + entry.wave * 250000 + safeTime * 120000) * scale);
  const maxLevel = Math.floor(25 + entry.wave * 3 + safeTime / 4);

  if (entry.kills > maxKills) reasons.push("kills exceed plausible wave/time envelope");
  if (entry.totalDamage > maxDamage) reasons.push("damage exceeds plausible combat envelope");
  if (entry.score > maxScore) reasons.push("score exceeds plausible kill/wave envelope");
  if (entry.bestStreak > entry.kills) reasons.push("best streak exceeds total kills");
  if (entry.level > maxLevel) reasons.push("level exceeds plausible progression envelope");

  const killsPerSecond = entry.kills / safeTime;
  const damagePerSecond = entry.totalDamage / safeTime;
  if (killsPerSecond > 18 * scale) reasons.push("kills per second exceed cap");
  if (damagePerSecond > 65000 * scale) reasons.push("damage per second exceed cap");

  return reasons;
}

function collectDigestFailures(entry: ReturnType<typeof normalizeEntry>, digest: Record<string, unknown> | null) {
  const reasons: string[] = [];
  if (!digest) return reasons;

  if (digest.v !== 1 && digest.v !== 2) reasons.push("event digest version is unsupported");
  if (digest.mode && digest.mode !== (entry.mode || "standard")) reasons.push("event digest mode mismatch");
  if (digest.difficulty && digest.difficulty !== entry.difficulty) reasons.push("event digest difficulty mismatch");
  if ((digest.seed ?? null) !== (entry.seed ?? null)) reasons.push("event digest seed mismatch");

  const scoreBand = Math.floor(entry.score / 5000);
  const killBand = Math.floor(entry.kills / 10);
  const damageBand = Math.floor(entry.totalDamage / 25000);
  const streakBand = Math.floor(entry.bestStreak / 10);
  if (Number(digest.scoreBand) !== scoreBand) reasons.push("event digest score band mismatch");
  if (Number(digest.killBand) !== killBand) reasons.push("event digest kill band mismatch");
  if (Number(digest.damageBand) !== damageBand) reasons.push("event digest damage band mismatch");
  if (Number(digest.streakBand) !== streakBand) reasons.push("event digest streak band mismatch");
  if (digest.v === 2) {
    const expectedParts = [
      `m:${entry.mode || "standard"}`,
      `d:${entry.difficulty}`,
      `w:${Math.floor(entry.wave / 5)}`,
      `s:${scoreBand}`,
      `k:${killBand}`,
      `l:${entry.level}`,
      `p:${Number(digest.perkCount) || 0}`,
      `a:${Number(digest.achievementCount) || 0}`,
    ];
    const timeline = typeof digest.timeline === "string" ? digest.timeline : "";
    for (const part of expectedParts) {
      if (!timeline.includes(part)) reasons.push(`event digest timeline missing ${part}`);
    }
  }

  return reasons;
}

function collectTraceFailures(traceDigest: string, traceLength: number, traceBody: string) {
  const reasons: string[] = [];
  const hasDigest = traceDigest.length > 0;
  const hasLength = traceLength > 0;
  const hasBody = traceBody.length > 0;

  if (!hasDigest && !hasLength && !hasBody) return reasons;
  if (hasDigest !== hasLength) reasons.push("trace contract incomplete");
  if (hasDigest && !/^[a-f0-9]{8,128}$/i.test(traceDigest)) reasons.push("traceDigest malformed");
  if (hasLength && (!Number.isInteger(traceLength) || traceLength < 1 || traceLength > 240)) {
    reasons.push("traceLength outside [1..240]");
  }
  if (hasBody) {
    if (!/^[a-z0-9._:~-]+$/i.test(traceBody)) reasons.push("traceBody malformed");
    if (encoder.encode(traceBody).length > MAX_TRACE_BODY_BYTES) reasons.push("traceBody exceeds byte budget");
    const bodyCount = traceBody.split("~").filter(Boolean).length;
    if (bodyCount !== traceLength) reasons.push("traceBody count mismatch");
    if (hasDigest && checksum(traceBody).toUpperCase() !== traceDigest.toUpperCase()) {
      reasons.push("traceBody digest mismatch");
    }
  }

  return reasons;
}

function analyzeTraceEvidence(traceBody: string) {
  const parts = traceBody ? traceBody.split("~").filter(Boolean) : [];
  const actions: Record<string, number> = {};
  let firstFrame: number | null = null;
  let lastFrame: number | null = null;

  for (const part of parts) {
    const [frame, action] = part.split(".");
    const parsedFrame = Number.parseInt(frame || "", 36);
    if (!Number.isFinite(parsedFrame)) continue;
    if (firstFrame == null) firstFrame = parsedFrame;
    lastFrame = parsedFrame;
    actions[action || ""] = (actions[action || ""] || 0) + 1;
  }

  const durationFrames = firstFrame != null && lastFrame != null ? Math.max(0, lastFrame - firstFrame) : 0;
  const movementCount = actions.move || 0;
  const aimCount = actions.aim || 0;
  const shootCount = actions.shoot || 0;
  const interactionCount = ["shoot", "reload", "dash", "grenade", "perk", "route", "shop", "swap", "pause"]
    .reduce((total, action) => total + (actions[action] || 0), 0);
  const weaknessReasons: string[] = [];

  if (parts.length === 0) weaknessReasons.push("no-events");
  if (parts.length > 0 && parts.length < 3) weaknessReasons.push("too-few-events");
  if (durationFrames > 0 && durationFrames < 60) weaknessReasons.push("short-duration");
  if (movementCount < 2) weaknessReasons.push("low-movement-evidence");
  if (aimCount < 1 && shootCount > 0) weaknessReasons.push("missing-aim-evidence");
  if (interactionCount < 2) weaknessReasons.push("low-interaction-evidence");

  let level: "none" | "weak" | "basic" | "rich" = "none";
  if (parts.length > 0) level = "weak";
  if (parts.length >= 3 && interactionCount >= 1 && durationFrames >= 24) level = "basic";
  if (parts.length >= 6 && durationFrames >= 60 && movementCount >= 2 && aimCount >= 1 && interactionCount >= 2) {
    level = "rich";
  }

  return {
    level,
    count: parts.length,
    durationFrames,
    movementCount,
    aimCount,
    shootCount,
    interactionCount,
    weaknessReasons,
  };
}

function normalizeEntry(entry: Record<string, unknown>) {
  const mode = VALID_MODES.has(String(entry.mode ?? "")) ? String(entry.mode) : null;
  return {
    name: cleanText(entry.name, 24, "Anonymous"),
    score: clampInt(entry.score, 0, 10000000, 0),
    kills: clampInt(entry.kills, 0, 1000000, 0),
    wave: clampInt(entry.wave, 1, 10000, 1),
    lastWords: cleanText(entry.lastWords, 60, "..."),
    // S163: optional downsampled ghost path for live ghost races (base-36 "f.x.y" triples).
    ghost_path: typeof entry.ghostPath === "string" && /^[a-z0-9.;]{1,8192}$/i.test(entry.ghostPath) ? entry.ghostPath : null,
    // S163: optional squad code groups friends on the board.
    squad_code: typeof entry.squadCode === "string" && /^[A-Z0-9]{4,12}$/.test(entry.squadCode) ? entry.squadCode : null,
    rank: cleanText(entry.rank, 40, "Noob Potato"),
    bestStreak: clampInt(entry.bestStreak, 0, 100000, 0),
    totalDamage: clampInt(entry.totalDamage, 0, 100000000, 0),
    level: clampInt(entry.level, 1, 9999, 1),
    time: cleanText(entry.time, 8, "0:00"),
    achievements: clampInt(entry.achievements, 0, 999, 0),
    difficulty: VALID_DIFFICULTIES.has(String(entry.difficulty ?? "")) ? String(entry.difficulty) : "normal",
    starterLoadout: cleanText(entry.starterLoadout, 24, "standard"),
    customSettings: Boolean(entry.customSettings),
    inputDevice: VALID_INPUT_DEVICES.has(String(entry.inputDevice ?? "")) ? String(entry.inputDevice) : "mouse",
    seed: entry.seed == null ? null : clampInt(entry.seed, 0, 999999999, 0),
    accountLevel: clampInt(entry.accountLevel, 1, 9999, 1),
    prestige: clampInt(entry.prestige, 0, 99, 0),
    mode,
    game_id: "cod",
    feedback_difficulty: VALID_FEEDBACK.has(String(entry.feedbackDifficulty ?? "")) ? String(entry.feedbackDifficulty) : null,
    total_shots: clampInt(entry.totalShots, 0, 10000000, 0),
    total_hits: clampInt(entry.totalHits, 0, 10000000, 0),
    boss_kills: clampInt(entry.bossKills, 0, 100000, 0),
    total_crits: clampInt(entry.totalCrits, 0, 1000000, 0),
  };
}

Deno.serve(async (req) => {
  const corsHeaders = corsHeadersFor(req);
  const originRejection = rejectDisallowedOrigin(req, corsHeaders);
  if (originRejection) return originRejection;
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: "Missing Supabase env configuration." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const serviceClient = createClient(supabaseUrl, serviceRoleKey);

    const requestKey = await requestBucket(req, Deno.env.get("RUN_TOKEN_SIGNING_SECRET") ?? serviceRoleKey, "submit-score");
    const [withinMinuteBudget, withinDayBudget] = await Promise.all([
      consumeRateLimit(serviceClient, `${requestKey}:minute`, 30, 60),
      consumeRateLimit(serviceClient, `${requestKey}:day`, 500, 86_400),
    ]);
    if (!withinMinuteBudget || !withinDayBudget) {
      return new Response(JSON.stringify({ error: "Score submission limit reached. Try again later." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": withinMinuteBudget ? "3600" : "60" },
      });
    }

    // Try Supabase user auth first; fall back to client-provided stable UUID.
    // This supports projects with CAPTCHA protection enabled where anonymous
    // sign-in is unavailable from the browser.
    const { data: { user } } = await userClient.auth.getUser().catch(() => ({ data: { user: null } }));

    const rawBody = await req.json();
    const runToken = typeof rawBody.runToken === "string" ? rawBody.runToken.trim() : "";
    const summarySig = typeof rawBody.summarySig === "string" ? rawBody.summarySig.trim() : "";
    if (!runToken) {
      return new Response(JSON.stringify({ error: "Missing run token." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resolve the caller's identity: prefer real Supabase user, fall back to
    // a client-generated stable UUID passed in the request body.
    const uid: string = user?.id
      ?? (typeof rawBody.clientUid === "string" && /^[0-9a-f-]{36}$/i.test(rawBody.clientUid) ? rawBody.clientUid : null)
      ?? "";

    const payload = normalizeEntry(rawBody);
    const eventDigest = rawBody.eventDigest && typeof rawBody.eventDigest === "object"
      ? rawBody.eventDigest as Record<string, unknown>
      : null;
    const traceDigest = typeof rawBody.traceDigest === "string" ? rawBody.traceDigest.trim() : "";
    const traceLength = clampInt(rawBody.traceLength, 0, 240, 0);
    const traceBody = typeof rawBody.traceBody === "string" ? rawBody.traceBody.trim() : "";
    let traceEvidence: ReturnType<typeof analyzeTraceEvidence> | null = null;

    const { data: tokenRow, error: tokenError } = await serviceClient
      .from("run_tokens")
      .select("token,uid,mode,difficulty,seed,created_at,expires_at,used_at")
      .eq("token", runToken)
      .maybeSingle();
    if (tokenError) throw tokenError;
    if (!tokenRow || tokenRow.uid !== uid) {
      await logRunAnomaly(serviceClient, {
        token: runToken,
        uid,
        reason: "invalid_run_token",
        metadata: { mode: payload.mode, difficulty: payload.difficulty, seed: payload.seed },
      });
      return new Response(JSON.stringify({ error: "Invalid run token." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (tokenRow.used_at) {
      return new Response(JSON.stringify({ error: "Run token already used." }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (new Date(tokenRow.expires_at).getTime() <= Date.now()) {
      return new Response(JSON.stringify({ error: "Run token expired." }), {
        status: 410,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if ((tokenRow.mode || null) !== payload.mode) {
      return new Response(JSON.stringify({ error: "Run token mode mismatch." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (tokenRow.difficulty !== payload.difficulty) {
      return new Response(JSON.stringify({ error: "Run token difficulty mismatch." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if ((tokenRow.seed ?? null) !== (payload.seed ?? null)) {
      return new Response(JSON.stringify({ error: "Run token seed mismatch." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // Normalize expires_at to the same JS ISO format used when signing in issue-run-token.
    // PostgREST returns TIMESTAMPTZ as "+00:00" not "Z", which would cause an HMAC mismatch.
    const expectedSummarySig = await signSummary(
      Deno.env.get("RUN_TOKEN_SIGNING_SECRET") ?? serviceRoleKey,
      {
        uid,
        token: tokenRow.token,
        mode: tokenRow.mode || null,
        difficulty: tokenRow.difficulty,
        seed: tokenRow.seed ?? null,
        starterLoadout: payload.starterLoadout,
        expiresAt: new Date(tokenRow.expires_at).toISOString(),
      },
    );
    if (!summarySig || summarySig !== expectedSummarySig) {
      await logRunAnomaly(serviceClient, {
        token: runToken,
        uid,
        reason: "run_summary_signature_mismatch",
        metadata: {
          mode: payload.mode,
          difficulty: payload.difficulty,
          seed: payload.seed,
          starterLoadout: payload.starterLoadout,
        },
      });
      return new Response(JSON.stringify({ error: "Run summary signature mismatch." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const reportedTime = parseRunTime(payload.time);
    const runAgeSeconds = Math.max(0, Math.floor((Date.now() - new Date(tokenRow.created_at).getTime()) / 1000));
    if (reportedTime > runAgeSeconds + 5) {
      return new Response(JSON.stringify({ error: "Reported run time exceeds token age." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const plausibilityFailures = collectPlausibilityFailures(payload, reportedTime);
    if (plausibilityFailures.length > 0) {
      await logRunAnomaly(serviceClient, {
        token: runToken,
        uid,
        reason: "plausibility_reject",
        metadata: {
          mode: payload.mode,
          difficulty: payload.difficulty,
          wave: payload.wave,
          score: payload.score,
          reasons: plausibilityFailures.slice(0, 5),
        },
      });
      return new Response(JSON.stringify({
        error: "Run rejected by plausibility validation.",
        reasons: plausibilityFailures.slice(0, 3),
      }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const digestFailures = collectDigestFailures(payload, eventDigest);
    if (digestFailures.length > 0) {
      await logRunAnomaly(serviceClient, {
        token: runToken,
        uid,
        reason: "event_digest_mismatch",
        metadata: {
          mode: payload.mode,
          difficulty: payload.difficulty,
          wave: payload.wave,
          score: payload.score,
          reasons: digestFailures.slice(0, 5),
        },
      });
      return new Response(JSON.stringify({
        error: "Run rejected by event digest validation.",
        reasons: digestFailures.slice(0, 3),
      }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const traceFailures = collectTraceFailures(traceDigest, traceLength, traceBody);
    if (traceFailures.length > 0) {
      await logRunAnomaly(serviceClient, {
        token: runToken,
        uid,
        reason: "replay_trace_malformed",
        metadata: {
          mode: payload.mode,
          difficulty: payload.difficulty,
          wave: payload.wave,
          score: payload.score,
          reasons: traceFailures.slice(0, 5),
        },
      });
      return new Response(JSON.stringify({
        error: "Run rejected by replay trace validation.",
        reasons: traceFailures.slice(0, 3),
      }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (traceBody) {
      traceEvidence = analyzeTraceEvidence(traceBody);
    }

    const { data: claim } = await serviceClient
      .from("callsign_claims")
      .select("uid,supporter")
      .eq("name", payload.name)
      .maybeSingle();

    if (claim?.uid && claim.uid !== uid) {
      await logRunAnomaly(serviceClient, {
        token: runToken,
        uid,
        reason: "callsign_claim_mismatch",
        metadata: { name: payload.name },
      });
      return new Response(JSON.stringify({ error: "Callsign already claimed by another player." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supporter = Boolean(claim?.supporter);
    const isSynthetic = payload.name.startsWith("hc-")
      && payload.seed === 424242
      && payload.lastWords === "health-check clear"
      && payload.score === 1875
      && payload.kills === 24
      && payload.wave === 5;
    const row = { ...payload, supporter, is_synthetic: isSynthetic, source_run_token: runToken, ts: Date.now() };

    const { data: consumeRows, error: consumeError } = await serviceClient
      .from("run_tokens")
      .update({ used_at: new Date().toISOString() })
      .eq("token", runToken)
      .is("used_at", null)
      .select("token");
    if (consumeError) throw consumeError;
    if (!consumeRows || consumeRows.length !== 1) {
      return new Response(JSON.stringify({ error: "Run token could not be consumed." }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: insertError } = await serviceClient.from("leaderboard").insert([row]);
    if (insertError) throw insertError;

    await serviceClient.from("game_run_facts").upsert([{
      run_key: runToken,
      player_key: uid,
      user_id: user?.id ?? null,
      game_id: "cod",
      callsign: row.name,
      mode: row.mode || "standard",
      difficulty: row.difficulty,
      seed: row.seed,
      score: row.score,
      kills: row.kills,
      wave: row.wave,
      duration_s: parseRunTime(row.time),
      total_damage: row.totalDamage,
      total_shots: row.total_shots,
      total_hits: row.total_hits,
      total_crits: row.total_crits,
      boss_kills: row.boss_kills,
      feedback_difficulty: row.feedback_difficulty,
      last_words: row.lastWords,
      practice: false,
      is_synthetic: isSynthetic,
      received_at: new Date().toISOString(),
    }], { onConflict: "run_key" });

    const { data: member } = uid ? await serviceClient
      .from("vault_members")
      .select("id")
      .eq("id", uid)
      .maybeSingle() : { data: null };

    if (member) {
      await serviceClient.from("game_sessions").insert([{
        user_id: uid,
        game_slug: "call-of-doodie",
        score: row.score,
        duration_s: parseRunTime(row.time),
        metadata: {
          kills: row.kills,
          wave: row.wave,
          level: row.level,
          difficulty: row.difficulty,
          mode: row.mode || "standard",
          bestStreak: row.bestStreak,
          achievements: row.achievements,
          traceDigest: traceDigest || null,
          traceLength,
          traceBody: traceBody || null,
          traceEvidence,
        },
      }]);

      await serviceClient.rpc("award_vault_points", {
        p_user_id: uid,
        p_event_type: "game_session",
        p_points: 3,
        p_metadata: { game: "call-of-doodie", score: row.score, wave: row.wave },
      });
    }

    return new Response(JSON.stringify({ ok: true, entry: row, traceEvidence }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown submit-score failure";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
