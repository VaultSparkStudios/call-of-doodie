#!/usr/bin/env node

import { spawnSync } from "child_process";
import fs from "fs";
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
  action-queue     Print the current Now queue from context/TASK_BOARD.md
  blocker-preflight  Check human-blocked items against local secret readiness
  closeout         Project-local closeout autopilot
  feedback-score   Proxy to Studio Ops feedback-score
  onboard          Verify local startup tooling exists; use --repair --write to report repair state
  help             Show this help`);
}

function readText(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), "utf8");
}

function printActionQueue() {
  const board = readText("context/TASK_BOARD.md");
  const now = board.match(/## Now\s+([\s\S]*?)(?:\n## |\n$)/)?.[1] || "";
  const items = now.split(/\r?\n/).filter(line => line.trim().startsWith("- [ ]"));
  console.log("Action Queue");
  console.log("============");
  if (items.length === 0) {
    console.log("No open Now items found.");
    return;
  }
  items.forEach((item, index) => {
    console.log(`${index + 1}. ${item.replace(/^- \[ \]\s*/, "")}`);
  });
}

function blockerPreflight() {
  const board = readText("context/TASK_BOARD.md");
  const human = board.match(/## Human Action Required\s+([\s\S]*?)(?:\n## |\n$)/)?.[1] || "";
  const items = human.split(/\r?\n/).filter(line => line.trim().startsWith("- [ ]"));
  console.log("Blocker Preflight");
  console.log("=================");
  if (items.length === 0) {
    console.log("No human-action items found.");
    return;
  }
  for (const item of items) {
    const text = item.replace(/^- \[ \]\s*/, "");
    const capability = /posthog|sentry/i.test(text) ? "analytics"
      : /kofi|webhook/i.test(text) ? "kofi-webhook"
        : null;
    const status = capability ? `check with: node scripts/check-secrets.mjs --for ${capability}` : "manual/device or publication step";
    console.log(`- ${text}`);
    console.log(`  ${status}`);
  }
}

function onboard() {
  const repair = args.includes("--repair") && args.includes("--write");
  const required = [
    "scripts/render-startup-brief.mjs",
    "scripts/validate-brief-format.mjs",
    "scripts/lib/brief-blocks.mjs",
    "scripts/lib/task-board.mjs",
    "scripts/lib/cross-repo-tasks.mjs",
    "scripts/lib/ignis-insight.mjs",
    "scripts/lib/human-action-ages.mjs",
  ];
  const missing = required.filter(rel => !fs.existsSync(path.join(ROOT, rel)));
  if (missing.length === 0) {
    console.log("Onboard check passed: startup renderer and validator exist.");
    return;
  }
  console.log(`Onboard check found missing files: ${missing.join(", ")}`);
  if (repair) {
    console.log("Repair requested, but this project keeps generated tooling source-controlled. Add the missing files in-repo.");
  }
  process.exit(1);
}

switch (command) {
  case "action-queue":
    printActionQueue();
    break;
  case "blocker-preflight":
    blockerPreflight();
    break;
  case "closeout":
    runNode(path.join(__dirname, "closeout-autopilot.mjs"), args);
    break;
  case "feedback-score":
    runNode(STUDIO_OPS, ["feedback-score", ...args]);
    break;
  case "onboard":
    onboard();
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
