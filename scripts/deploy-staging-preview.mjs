#!/usr/bin/env node
// Usage: node scripts/deploy-staging-preview.mjs --branch session-130-staging
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { getSecret } from "../../vaultspark-studio-ops/scripts/lib/secrets.mjs";

const args = process.argv.slice(2);
if (args.includes("--help") || args.includes("-h")) {
  console.log("Usage: node scripts/deploy-staging-preview.mjs --branch session-<number>-staging");
  console.log("Builds locally, then deploys an isolated Cloudflare Pages preview using the Studio secrets gateway.");
  process.exit(0);
}

const branchIndex = args.indexOf("--branch");
const branch = branchIndex >= 0 ? args[branchIndex + 1] : "";
if (!/^session-\d+-staging$/.test(branch)) {
  console.error("Refusing deploy: --branch must match session-<number>-staging.");
  process.exit(2);
}

const apiToken = await getSecret("CLOUDFLARE_API_TOKEN", "cloudflare.deploy");
const accountId = await getSecret("CLOUDFLARE_ACCOUNT_ID", "cloudflare.deploy");
if (!apiToken || !accountId) {
  console.error("Cloudflare deploy capability is not READY in the Studio secrets gateway.");
  process.exit(3);
}

const windowsEntry = process.env.APPDATA
  ? path.join(process.env.APPDATA, "npm", "node_modules", "wrangler", "bin", "wrangler.js")
  : "";
const command = process.platform === "win32" ? process.execPath : "wrangler";
const commandPrefix = process.platform === "win32" ? [windowsEntry] : [];
if (process.platform === "win32" && !fs.existsSync(windowsEntry)) {
  console.error("Unable to locate the installed Wrangler JavaScript entrypoint.");
  process.exit(4);
}
const result = spawnSync(command, [...commandPrefix,
  "pages", "deploy", "dist",
  "--project-name=call-of-doodie",
  `--branch=${branch}`,
], {
  env: { ...process.env, CLOUDFLARE_API_TOKEN: apiToken, CLOUDFLARE_ACCOUNT_ID: accountId },
  stdio: "inherit",
  shell: false,
});

if (result.error) {
  console.error(`Unable to start Wrangler: ${result.error.message}`);
  process.exit(4);
}
process.exit(result.status ?? 5);
