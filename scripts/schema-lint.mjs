#!/usr/bin/env node
/**
 * schema-lint.mjs
 * Scans SQL migrations for patterns that silently break Edge Functions running
 * as service role (where auth.uid() is always NULL).
 *
 * Specifically flags: NOT NULL columns with DEFAULT auth.uid() on tables that
 * Edge Functions write to — a trap that causes silent HTTP 500s with no client
 * error message (the Ko-fi webhook was broken for 7 days because of this).
 */

import { readFileSync, readdirSync } from "fs";
import { join, resolve } from "path";

const ROOT       = resolve(import.meta.dirname, "..");
const MIGRATIONS = join(ROOT, "supabase", "migrations");
const FUNCTIONS  = join(ROOT, "supabase", "functions");

// ── helpers ──────────────────────────────────────────────────────────────────

function readDir(dir) {
  try { return readdirSync(dir, { withFileTypes: true }); } catch { return []; }
}

function readFile(p) {
  try { return readFileSync(p, "utf8"); } catch { return ""; }
}

// Tables referenced by Edge Functions (heuristic: look for INSERT/UPDATE/UPSERT)
function tablesUsedByFunctions() {
  const tables = new Set();
  for (const entry of readDir(FUNCTIONS)) {
    if (!entry.isDirectory()) continue;
    const fnDir = join(FUNCTIONS, entry.name);
    for (const f of readDir(fnDir)) {
      if (!f.isFile()) continue;
      const src = readFile(join(fnDir, f.name));
      const matches = src.matchAll(/\.from\(['"`](\w+)['"`]\)/g);
      for (const m of matches) tables.add(m[1]);
    }
  }
  return tables;
}

// ── scan migrations ───────────────────────────────────────────────────────────

const DANGER_PATTERNS = [
  // NOT NULL DEFAULT auth.uid() on any column
  { re: /\bNOT\s+NULL\b[^;]*DEFAULT\s+auth\.uid\(\)/i, label: "NOT NULL DEFAULT auth.uid()" },
  { re: /DEFAULT\s+auth\.uid\(\)[^;]*\bNOT\s+NULL\b/i,  label: "NOT NULL DEFAULT auth.uid() (reversed order)" },
];

const functionTables = tablesUsedByFunctions();
const migrations = readDir(MIGRATIONS)
  .filter(e => e.isFile() && e.name.endsWith(".sql"))
  .map(e => e.name)
  .sort();

let issues = 0;
const warnings = [];

for (const name of migrations) {
  const src = readFile(join(MIGRATIONS, name));
  const lines = src.split("\n");

  // Extract table context: crude but sufficient for our migrations
  let currentTable = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const tm = line.match(/CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?\s+(?:\w+\.)?(\w+)/i);
    if (tm) currentTable = tm[1];
    const am = line.match(/ALTER\s+TABLE(?:\s+ONLY)?\s+(?:\w+\.)?(\w+)/i);
    if (am) currentTable = am[1];

    for (const { re, label } of DANGER_PATTERNS) {
      if (re.test(line)) {
        const inFnTable = currentTable && functionTables.has(currentTable);
        const severity = inFnTable ? "⛔ ERROR" : "⚠  WARN";
        warnings.push({ severity, file: name, line: i + 1, table: currentTable || "?", label });
        if (inFnTable) issues++;
      }
    }
  }
}

// ── report ────────────────────────────────────────────────────────────────────

console.log(`\nSchema Lint — ${migrations.length} migrations · ${functionTables.size} function table refs\n`);

if (warnings.length === 0) {
  console.log("✅  No NOT NULL DEFAULT auth.uid() patterns found.");
} else {
  for (const w of warnings) {
    console.log(`${w.severity}  ${w.file}:${w.line}  table=${w.table}  [${w.label}]`);
  }
  console.log();
  console.log("Explanation:");
  console.log("  Edge Functions run as service role — auth.uid() returns NULL.");
  console.log("  A NOT NULL column with DEFAULT auth.uid() silently rejects every insert.");
  console.log("  Fix: ALTER COLUMN … DROP NOT NULL; or use a non-auth default.");
}

if (issues > 0) {
  console.error(`\n${issues} error(s) found on tables used by Edge Functions. Blocking.`);
  process.exit(1);
}
