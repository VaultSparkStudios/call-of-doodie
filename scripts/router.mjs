#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { collectTaskWork } from "./lib/task-work.mjs";

const ROOT = process.cwd();
const [, , command, ...args] = process.argv;
const JSON_MODE = args.includes("--json");

function readText(relPath) {
  try {
    return fs.readFileSync(path.join(ROOT, relPath), "utf8");
  } catch {
    return "";
  }
}

function argInt(name, fallback) {
  const i = args.indexOf(name);
  const n = i >= 0 ? Number.parseInt(args[i + 1], 10) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

function suggest() {
  const top = argInt("--top", 3);
  const board = readText("context/TASK_BOARD.md");
  const items = collectTaskWork(board, ["Now", "Next", "Human Action Required"])
    .slice(0, top)
    .map((item, index) => ({
      id: item.status + "-" + (index + 1),
      lane: item.executable ? item.section.toLowerCase() : item.status,
      title: item.title,
      status: item.status,
      executable: item.executable,
      finalScore: item.score.finalScore,
      reason: item.reason,
    }));

  const result = {
    schemaVersion: "1.0",
    status: "ok",
    generatedAt: new Date().toISOString(),
    items,
  };

  if (JSON_MODE) console.log(JSON.stringify(result, null, 2));
  else {
    console.log("Router Suggestions");
    console.log("==================");
    if (!items.length) console.log("No open local task-board items found.");
    for (const item of items) console.log("- [" + item.lane + "] " + item.title + " - " + item.reason);
  }
}

switch (command) {
  case "suggest":
    suggest();
    break;
  case "help":
  case undefined:
    console.log("Usage: node scripts/router.mjs suggest --top <n> [--json]");
    break;
  default:
    console.error(`Unknown router command: ${command}`);
    process.exit(1);
}
