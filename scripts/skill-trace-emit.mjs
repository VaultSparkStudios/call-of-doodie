#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const CACHE_DIR = path.join(ROOT, ".cache");
const TRACE_PATH = path.join(CACHE_DIR, "skill-trace.ndjson");

const [, , event = "step", ...args] = process.argv;

function arg(name, fallback = null) {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : fallback;
}

fs.mkdirSync(CACHE_DIR, { recursive: true });

const entry = {
  schemaVersion: "1.0",
  at: new Date().toISOString(),
  event,
  skill: arg("--skill", "unknown"),
  session: arg("--session", "local"),
  status: arg("--status", event === "finish" ? "completed" : "ok"),
  step: arg("--step", null),
};

fs.appendFileSync(TRACE_PATH, JSON.stringify(entry) + "\n", "utf8");

if (!args.includes("--silent")) {
  console.log(`skill-trace ${entry.event}: ${entry.skill} (${entry.status})`);
}
