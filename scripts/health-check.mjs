import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

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
  const repoRoot = process.cwd();
  loadDotEnv(path.join(repoRoot, ".env.local"));

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    throw new Error("Missing VITE_SUPABASE_URL/SUPABASE_URL or VITE_SUPABASE_ANON_KEY/SUPABASE_ANON_KEY.");
  }

  return {
    functionsBaseUrl: `${supabaseUrl.replace(/\/+$/, "")}/functions/v1`,
    anonKey,
  };
}

async function invokeFunction({ baseUrl, anonKey, fn, body }) {
  const response = await fetch(`${baseUrl}/${fn}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
    },
    body: JSON.stringify(body),
  });

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  return { status: response.status, ok: response.ok, data };
}

function assertStatus(result, expectedStatus, label) {
  if (result.status !== expectedStatus) {
    const payload = result.data ? JSON.stringify(result.data) : "<no body>";
    throw new Error(`${label} expected HTTP ${expectedStatus}, got ${result.status}: ${payload}`);
  }
}

async function main() {
  const { functionsBaseUrl, anonKey } = getConfig();
  const clientUid = randomUUID();
  const suffix = clientUid.slice(0, 8);
  const callsign = `hc-${suffix}`;
  const seed = 424242;

  console.log(`Health check target: ${functionsBaseUrl}`);

  const missingToken = await invokeFunction({
    baseUrl: functionsBaseUrl,
    anonKey,
    fn: "submit-score",
    body: {
      clientUid,
      name: callsign,
      score: 1234,
      kills: 12,
      wave: 3,
      level: 2,
      difficulty: "normal",
      mode: "normal",
      time: "0:00",
    },
  });
  assertStatus(missingToken, 400, "submit-score without token");
  console.log("PASS submit-score rejects missing token");

  const mismatchToken = await invokeFunction({
    baseUrl: functionsBaseUrl,
    anonKey,
    fn: "issue-run-token",
    body: {
      clientUid,
      difficulty: "normal",
      mode: "boss_rush",
      seed,
    },
  });
  assertStatus(mismatchToken, 200, "issue-run-token mismatch setup");
  if (typeof mismatchToken.data?.token !== "string") {
    throw new Error("issue-run-token mismatch setup did not return a token.");
  }
  console.log("PASS issue-run-token returns token");

  const mismatchSubmit = await invokeFunction({
    baseUrl: functionsBaseUrl,
    anonKey,
    fn: "submit-score",
    body: {
      clientUid,
      runToken: mismatchToken.data.token,
      name: callsign,
      score: 1500,
      kills: 18,
      wave: 4,
      level: 3,
      bestStreak: 7,
      totalDamage: 2200,
      achievements: 1,
      difficulty: "normal",
      mode: "normal",
      starterLoadout: "standard",
      inputDevice: "mouse",
      time: "0:00",
      seed,
    },
  });
  assertStatus(mismatchSubmit, 400, "submit-score with mismatched mode");
  console.log("PASS submit-score rejects token mode mismatch");

  const validToken = await invokeFunction({
    baseUrl: functionsBaseUrl,
    anonKey,
    fn: "issue-run-token",
    body: {
      clientUid,
      difficulty: "normal",
      mode: "normal",
      seed,
    },
  });
  assertStatus(validToken, 200, "issue-run-token valid setup");
  if (typeof validToken.data?.token !== "string") {
    throw new Error("issue-run-token valid setup did not return a token.");
  }

  const validSubmitBody = {
    clientUid,
    runToken: validToken.data.token,
    name: callsign,
    score: 1875,
    kills: 24,
    wave: 5,
    level: 4,
    bestStreak: 11,
    totalDamage: 4100,
    achievements: 2,
    difficulty: "normal",
    mode: "normal",
    starterLoadout: "standard",
    inputDevice: "mouse",
    lastWords: "health-check clear",
    rank: "Noob Potato",
    time: "0:00",
    seed,
  };

  const validSubmit = await invokeFunction({
    baseUrl: functionsBaseUrl,
    anonKey,
    fn: "submit-score",
    body: validSubmitBody,
  });
  assertStatus(validSubmit, 200, "submit-score valid payload");
  console.log("PASS submit-score accepts valid payload");

  const replaySubmit = await invokeFunction({
    baseUrl: functionsBaseUrl,
    anonKey,
    fn: "submit-score",
    body: validSubmitBody,
  });
  assertStatus(replaySubmit, 409, "submit-score token replay");
  console.log("PASS submit-score rejects token replay");

  console.log("Health check complete: 5/5 assertions passed.");
}

main().catch((error) => {
  console.error(`Health check failed: ${error.message}`);
  process.exitCode = 1;
});
