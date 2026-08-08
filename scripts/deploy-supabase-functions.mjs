#!/usr/bin/env node
/** Deploy reviewed project Edge Functions without exposing credentials. */

import { spawnSync } from "./lib/safe-spawn.mjs";
import { envForSpawn, getSecret, redact, resolveCapability } from "./lib/secrets.mjs";

const allowed = new Set(["issue-run-token", "submit-score", "validate-replay", "kofi-webhook", "sync-studio-events", "sync-game-run"]);
const requested = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));
const functions = requested.length ? requested : ["issue-run-token", "submit-score"];
if (functions.some((name) => !allowed.has(name))) {
  console.error(`Allowed functions: ${[...allowed].join(", ")}`);
  process.exit(2);
}

const management = resolveCapability("supabase.management");
const admin = resolveCapability("supabase.admin");
if (!management.ok || !admin.ok) {
  console.error("Supabase management/admin capability is unavailable through the secrets gateway.");
  process.exit(1);
}

const supabaseUrl = getSecret("SUPABASE_URL", "supabase.admin");
const projectRef = new URL(supabaseUrl).hostname.split(".")[0];
const env = envForSpawn("supabase.management", ["SUPABASE_ACCESS_TOKEN"]);
for (const functionName of functions) {
  const result = spawnSync("supabase", ["functions", "deploy", functionName, "--project-ref", projectRef, "--no-verify-jwt"], {
    cwd: process.cwd(),
    env,
    encoding: "utf8",
    timeout: 180_000,
  });
  if (result.stdout) process.stdout.write(redact(result.stdout));
  if (result.stderr) process.stderr.write(redact(result.stderr));
  if (result.status !== 0) process.exit(result.status || 1);
}
console.log(`Deployed ${functions.join(", ")} through the secrets gateway.`);
