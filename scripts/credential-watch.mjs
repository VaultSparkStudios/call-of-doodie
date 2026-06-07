#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = process.cwd();
const SILENT = process.argv.includes("--silent");
const CACHE_DIR = path.join(ROOT, ".cache");
const SNAPSHOT_PATH = path.join(CACHE_DIR, "credential-watch.json");

function runAudit() {
  const result = spawnSync(process.execPath, ["scripts/check-secrets.mjs", "--audit"], {
    cwd: ROOT,
    encoding: "utf8",
  });
  return {
    ok: result.status === 0,
    status: result.status ?? 1,
    stdout: result.stdout || "",
    stderr: result.stderr || "",
  };
}

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function normalize(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

fs.mkdirSync(CACHE_DIR, { recursive: true });

const previous = readJson(SNAPSHOT_PATH, { lines: [] });
const audit = runAudit();
const lines = normalize(audit.stdout);
const changed = JSON.stringify(previous.lines || []) !== JSON.stringify(lines);
const snapshot = {
  schemaVersion: "1.0",
  generatedAt: new Date().toISOString(),
  status: audit.ok ? "ok" : "warning",
  changed,
  lines,
};

fs.writeFileSync(SNAPSHOT_PATH, JSON.stringify(snapshot, null, 2) + "\n", "utf8");

if (!SILENT) {
  console.log("Credential Watch");
  console.log("================");
  console.log(`Status: ${snapshot.status}`);
  console.log(`Changed since last snapshot: ${changed ? "yes" : "no"}`);
  if (lines.length) {
    for (const line of lines.slice(0, 12)) console.log(`- ${line}`);
  } else {
    console.log("- No local capability declarations found.");
  }
}

process.exit(0);
