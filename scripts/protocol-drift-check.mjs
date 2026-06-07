#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const JSON_MODE = process.argv.includes("--json");

const helpers = [
  { rel: "scripts/set-active-skill.mjs", level: "required", purpose: "records active Studio OS skill" },
  { rel: "scripts/write-session-lock.mjs", level: "required", purpose: "marks the active session owner" },
  { rel: "scripts/context-meter.mjs", level: "required", purpose: "keeps long sessions inside context budget" },
  { rel: "scripts/render-startup-brief.mjs", level: "required", purpose: "renders the startup brief" },
  { rel: "scripts/validate-brief-format.mjs", level: "required", purpose: "checks startup brief shape" },
  { rel: "scripts/check-secrets.mjs", level: "required", purpose: "checks capability readiness without raw secrets" },
  { rel: "scripts/ops.mjs", level: "required", purpose: "local command router and blocker preflight" },
  { rel: "scripts/credential-watch.mjs", level: "optional", purpose: "auto-detects credential transitions" },
  { rel: "scripts/ark.mjs", level: "optional", purpose: "drains and ships Studio Ark cargo" },
  { rel: "scripts/check-brief-staleness.mjs", level: "optional", purpose: "chooses full brief versus delta brief" },
  { rel: "scripts/build-skill-manifest.mjs", level: "optional", purpose: "warns on skill registry drift" },
  { rel: "scripts/skill-trace-emit.mjs", level: "optional", purpose: "emits skill telemetry breadcrumbs" },
];

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

const checks = helpers.map((helper) => ({
  ...helper,
  ok: exists(helper.rel),
  status: exists(helper.rel) ? "present" : helper.level === "required" ? "missing-required" : "missing-warning",
}));

const missingRequired = checks.filter((check) => check.level === "required" && !check.ok);
const missingOptional = checks.filter((check) => check.level === "optional" && !check.ok);
const status = missingRequired.length ? "blocked" : missingOptional.length ? "warning" : "ok";

const result = {
  schemaVersion: "1.0",
  status,
  summary: {
    total: checks.length,
    present: checks.filter((check) => check.ok).length,
    missingRequired: missingRequired.length,
    missingOptional: missingOptional.length,
  },
  checks,
  nextSteps: missingOptional.map((check) => ({
    helper: check.rel,
    action: "Keep as warning-level drift unless the local protocol starts invoking this helper as required.",
  })),
};

if (JSON_MODE) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log("Protocol Drift Check");
  console.log("====================");
  console.log(`Status: ${status}`);
  for (const check of checks) {
    const icon = check.ok ? "OK" : check.level === "required" ? "MISS" : "WARN";
    console.log(`- ${icon} ${check.rel} - ${check.purpose}`);
  }
  if (missingOptional.length) {
    console.log("");
    console.log("Warning-level drift:");
    for (const check of missingOptional) console.log(`- ${check.rel}`);
  }
}

process.exit(missingRequired.length ? 1 : 0);
