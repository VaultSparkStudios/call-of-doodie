// validate-replay — plausibility check for submitted runs.
//
// Phase 1.5: heuristic validator plus replay-contract hardening. The full
// headless resim path still needs the complete combat step in the browser and
// edge runtime, but this endpoint now validates the shape of competitive replay
// contracts and returns machine-readable confidence for quarantine decisions.

import { createClient } from "npm:@supabase/supabase-js@2";
import {
  analyzeTraceEvidence,
  buildTracePressureReceipt,
  collectTraceBodyFailures,
} from "./pressure.js";
import { consumeRateLimit, corsHeadersFor, rejectDisallowedOrigin, requestBucket } from "../_shared/http-trust.ts";

// S145 — this endpoint now enforces the same origin allowlist and bounded
// request quota as issue-run-token/submit-score instead of ACAO * with no limit.
const RATE_LIMIT = { perMinute: 30 };

const VALID_MODES = new Set(["score_attack", "daily_challenge", "boss_rush", "cursed", "speedrun", "gauntlet", "zombies", "normal", "standard"]);
interface ValidateRequest {
  seed?: number;
  mode?: string;
  difficulty?: string;
  score?: number;
  kills?: number;
  wave?: number;
  timeSec?: number;        // total run time in seconds
  bestStreak?: number;
  totalDamage?: number;
  inputHash?: string;      // reserved for Phase 2
  traceDigest?: string;    // compact replay command-trace checksum
  traceLength?: number;    // normalized command count in the trace
  traceBody?: string;      // optional compact body for body-backed contract checks
}

interface ValidateResult {
  ok: boolean;
  drift: number;            // 0..1, how far outside expected band
  reasons: string[];
  confidence: "heuristic" | "replay_contract" | "trace_contract" | "quarantine";
  traceEvidence?: {
    level: "none" | "weak" | "basic" | "rich";
    weaknessReasons: string[];
  };
  resim?: {
    method: "heuristic_pressure_estimate";
    confidence: "advisory";
    gate: "pressure-estimate-v1";
    finalWave: number;
    finalScore: number;
    driftPct: number;
    commandCount: number;
    pressureClass: "none" | "low" | "medium" | "high";
    deterministicSlices?: {
      contract: Record<string, unknown>;
      stepper: Record<string, unknown>;
      combatSlice: Record<string, unknown>;
      contactEnemySlice: Record<string, unknown>;
    };
  };
}

function difficultyMult(d: string | undefined): number {
  switch (d) {
    case "easy": return 0.85;
    case "hard": return 1.20;
    case "insane": return 1.45;
    case "nightmare": return 1.7;
    case "doodie": return 2.0;
    case "normal":
    default: return 1.0;
  }
}

/**
 * Heuristic plausibility — derives min/max expected values from observed
 * wave + time + difficulty. Uses generous bands to avoid false positives.
 * Returns drift = 0 on plausible, drift > 0 on increasing suspicion.
 */
