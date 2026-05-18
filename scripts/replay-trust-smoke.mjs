import fs from "node:fs";
import path from "node:path";

function loadDotEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  const contents = fs.readFileSync(filePath, "utf8");
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eqIndex = line.indexOf("=");
    if (eqIndex === -1) continue;
    const key = line.slice(0, eqIndex).trim();
    const value = line.slice(eqIndex + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

function getConfig() {
  loadDotEnv(path.join(process.cwd(), ".env.local"));
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
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
  const traceBody = "0.move.left~6.shoot.primary~c.dash.forward";
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
  });
  assert(valid.status === 200, `valid trace expected HTTP 200, got ${valid.status}`);
  assert(valid.data?.ok === true, `valid trace expected ok=true, got ${JSON.stringify(valid.data)}`);
  assert(valid.data?.confidence === "trace_contract", `valid trace expected trace_contract, got ${valid.data?.confidence}`);
  console.log("PASS validate-replay accepts valid trace-backed contract");

  const malformed = await postReplay(config, {
    ...baseRun,
    traceDigest: "not-a-digest",
    traceLength: 3,
  });
  assert(malformed.status === 200, `malformed trace expected HTTP 200, got ${malformed.status}`);
  assert(malformed.data?.ok === false, `malformed trace expected ok=false, got ${JSON.stringify(malformed.data)}`);
  assert(malformed.data?.confidence === "quarantine", `malformed trace expected quarantine, got ${malformed.data?.confidence}`);
  assert((malformed.data?.reasons || []).some((reason) => String(reason).includes("traceDigest")), "malformed trace did not report traceDigest reason");
  console.log("PASS validate-replay quarantines malformed trace contract");

  console.log("Replay trust smoke complete: 2/2 assertions passed.");
}

main().catch((error) => {
  console.error(`Replay trust smoke failed: ${error.message}`);
  process.exitCode = 1;
});
