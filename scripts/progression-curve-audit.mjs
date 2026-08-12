#!/usr/bin/env node

// Usage: node scripts/progression-curve-audit.mjs [--kills N] [--points N] [--weapon-kills CSV]
// Emits a deterministic, read-only progression runway receipt as JSON.

import { buildProgressionRunway } from "../src/utils/progressionCurve.js";

if (process.argv.includes("--help")) {
  console.log("Usage: node scripts/progression-curve-audit.mjs [--kills N] [--points N] [--weapon-kills CSV]");
  process.exit(0);
}

function numberArg(name, fallback = 0) {
  const index = process.argv.indexOf(name);
  const value = index >= 0 ? Number(process.argv[index + 1]) : fallback;
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : fallback;
}

function count(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.floor(number)) : 0;
}

const receipt = buildProgressionRunway({
  totalKills: numberArg("--kills"),
  careerPoints: numberArg("--points"),
  weaponKills: (() => {
    const index = process.argv.indexOf("--weapon-kills");
    return index >= 0 ? String(process.argv[index + 1] || "").split(",").map(count) : null;
  })(),
});

process.stdout.write(`${JSON.stringify(receipt, null, 2)}\n`);
