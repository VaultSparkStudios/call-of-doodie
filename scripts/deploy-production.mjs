#!/usr/bin/env node
// Deploys an already-built dist/ directory to the production Cloudflare Pages branch.
import { spawnSync } from "./lib/safe-spawn.mjs";
import fs from "node:fs";
import path from "node:path";
import { withPagesDeployEnv } from "../../vaultspark-studio-ops/scripts/lib/cf-deploy.mjs";

const listOnly = process.argv.includes("--list");
const distIndex = path.resolve("dist", "index.html");
if (!listOnly && !fs.existsSync(distIndex)) {
  console.error("Refusing production deploy: dist/index.html is missing. Run npm run build first.");
  process.exit(2);
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

const wranglerArgs = listOnly
  ? ["pages", "deployment", "list", "--project-name=call-of-doodie"]
  : ["pages", "deploy", "dist", "--project-name=call-of-doodie", "--branch=main", "--commit-dirty=true"];

const result = await withPagesDeployEnv("call-of-doodie-production", (deployEnv) =>
  spawnSync(command, [...commandPrefix, ...wranglerArgs], {
    env: { ...process.env, ...deployEnv },
    stdio: "inherit",
    shell: false,
    windowsHide: true,
  }));

if (result.error) {
  console.error(`Unable to start Wrangler: ${result.error.message}`);
  process.exit(4);
}
process.exit(result.status ?? 5);
