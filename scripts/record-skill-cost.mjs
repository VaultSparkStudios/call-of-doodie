#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "./lib/safe-spawn.mjs";

const ROOT = process.cwd();
const CACHE_DIR = path.join(ROOT, ".cache");
const LEDGER = path.join(CACHE_DIR, "skill-cost-ledger.jsonl");
function argValue(flag, fallback = null) {
  const index = process.argv.indexOf(flag);
  if (index < 0 || index + 1 >= process.argv.length) return fallback;
  return process.argv[index + 1];
}

const skill = argValue("--skill", "unknown");
const phase = argValue("--phase", "step");
const step = argValue("--step", null);
const session = argValue("--session", null);

function meter() {
  const result = spawnSync(process.execPath, ["scripts/context-meter.mjs", "--json"], {
    cwd: ROOT,
    encoding: "utf8",
  });
  if (result.status !== 0) return null;
  try { return JSON.parse(result.stdout); } catch { return null; }
}

fs.mkdirSync(CACHE_DIR, { recursive: true });
const snapshot = meter();
const entry = {
  ts: new Date().toISOString(),
  skill,
  phase,
  step,
  session,
  meter: snapshot ? {
    usedTokens: snapshot.usedTokens,
    pctUsed: snapshot.pctUsed,
    recommendation: snapshot.recommendation,
  } : null,
};
fs.appendFileSync(LEDGER, `${JSON.stringify(entry)}\n`);
console.log(`recorded skill cost: ${skill} ${phase}${step ? ` ${step}` : ""}`);
