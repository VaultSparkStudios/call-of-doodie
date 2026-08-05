#!/usr/bin/env node
// Usage: node scripts/check-canon-adoption-ledger.mjs [--json]
import fs from "node:fs";
import path from "node:path";

const file = path.join(process.cwd(), "context", "CANON_ADOPTION.md");
const text = fs.readFileSync(file, "utf8");
const rows = text.split(/\r?\n/).flatMap((line) => {
  const match = line.match(/^\|\s*(CANON-\d{3})\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|$/);
  return match ? [{ id: match[1], title: match[2].trim(), status: match[3].trim(), evidence: match[4].trim() }] : [];
});
const active = Number(text.match(/Live ACTIVE canons:\s*(\d+)/)?.[1] || 0);
const declaredPending = Number(text.match(/Pending review:\s*(\d+)/)?.[1] || 0);
const ids = new Set();
const errors = [];
for (const row of rows) {
  if (ids.has(row.id)) errors.push(`duplicate row: ${row.id}`);
  ids.add(row.id);
  if (!/^(?:adopted|pending|exempt \(.+\))$/.test(row.status)) errors.push(`${row.id}: invalid or unchecked status "${row.status}"`);
  if (!row.evidence) errors.push(`${row.id}: evidence/note is blank`);
}
const pending = rows.filter((row) => row.status === "pending").length;
if (rows.length !== active) errors.push(`row count ${rows.length} does not match active canon count ${active}`);
if (declaredPending !== pending) errors.push(`declared pending ${declaredPending} does not match rows ${pending}`);
const receipt = {
  schemaVersion: "canon-adoption-ledger-v1",
  ok: errors.length === 0,
  active,
  rows: rows.length,
  adopted: rows.filter((row) => row.status === "adopted").length,
  exempt: rows.filter((row) => row.status.startsWith("exempt ")).length,
  pending,
  evidenceComplete: rows.every((row) => Boolean(row.evidence)),
  errors,
};
if (process.argv.includes("--json")) console.log(JSON.stringify(receipt, null, 2));
else if (receipt.ok) console.log(`Canon adoption ledger: PASS · ${receipt.adopted} adopted · ${receipt.exempt} exempt · ${receipt.pending} pending`);
else console.error(`Canon adoption ledger: FAIL\n- ${errors.join("\n- ")}`);
process.exit(receipt.ok ? 0 : 1);
