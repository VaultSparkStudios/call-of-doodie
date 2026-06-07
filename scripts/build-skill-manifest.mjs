#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const JSON_MODE = process.argv.includes("--json");
const CHECK_MODE = process.argv.includes("--check");

const localSkills = [
  "studio-start",
  "audit",
  "implement",
  "studio-closeout",
];

const helperPaths = [
  "scripts/lib/skill-profile.mjs",
  "scripts/set-active-skill.mjs",
  "scripts/lib/medium-quality-gates.mjs",
  "scripts/lib/sil-rubrics.mjs",
  "scripts/protocol-drift-check.mjs",
];

const checks = helperPaths.map((rel) => ({
  rel,
  ok: fs.existsSync(path.join(ROOT, rel)),
}));

const result = {
  schemaVersion: "1.0",
  status: checks.every((check) => check.ok) ? "ok" : "warning",
  generatedAt: new Date().toISOString(),
  skills: localSkills,
  checks,
};

if (JSON_MODE) console.log(JSON.stringify(result, null, 2));
else {
  console.log("Skill Manifest Check");
  console.log("====================");
  console.log(`Status: ${result.status}`);
  for (const check of checks) console.log(`- ${check.ok ? "OK" : "MISS"} ${check.rel}`);
}

process.exit(CHECK_MODE && result.status !== "ok" ? 1 : 0);
