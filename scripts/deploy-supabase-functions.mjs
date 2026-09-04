#!/usr/bin/env node
/** Deploy reviewed project Edge Functions without exposing credentials. */

import { spawnSync } from "./lib/safe-spawn.mjs";
import { envForSpawn, getSecret, redact, resolveCapability } from "./lib/secrets.mjs";

const allowed = new Set(["issue-run-token", "submit-score", "validate-replay", "kofi-webhook", "sync-studio-events", "sync-game-run"]);
const argv = process.argv.slice(2);
const refIndex = argv.indexOf("--project-ref");
const overrideRef = refIndex >= 0 ? String(argv[refIndex + 1] || "") : "";
if (overrideRef && !/^[a-z]{20}$/.test(overrideRef)) { console.error("--project-ref must be a 20-letter Supabase project ref."); process.exit(2); }
const requested = argv.filter((arg, i) => !arg.startsWith("--") && !(i > 0 && argv[i - 1] === "--project-ref"));
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
// S163: production is a different project than the gateway default; pass --project-ref.
const projectRef = overrideRef || new URL(supabaseUrl).hostname.split(".")[0];
console.log(`Target project ref: ${projectRef}`);
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
