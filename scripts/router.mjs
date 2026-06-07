#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

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

function section(markdown, heading) {
  return markdown.match(new RegExp(`## ${heading}\\s+([\\s\\S]*?)(?:\\n## |\\n$)`))?.[1] || "";
}

function openItems(block) {
  const seen = new Set();
  return block
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- [ ]"))
    .map((line) => line.replace(/^- \[ \]\s*/, ""))
    .filter((line) => {
      if (seen.has(line)) return false;
      seen.add(line);
      return true;
    });
}

function suggest() {
  const top = argInt("--top", 3);
  const board = readText("context/TASK_BOARD.md");
  const now = openItems(section(board, "Now"));
  const next = openItems(section(board, "Next"));
  const human = openItems(section(board, "Human Action Required"));
  const items = [
    ...now.map((title, index) => ({
      id: `now-${index + 1}`,
      lane: "now",
      title,
      reason: "Open Now item in the local task board.",
    })),
    ...next.map((title, index) => ({
      id: `next-${index + 1}`,
      lane: "next",
      title,
      reason: "Next-lane item available after the active Now queue.",
    })),
    ...human.map((title, index) => ({
      id: `founder-${index + 1}`,
      lane: "founder-unlock",
      title,
      reason: "Founder/device/dashboard gate surfaced by blocker preflight.",
    })),
  ].slice(0, top);

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
    for (const item of items) console.log(`- [${item.lane}] ${item.title}`);
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
