#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const BRIEF_PATH = path.join(ROOT, "docs", "STARTUP_BRIEF.md");
const JSON_MODE = process.argv.includes("--json");

function readBrief() {
  try {
    return fs.readFileSync(BRIEF_PATH, "utf8");
  } catch {
    return "";
  }
}

function parseGeneratedAt(text) {
  const raw = text.match(/<!-- generated-at:\s*([^(<]+)(?:\s*\(|\s*-->)/)?.[1]?.trim();
  if (!raw) return null;
  const date = new Date(`${raw}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

const text = readBrief();
const generatedAt = parseGeneratedAt(text);
const coherent = /<!-- brief-coherent:\s*true\s*-->/.test(text);
const ageHours = generatedAt ? (Date.now() - generatedAt.getTime()) / 36e5 : null;
const fresh = Boolean(text && generatedAt && coherent && ageHours <= 48);
const result = {
  schemaVersion: "1.0",
  status: fresh ? "fresh" : "stale",
  path: "docs/STARTUP_BRIEF.md",
  generatedAt: generatedAt ? generatedAt.toISOString().slice(0, 10) : null,
  ageHours: ageHours == null ? null : Math.max(0, Math.round(ageHours * 10) / 10),
  coherent,
  action: fresh ? "read-full-brief" : "regenerate-startup-brief",
};

if (JSON_MODE) console.log(JSON.stringify(result, null, 2));
else {
  console.log(`Startup brief status: ${result.status}`);
  console.log(`Action: ${result.action}`);
}

process.exit(fresh ? 0 : 1);
