#!/usr/bin/env node
// Builds a production-uploadable bundle with public Supabase configuration
// sourced through the Studio secrets gateway. No credential value is logged.

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "./lib/safe-spawn.mjs";
import { getSecret } from "./lib/secrets.mjs";

const supabaseUrl = getSecret("SUPABASE_URL", "supabase.admin");
const supabaseAnonKey = getSecret("SUPABASE_ANON_KEY", "supabase.admin");
if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Deployable build requires Supabase URL and anonymous key through the secrets gateway.");
  process.exit(1);
}

const windowsNpmCli = path.join(path.dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js");
const command = process.platform === "win32" ? process.execPath : "npm";
const commandArgs = process.platform === "win32"
  ? [windowsNpmCli, "run", "build"]
  : ["run", "build"];
if (process.platform === "win32" && !fs.existsSync(windowsNpmCli)) {
  console.error("Unable to locate the npm CLI used by the current Node.js runtime.");
  process.exit(1);
}
const result = spawnSync(command, commandArgs, {
  cwd: process.cwd(),
  env: {
    ...process.env,
    VITE_SUPABASE_URL: supabaseUrl,
    VITE_SUPABASE_ANON_KEY: supabaseAnonKey,
  },
  stdio: "inherit",
  shell: false,
  windowsHide: true,
});
if (result.error) {
  console.error(`Unable to start deployable build: ${result.error.message}`);
  process.exit(1);
}
if (result.status !== 0) {
  console.error(`Deployable build failed with status ${result.status ?? "unknown"}.`);
  process.exit(result.status || 1);
}

const manifest = {
  schemaVersion: "deployable-build-v1",
  builtAt: new Date().toISOString(),
  communityStats: {
    configured: true,
    aggregate: "get_cod_community_stats",
    refreshSeconds: 15,
    historicalScope: "all_available_server_history",
  },
};
fs.writeFileSync(
  path.join(process.cwd(), "dist", "deploy-manifest.json"),
  JSON.stringify(manifest, null, 2) + "\n",
);
console.log("Deployable build: PASS · Community Stats runtime configured");
