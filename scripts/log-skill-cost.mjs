#!/usr/bin/env node
// log-skill-cost.mjs — append a per-invocation skill-cost record.

import { recordSkillCost } from "./lib/skill-cost-ledger.mjs";

const ROOT = process.cwd();

function arg(name, fallback = null) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

const entry = recordSkillCost(ROOT, {
  sessionId: Number(arg("session")) || null,
  skill: arg("skill") || "unknown",
  model: arg("model") || "unknown",
  actualTokens: Number(arg("tokens")) || 0,
  durationSec: (Number(arg("ms")) || 0) / 1000,
  phase: arg("phase"),
  step: arg("step"),
});

console.log(`✓ logged ${entry.skill} · ${entry.actual.tokens || 0} tokens · canonical execution-budget ledger`);