export function validateRunHeuristic(req: ValidateRequest): ValidateResult {
  const reasons: string[] = [];
  let drift = 0;

  const wave   = Math.max(1, Math.floor(Number(req.wave    || 1)));
  const kills  = Math.max(0, Math.floor(Number(req.kills   || 0)));
  const score  = Math.max(0, Math.floor(Number(req.score   || 0)));
  const time   = Math.max(0, Math.floor(Number(req.timeSec || 0)));
  const bestStreak = Math.max(0, Math.floor(Number(req.bestStreak || 0)));
  const totalDamage = Math.max(0, Math.floor(Number(req.totalDamage || 0)));
  const dMult  = difficultyMult(req.difficulty);
  const mode   = String(req.mode || "standard");
  if (!VALID_MODES.has(mode)) reasons.push(`unknown mode: ${mode}`);

  // 1) Kills per wave: expect 4..120 per wave depending on mode/difficulty.
  const killsPerWave = wave > 0 ? kills / wave : 0;
  if (killsPerWave > 140) {
    reasons.push(`kills/wave ${killsPerWave.toFixed(1)} above 140 cap`);
    drift = Math.max(drift, Math.min(1, (killsPerWave - 140) / 200));
  }
  if (kills > 0 && killsPerWave < 1 && wave > 3) {
    reasons.push(`kills/wave ${killsPerWave.toFixed(2)} implausibly low for wave ${wave}`);
    drift = Math.max(drift, 0.5);
  }

  // 2) Score per kill: expect 5..1000 typical, scoreAttack a bit higher.
  const scorePerKill = kills > 0 ? score / kills : 0;
  const spkCap = (mode === "score_attack" || mode === "cursed") ? 5000 : 3500;
  if (scorePerKill > spkCap * dMult) {
    reasons.push(`score/kill ${scorePerKill.toFixed(0)} above mode cap ${Math.floor(spkCap * dMult)}`);
    drift = Math.max(drift, Math.min(1, (scorePerKill - spkCap * dMult) / (spkCap * dMult)));
  }

  // 3) Time-per-wave floor: ~6s minimum (boss waves can be faster but mixed).
  if (time > 0 && wave > 5) {
    const tpw = time / wave;
    if (tpw < 4) {
      reasons.push(`time/wave ${tpw.toFixed(1)}s below 4s floor`);
      drift = Math.max(drift, 0.7);
    }
  }

  // 4) Streak vs kills sanity — best streak can't exceed total kills.
  if (bestStreak > kills && kills > 0) {
    reasons.push(`bestStreak ${bestStreak} exceeds total kills ${kills}`);
    drift = Math.max(drift, 0.9);
  }

  // 5) Damage per kill — expect 30..50000 average.
  const dpk = kills > 0 ? totalDamage / kills : 0;
  if (totalDamage > 0 && (dpk < 5 || dpk > 200000)) {
    reasons.push(`damage/kill ${dpk.toFixed(0)} outside [5..200000]`);
    drift = Math.max(drift, 0.4);
  }

  const inputHash = String(req.inputHash || "");
  if (inputHash && !/^[a-f0-9]{16,128}$/i.test(inputHash)) {
    reasons.push("inputHash malformed");
    drift = Math.max(drift, 0.6);
  }
  const traceDigest = String(req.traceDigest || "");
  const traceLengthRaw = Number(req.traceLength || 0);
  const traceBody = String(req.traceBody || "");
  const hasTraceDigest = traceDigest.length > 0;
  const hasTraceLength = traceLengthRaw > 0;
  const hasTraceBody = traceBody.length > 0;
  const traceDigestValid = /^[a-f0-9]{8,128}$/i.test(traceDigest);
  const traceLengthValid = Number.isInteger(traceLengthRaw) && traceLengthRaw >= 1 && traceLengthRaw <= 240;
  const hasValidTraceContract = hasTraceDigest && hasTraceLength && traceDigestValid && traceLengthValid;
  let traceEvidence: ValidateResult["traceEvidence"] | undefined;
  let resim: ValidateResult["resim"] | undefined;
  if (hasTraceBody && (!hasTraceDigest || !hasTraceLength)) {
    reasons.push("trace body missing digest or length");
    drift = Math.max(drift, 0.6);
  }
  if (hasTraceDigest !== hasTraceLength) {
    reasons.push("trace contract incomplete");
    drift = Math.max(drift, 0.6);
  }
  if (hasTraceDigest && !traceDigestValid) {
    reasons.push("traceDigest malformed");
    drift = Math.max(drift, 0.6);
  }
  if (hasTraceLength && !traceLengthValid) {
    reasons.push("traceLength outside [1..240]");
    drift = Math.max(drift, 0.6);
  }
  if (hasTraceBody && traceDigestValid && traceLengthValid) {
    const bodyFailures = collectTraceBodyFailures(traceDigest, traceLengthRaw, traceBody);
    if (bodyFailures.length > 0) {
      reasons.push(...bodyFailures);
      drift = Math.max(drift, 0.7);
    } else {
      const nextTraceEvidence = analyzeTraceEvidence(traceBody) as NonNullable<ValidateResult["traceEvidence"]>;
      const nextResim = buildTracePressureReceipt(req, traceBody, traceLengthRaw) as NonNullable<ValidateResult["resim"]>;
      traceEvidence = nextTraceEvidence;
      resim = nextResim;
      // Pressure-estimate drift is an advisory receipt, not a hard validity gate.
      // Full deterministic parity still needs a richer stored run-state contract.
      // Keep the drift in the response for review without quarantining valid traces.
    }
  }
  const competitiveMode = mode === "daily_challenge" || mode === "gauntlet" || mode === "score_attack";
  if (competitiveMode && req.seed != null && !inputHash && !hasValidTraceContract) {
    reasons.push("competitive seeded replay missing replay contract");
    drift = Math.max(drift, 0.35);
  }

  const ok = drift < 0.5 && reasons.length === 0;
  const hasRichTraceEvidence = traceEvidence?.level === "rich";
  const confidence = ok && hasValidTraceContract && hasRichTraceEvidence
    ? "trace_contract"
    : ok && inputHash
      ? "replay_contract"
      : ok
        ? "heuristic"
        : "quarantine";
  return {
    ok,
    drift,
    reasons,
    confidence,
    ...(traceEvidence ? { traceEvidence } : {}),
    ...(resim ? { resim } : {}),
  };
}

Deno.serve(async (req) => {
  const corsHeaders = corsHeadersFor(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const originRejection = rejectDisallowedOrigin(req, corsHeaders);
  if (originRejection) return originRejection;
  try {
    // Bounded quota via the shared RPC; fail open only when the rate service
    // itself is unavailable (validation stays advisory, never load-bearing).
    try {
      const url = Deno.env.get("SUPABASE_URL");
      const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (url && key) {
        const secret = Deno.env.get("RUN_TOKEN_SIGNING_SECRET") ?? key;
        const sb = createClient(url, key);
        const bucket = await requestBucket(req, secret, "validate-replay:minute");
        const allowed = await consumeRateLimit(sb, bucket, RATE_LIMIT.perMinute, 60);
        if (!allowed) {
          return new Response(JSON.stringify({ ok: false, drift: 1, reasons: ["rate-limited"] }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": "60" },
          });
        }
      }
    } catch { /* rate service unavailable — advisory endpoint fails open */ }
    const body = (await req.json()) as ValidateRequest;
    const result = validateRunHeuristic(body || {});
    if (!result.ok) {
      // Optional anomaly log; safe if table missing.
      try {
        const url = Deno.env.get("SUPABASE_URL");
        const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
        if (url && key) {
          const sb = createClient(url, key);
          await sb.from("run_anomalies").insert([{
            kind: "validate_replay",
            payload: body,
            reasons: result.reasons,
            drift: result.drift,
          }]);
        }
      } catch { /* anomaly logging is best-effort */ }
    }
    return new Response(JSON.stringify(result), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, drift: 1, reasons: ["internal: " + String((err as Error)?.message || err)] }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
