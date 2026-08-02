#!/usr/bin/env node

// Usage: node scripts/cache-genius-list.mjs [--write|--check|--brief] [--top N]
// Maintains the source-derived repo-local Unified Genius List cache.

import fs from "node:fs";
import path from "node:path";
import {
  buildInputState,
  collectTaskWork,
  inputStateMatches,
  summarizeTaskWork,
} from "./lib/task-work.mjs";

const ROOT = process.cwd();
const CACHE = path.join(ROOT, ".cache", "genius-list.json");
const WRITE = process.argv.includes("--write");
const CHECK = process.argv.includes("--check");
const BRIEF = process.argv.includes("--brief");
const topArg = process.argv.find((arg) => arg.startsWith("--top="));
const topIndex = process.argv.indexOf("--top");
const parsedTop = Number.parseInt(topArg?.split("=")[1] || (topIndex >= 0 ? process.argv[topIndex + 1] : "12"), 10);
const top = Number.isFinite(parsedTop) && parsedTop > 0 ? parsedTop : 12;
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

if (process.argv.includes("--help")) {
  console.log("Usage: node scripts/cache-genius-list.mjs [--write|--check|--brief] [--top N]");
  process.exit(0);
}

function generate() {
  const boardPath = path.join(ROOT, "context", "TASK_BOARD.md");
  const board = fs.existsSync(boardPath) ? fs.readFileSync(boardPath, "utf8") : "";
  const allItems = collectTaskWork(board);
  const items = allItems.slice(0, top).map((item, index) => ({
    rank: index + 1,
    slug: item.slug,
    title: item.title,
    axis: item.axis,
    status: item.status,
    executable: item.executable,
    reason: item.reason,
    silLevel: item.silLevel,
    score: item.score,
    finalScore: item.score.finalScore,
    insight: item.executable
      ? "Repo-owned work is ready for implementation after live premise verification."
      : item.reason,
    evidence: item.source,
    sourceSection: item.section,
  }));
  const inputState = buildInputState(ROOT);
  return {
    schemaVersion: "2.0",
    generatedAt: new Date().toISOString(),
    repo: path.basename(ROOT).toLowerCase(),
    inputState,
    summary: summarizeTaskWork(allItems),
    items,
  };
}

function readCache() {
  try { return JSON.parse(fs.readFileSync(CACHE, "utf8")); } catch { return null; }
}

function isFresh() {
  if (!fs.existsSync(CACHE)) return false;
  if (Date.now() - fs.statSync(CACHE).mtimeMs >= MAX_AGE_MS) return false;
  const cached = readCache();
  return cached?.schemaVersion === "2.0" && inputStateMatches(cached.inputState, buildInputState(ROOT));
}

if (CHECK) process.exit(isFresh() ? 0 : 1);

let data;
if (WRITE || !isFresh()) {
  data = generate();
  fs.mkdirSync(path.dirname(CACHE), { recursive: true });
  fs.writeFileSync(CACHE, JSON.stringify(data, null, 2) + "\n");
} else {
  data = readCache();
}

if (BRIEF) {
  if (!data.items.length) console.log("No open task-board work. Unified Genius List is source-derived and exhausted.");
  for (const item of data.items.slice(0, top)) {
    const suffix = item.executable ? "" : " [" + item.status + "]";
    console.log(item.rank + ". " + item.title + suffix);
  }
} else {
  console.log(JSON.stringify(data, null, 2));
}
