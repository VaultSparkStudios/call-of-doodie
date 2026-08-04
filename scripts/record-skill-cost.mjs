#!/usr/bin/env node

import { spawnSync } from "./lib/safe-spawn.mjs";
import { recordSkillCost, skillCostLedgerReceipt } from "./lib/skill-cost-ledger.mjs";

const ROOT = process.cwd();
function argValue(flag, fallback = null) {
  const index = process.argv.indexOf(flag);
  if (index < 0 || index + 1 >= process.argv.length) return fallback;
  return process.argv[index + 1];
}

if (process.argv.includes("--help") || process.argv.includes("-h")) {
  console.log("Usage: node scripts/record-skill-cost.mjs --skill <name> [--phase <phase>] [--step <step>] [--session <id>] [--tokens <n>] [--model <name>] [--check] [--json]");
  process.exit(0);
}

if (process.argv.includes("--check")) {
  const receipt = skillCostLedgerReceipt(ROOT);
  if (process.argv.includes("--json")) console.log(JSON.stringify(receipt, null, 2));
  else console.log(`${receipt.ok ? "✓" : "⛔"} execution-budget ledger · ${receipt.entries} entries · ${receipt.malformedRows} malformed · ${receipt.semantics}`);
  process.exit(receipt.ok ? 0 : 1);
}

const skill = argValue("--skill", "unknown");
const phase = argValue("--phase", "step");
const step = argValue("--step", null);
const session = argValue("--session", null);
const explicitTokens = Number(argValue("--tokens", NaN));
const model = argValue("--model", null);

function meter() {
  const result = spawnSync(process.execPath, ["scripts/context-meter.mjs", "--json"], {
    cwd: ROOT,
    encoding: "utf8",
  });
  if (result.status !== 0) return null;
  try { return JSON.parse(result.stdout); } catch { return null; }
}

const snapshot = meter();
const entry = recordSkillCost(ROOT, {
  skill,
  phase,
  step,
  sessionId: session,
  model,
  actualTokens: Number.isFinite(explicitTokens) ? explicitTokens : snapshot?.usedTokens ?? null,
  status: argValue("--status", "completed"),
});
console.log(`recorded execution budget: ${entry.skill} ${entry.phase}${entry.step ? ` ${entry.step}` : ""} → .cache/skill-costs.jsonl`);
