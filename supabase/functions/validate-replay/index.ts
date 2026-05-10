// validate-replay — plausibility check for submitted runs.
//
// Phase 1 (this commit): heuristic validator. Computes expected score/kill
// bounds from {wave, mode, difficulty, time} and quarantines submissions
// outside the band. Returns { ok, drift, reasons } so the client can show
// a transparent rejection message.
//
// Phase 2 (planned): deterministic re-simulation from {seed, input_hash}.
// The game engine ships a pure-fn core that the worker can run headlessly;
// we add a sim runner here, compare the byte-identical score, and reject on
// >2% drift. That requires extracting the combat resolver — see App.jsx
// scaffolding in src/systems/combatResolution.js.

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const VALID_MODES = new Set(["score_attack", "daily_challenge", "boss_rush", "cursed", "speedrun", "gauntlet", "normal", "standard"]);

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
}

interface ValidateResult {
  ok: boolean;
  drift: number;            // 0..1, how far outside expected band
  reasons: string[];
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

  return { ok: drift < 0.5 && reasons.length === 0, drift, reasons };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
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
