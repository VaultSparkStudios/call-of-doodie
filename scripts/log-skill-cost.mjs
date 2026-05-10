#!/usr/bin/env node
// log-skill-cost.mjs — append a per-invocation skill-cost record.
//
// Usage (from a skill wrapper or close-out hook):
//   node scripts/log-skill-cost.mjs --skill start --tokens 4093 --model opus-4-7 [--session 57] [--ms 1240]
//
// Writes to ignis/output/agent-spend.json (rolling, last 200 entries).
// Output is intentionally lean so periodic IGNIS aggregation can roll it up
// without re-parsing transcripts. Pair with `studio-closeout` to see which
// skills are eating the most tokens per session over time.

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const OUT  = path.join(ROOT, "ignis", "output", "agent-spend.json");
const MAX  = 200;

function arg(name, fallback = null) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

const entry = {
  ts: new Date().toISOString(),
  session: Number(arg("session")) || null,
  skill: arg("skill") || "unknown",
  model: arg("model") || "unknown",
  tokens: Number(arg("tokens")) || 0,
  ms: Number(arg("ms")) || 0,
};

let log = [];
try {
  const raw = fs.readFileSync(OUT, "utf8");
  log = JSON.parse(raw);
  if (!Array.isArray(log)) log = [];
} catch { /* fresh file */ }

log.push(entry);
if (log.length > MAX) log = log.slice(-MAX);

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(log, null, 2));

const totalTokens = log.reduce((s, e) => s + (e.tokens || 0), 0);
const bySkill = {};
for (const e of log) bySkill[e.skill] = (bySkill[e.skill] || 0) + (e.tokens || 0);
const top = Object.entries(bySkill).sort((a, b) => b[1] - a[1]).slice(0, 5);

console.log(`✓ logged ${entry.skill} · ${entry.tokens} tok · ${entry.model}`);
console.log(`  rolling total (last ${log.length}): ${totalTokens.toLocaleString()} tok`);
if (top.length) {
  console.log(`  top: ${top.map(([k, v]) => `${k}=${v}`).join(", ")}`);
}
