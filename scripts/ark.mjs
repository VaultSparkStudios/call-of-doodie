#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const CACHE_DIR = path.join(ROOT, ".cache");
const INBOX_PATH = path.join(CACHE_DIR, "ark-inbox.json");
const OUTBOX_PATH = path.join(CACHE_DIR, "ark-outbox.ndjson");

const [, , command, ...args] = process.argv;
const SILENT = args.includes("--silent");
const JSON_MODE = args.includes("--json");

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function parseArg(name) {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : null;
}

function drain() {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  const inbox = readJson(INBOX_PATH, { schemaVersion: "1.0", cargo: [] });
  const cargo = Array.isArray(inbox.cargo) ? inbox.cargo : [];
  const result = {
    schemaVersion: "1.0",
    status: "ok",
    drained: cargo.length,
    cargo,
  };
  fs.writeFileSync(INBOX_PATH, JSON.stringify({ schemaVersion: "1.0", cargo: [] }, null, 2) + "\n", "utf8");
  if (JSON_MODE) console.log(JSON.stringify(result, null, 2));
  else if (!SILENT) {
    console.log("Studio Ark Drain");
    console.log("================");
    console.log(`Drained cargo: ${cargo.length}`);
  }
}

function ship() {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  const cargo = {
    schemaVersion: "1.0",
    generatedAt: new Date().toISOString(),
    type: parseArg("--type") || "local-note",
    to: parseArg("--to") || "*",
    payload: parseArg("--payload") || "{}",
    status: "queued-local",
  };
  fs.appendFileSync(OUTBOX_PATH, JSON.stringify(cargo) + "\n", "utf8");
  if (JSON_MODE) console.log(JSON.stringify(cargo, null, 2));
  else console.log(`Queued local Ark cargo: ${cargo.type} -> ${cargo.to}`);
}

switch (command) {
  case "drain":
    drain();
    break;
  case "ship":
    ship();
    break;
  case "help":
  case undefined:
    console.log("Usage: node scripts/ark.mjs drain [--silent|--json]");
    console.log("       node scripts/ark.mjs ship --type <type> --to <slug|*> --payload <json>");
    break;
  default:
    console.error(`Unknown Ark command: ${command}`);
    process.exit(1);
}
