#!/usr/bin/env node
/**
 * Reversible leaderboard trust court.
 *
 * Default: inspect without mutation. --strict exits 2 on an actionable row.
 * --quarantine hides every high-confidence anomaly through Row Level Security.
 * --restore <id> reverses one operator decision. Every mutation writes a
 * value-free receipt to audits/leaderboard-trust.ndjson.
 */

import fs from "node:fs";
import path from "node:path";
import { getSecret, redact } from "./lib/secrets.mjs";
import { assessLeaderboardRow, buildTrustReceipt } from "./lib/leaderboard-trust.mjs";

const args = process.argv.slice(2);
const has = (flag) => args.includes(flag);
const value = (flag, fallback = null) => {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};

const limit = Math.min(1000, Math.max(1, Number.parseInt(value("--limit", "200"), 10) || 200));
const top = Math.min(limit, Math.max(1, Number.parseInt(value("--top", "20"), 10) || 20));
const mode = value("--mode");
const restoreId = value("--restore");
const json = has("--json");
const strict = has("--strict");
const quarantine = has("--quarantine");

const supabaseUrl = getSecret("SUPABASE_URL", "supabase.admin");
const serviceRoleKey = getSecret("SUPABASE_SERVICE_ROLE_KEY", "supabase.admin");
if (!supabaseUrl || !serviceRoleKey) {
  console.error("Supabase admin capability is unavailable through the secrets gateway.");
  process.exit(1);
}

const headers = {
  ["apikey"]: serviceRoleKey,
  Authorization: `Bearer ${serviceRoleKey}`,
  "Content-Type": "application/json",
  Prefer: "return=representation",
};

async function request(relativeUrl, options = {}) {
  const response = await fetch(`${supabaseUrl}/rest/v1/${relativeUrl}`, { ...options, headers: { ...headers, ...(options.headers || {}) } });
  if (!response.ok) throw new Error(`Supabase REST error ${response.status}: ${redact(await response.text())}`);
  if (response.status === 204) return null;
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

async function fetchRows({ includeQuarantined = false, id = null } = {}) {
  let query = "leaderboard?select=id,name,score,kills,wave,totalDamage,level,mode,difficulty,ts,quarantined,quarantine_reason,quarantined_at&game_id=eq.cod";
  if (id) query += `&id=eq.${encodeURIComponent(id)}`;
  if (!includeQuarantined) query += "&quarantined=eq.false";
  if (mode) query += `&mode=eq.${encodeURIComponent(mode)}`;
  query += `&order=score.desc&limit=${limit}`;
  return request(query);
}

function appendReceipt(receipt) {
  const receiptPath = path.join(process.cwd(), "audits", "leaderboard-trust.ndjson");
  fs.mkdirSync(path.dirname(receiptPath), { recursive: true });
  fs.appendFileSync(receiptPath, `${JSON.stringify(receipt)}\n`, "utf8");
}

async function patchRow(id, patch) {
  return request(`leaderboard?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

async function restore() {
  const [row] = await fetchRows({ includeQuarantined: true, id: restoreId });
  if (!row) throw new Error(`Leaderboard row not found: ${restoreId}`);
  const assessment = assessLeaderboardRow(row);
  await patchRow(row.id, { quarantined: false, quarantine_reason: null, quarantined_at: null });
  const receipt = buildTrustReceipt({ action: "restore", row, assessment });
  appendReceipt(receipt);
  console.log(json ? JSON.stringify({ ok: true, receipt }, null, 2) : `Restored leaderboard row ${row.id}.`);
}

async function audit() {
  const rows = await fetchRows();
  const flagged = rows
    .map((row) => ({ row, assessment: assessLeaderboardRow(row) }))
    .filter(({ assessment }) => assessment.severity !== "clear")
    .sort((a, b) => b.assessment.flags.length - a.assessment.flags.length);

  const receipts = [];
  if (quarantine) {
    for (const { row, assessment } of flagged.filter((entry) => entry.assessment.severity === "high")) {
      await patchRow(row.id, {
        quarantined: true,
        quarantine_reason: assessment.reason,
        quarantined_at: new Date().toISOString(),
      });
      const receipt = buildTrustReceipt({ action: "quarantine", row, assessment });
      appendReceipt(receipt);
      receipts.push(receipt);
    }
  }

  const report = {
    schemaVersion: "leaderboard-trust-v1",
    ok: flagged.length === 0 || (quarantine && receipts.length === flagged.filter((entry) => entry.assessment.severity === "high").length),
    fetched: rows.length,
    flagged: flagged.length,
    quarantined: receipts.length,
    rows: flagged.slice(0, top).map(({ row, assessment }) => ({
      id: row.id,
      callsign: String(row.name || "?").slice(0, 24),
      score: row.score,
      kills: row.kills,
      wave: row.wave,
      level: row.level,
      severity: assessment.severity,
      flags: assessment.flags,
    })),
    receipts,
  };

  if (json) console.log(JSON.stringify(report, null, 2));
  else {
    console.log(`Leaderboard trust court: ${report.fetched} inspected · ${report.flagged} actionable · ${report.quarantined} quarantined`);
    for (const entry of report.rows) {
      console.log(`  ${entry.callsign} [${String(entry.id).slice(0, 8)}] score=${entry.score} kills=${entry.kills} wave=${entry.wave} level=${entry.level}`);
      for (const flag of entry.flags) console.log(`    ${flag.severity === "high" ? "⛔" : "⚠"} ${flag.code}: ${flag.detail}`);
    }
  }

  if (strict && flagged.length > 0 && !quarantine) process.exitCode = 2;
}

(restoreId ? restore() : audit()).catch((error) => {
  console.error(redact(error instanceof Error ? error.message : String(error)));
  process.exit(1);
});
