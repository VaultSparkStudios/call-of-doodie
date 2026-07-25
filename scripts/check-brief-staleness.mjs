#!/usr/bin/env node

// Usage: node scripts/check-brief-staleness.mjs [--json]
// Read-only freshness/coherence check; stale briefs intentionally exit nonzero.

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const BRIEF_PATH = path.join(ROOT, "docs", "STARTUP_BRIEF.md");
const LOCK_PATH = path.join(ROOT, "context", ".session-lock");
const JSON_MODE = process.argv.includes("--json");

if (process.argv.includes("--help")) {
  console.log("Usage: node scripts/check-brief-staleness.mjs [--json]");
  process.exit(0);
}

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

function modifiedAt(filePath) {
  try {
    return fs.statSync(filePath).mtimeMs;
  } catch {
    return null;
  }
}

const text = readBrief();
const generatedAt = parseGeneratedAt(text);
const coherent = /<!-- brief-coherent:\s*true\s*-->/.test(text);
const ageHours = generatedAt ? (Date.now() - generatedAt.getTime()) / 36e5 : null;
const briefModifiedAt = modifiedAt(BRIEF_PATH);
const lockModifiedAt = modifiedAt(LOCK_PATH);
const activeSessionNewer = lockModifiedAt != null
  && (briefModifiedAt == null || lockModifiedAt > briefModifiedAt + 1);
const reasons = [];
if (!text) reasons.push("brief-missing");
if (text && !generatedAt) reasons.push("generated-at-invalid");
if (text && !coherent) reasons.push("brief-incoherent");
if (generatedAt && ageHours > 48) reasons.push("brief-aged-out");
if (activeSessionNewer) reasons.push("active-session-newer-than-brief");
const fresh = reasons.length === 0;
const result = {
  schemaVersion: "1.1",
  status: fresh ? "fresh" : "stale",
  path: "docs/STARTUP_BRIEF.md",
  generatedAt: generatedAt ? generatedAt.toISOString().slice(0, 10) : null,
  ageHours: ageHours == null ? null : Math.max(0, Math.round(ageHours * 10) / 10),
  coherent,
  briefModifiedAt: briefModifiedAt == null ? null : new Date(briefModifiedAt).toISOString(),
  lockModifiedAt: lockModifiedAt == null ? null : new Date(lockModifiedAt).toISOString(),
  reasons,
  action: fresh ? "read-full-brief" : "regenerate-startup-brief",
};

if (JSON_MODE) console.log(JSON.stringify(result, null, 2));
else {
  console.log(`Startup brief status: ${result.status}`);
  console.log(`Action: ${result.action}`);
  if (reasons.length > 0) console.log(`Reason: ${reasons.join(", ")}`);
}

process.exit(fresh ? 0 : 1);
