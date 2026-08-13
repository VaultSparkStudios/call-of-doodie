import { getSecret } from "./lib/secrets.mjs";

function getConfig() {
  const supabaseUrl = getSecret("SUPABASE_URL", "supabase.admin");
  const anonKey = getSecret("SUPABASE_ANON_KEY", "supabase.admin");
  if (!supabaseUrl || !anonKey) {
    throw new Error("Missing VITE_SUPABASE_URL/SUPABASE_URL or VITE_SUPABASE_ANON_KEY/SUPABASE_ANON_KEY.");
  }
  return {
    endpoint: `${supabaseUrl.replace(/\/+$/, "")}/functions/v1/validate-replay`,
    anonKey,
  };
}

function checksum(serialized) {
  let hash = 2166136261;
  for (let i = 0; i < serialized.length; i++) {
    hash ^= serialized.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).toUpperCase().padStart(8, "0");
}

async function postReplay({ endpoint, anonKey }, body) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
    },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => null);
  return { status: response.status, data };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function main() {
  const config = getConfig();
  const traceBody = "0.move.n~i.aim.ne~o.shoot.w0~1i.move.e~20.dash.e~2i.aim.se~2o.shoot.w0";
  const weakTraceBody = "0.shoot.w0";
  const baseRun = {
    seed: 424242,
    mode: "score_attack",
    difficulty: "normal",
    score: 12500,
    kills: 48,
    wave: 6,
    timeSec: 96,
    bestStreak: 14,
    totalDamage: 9000,
  };

  console.log(`Replay trust smoke target: ${config.endpoint}`);

  const valid = await postReplay(config, {
    ...baseRun,
    traceDigest: checksum(traceBody),
    traceLength: traceBody.split("~").length,
    traceBody,
  });
  assert(valid.status === 200, `valid trace expected HTTP 200, got ${valid.status}`);
  assert(valid.data?.ok === true, `valid trace expected ok=true, got ${JSON.stringify(valid.data)}`);
  assert(valid.data?.confidence === "trace_contract", `valid trace expected trace_contract, got ${valid.data?.confidence}`);
  console.log("PASS validate-replay accepts valid trace-backed contract");

  const weak = await postReplay(config, {
    ...baseRun,
    traceDigest: checksum(weakTraceBody),
    traceLength: weakTraceBody.split("~").length,
    traceBody: weakTraceBody,
  });
  assert(weak.status === 200, `weak trace expected HTTP 200, got ${weak.status}`);
  assert(weak.data?.ok === true, `weak trace expected ok=true, got ${JSON.stringify(weak.data)}`);
  assert(weak.data?.confidence === "heuristic", `weak trace expected heuristic confidence, got ${weak.data?.confidence}`);
  assert(weak.data?.traceEvidence?.level === "weak", `weak trace expected weak evidence, got ${JSON.stringify(weak.data?.traceEvidence)}`);
  console.log("PASS validate-replay accepts weak trace without over-labeling trace_contract");

  const malformed = await postReplay(config, {
    ...baseRun,
    traceDigest: checksum(traceBody),
    traceLength: 3,
    traceBody: traceBody.replace("shoot", "hack"),
  });
  assert(malformed.status === 200, `malformed trace expected HTTP 200, got ${malformed.status}`);
  assert(malformed.data?.ok === false, `malformed trace expected ok=false, got ${JSON.stringify(malformed.data)}`);
  assert(malformed.data?.confidence === "quarantine", `malformed trace expected quarantine, got ${malformed.data?.confidence}`);
  assert((malformed.data?.reasons || []).some((reason) => String(reason).includes("traceBody")), "malformed trace did not report traceBody reason");
  console.log("PASS validate-replay quarantines malformed trace body");

  console.log("Replay trust smoke complete: 3/3 assertions passed.");
}

main().catch((error) => {
  console.error(`Replay trust smoke failed: ${error.message}`);
  process.exitCode = 1;
});
