#!/usr/bin/env node

import { spawnSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const STUDIO_OPS = path.resolve(ROOT, "..", "vaultspark-studio-ops", "scripts", "ops.mjs");

const [, , command, ...args] = process.argv;

function runNode(script, extraArgs = []) {
  const result = spawnSync(process.execPath, [script, ...extraArgs], {
    cwd: ROOT,
    stdio: "inherit",
  });
  process.exit(result.status ?? 1);
}

function printHelp() {
  console.log(`Usage: node scripts/ops.mjs <command> [args...]

Commands:
  closeout         Project-local closeout autopilot
  feedback-score   Proxy to Studio Ops feedback-score
  help             Show this help`);
}

switch (command) {
  case "closeout":
    runNode(path.join(__dirname, "closeout-autopilot.mjs"), args);
    break;
  case "feedback-score":
    runNode(STUDIO_OPS, ["feedback-score", ...args]);
    break;
  case "help":
  case undefined:
    printHelp();
    break;
  default:
    console.error(`Unknown command: ${command}`);
    printHelp();
    process.exit(1);
}
