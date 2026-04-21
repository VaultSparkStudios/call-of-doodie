#!/usr/bin/env node
/**
 * leaderboard-audit.mjs — Leaderboard trust v2 operator review tool
 *
 * Pulls recent leaderboard rows from Supabase, runs plausibility checks,
 * and prints a ranked anomaly report. Intended for operator spot-checks.
 *
 * Usage:
 *   node scripts/leaderboard-audit.mjs [--limit 200] [--mode normal] [--top 20]
 *
 * Flags detected as anomalous:
 *   • kills/wave ratio > 120  (more kills than realistic for any wave)
 *   • score/kill ratio > 5000 (implausible score per kill)
 *   • totalDamage < kills * 20 (damage impossibly low for kill count)
 *   • totalDamage > kills * 20000 (damage impossibly high — likely overflow)
 *   • wave < 1 (submitted at wave 0)
 *   • level > wave * 3 + 5 (leveled faster than theoretically possible)
 */

import fs from "node:fs";
import path from "node:path";

// ── env loading ───────────────────────────────────────────────────────────────

function loadDotEnv(p) {
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    const k = t.slice(0, eq).trim();
    const v = t.slice(eq + 1).trim();
    if (!process.env[k]) process.env[k] = v;
  }
}
loadDotEnv(path.join(process.cwd(), ".env.local"));

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const ANON_KEY     = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !ANON_KEY) {
  console.error("Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY in .env.local");
  process.exit(1);
}

// ── CLI args ──────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const getArg = (flag, def) => {
  const i = args.indexOf(flag);
  return i !== -1 && args[i + 1] ? args[i + 1] : def;
};
const LIMIT = parseInt(getArg("--limit", "200"), 10);
const MODE  = getArg("--mode", null);
const TOP   = parseInt(getArg("--top", "20"), 10);

// ── fetch rows ────────────────────────────────────────────────────────────────

async function fetchRows() {
  let url = `${SUPABASE_URL}/rest/v1/leaderboard?select=id,name,score,kills,wave,totalDamage,level,mode,difficulty,ts&game_id=eq.cod&order=score.desc&limit=${LIMIT}`;
  if (MODE) url += `&mode=eq.${MODE}`;

  const res = await fetch(url, {
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}`, "Content-Type": "application/json" },
  });
  if (!res.ok) {
    throw new Error(`Supabase REST error ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

// ── plausibility checks ───────────────────────────────────────────────────────

function checkRow(row) {
  const flags = [];
  const { score = 0, kills = 0, wave = 0, totalDamage = 0, level = 0 } = row;

  if (wave < 1)
    flags.push("wave=0 at submission");
  if (kills > 0 && wave > 0 && kills / wave > 120)
    flags.push(`kills/wave=${(kills / wave).toFixed(0)} > 120`);
  if (kills > 0 && score / kills > 5000)
    flags.push(`score/kill=${(score / kills).toFixed(0)} > 5000`);
  if (kills > 5 && totalDamage < kills * 20)
    flags.push(`damage/kill=${(totalDamage / kills).toFixed(0)} < 20`);
  if (kills > 5 && totalDamage > kills * 20000)
    flags.push(`damage/kill=${(totalDamage / kills).toFixed(0)} > 20000`);
  if (wave > 0 && level > wave * 3 + 5)
    flags.push(`level ${level} vs wave ${wave} — levelled implausibly fast`);

  return flags;
}

// ── report ────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\nLeaderboard Audit — top ${LIMIT} rows${MODE ? ` (mode: ${MODE})` : ""}\n`);
  const rows = await fetchRows();
  console.log(`Fetched ${rows.length} rows\n`);

  const flagged = rows
    .map(row => ({ row, flags: checkRow(row) }))
    .filter(({ flags }) => flags.length > 0)
    .sort((a, b) => b.flags.length - a.flags.length);

  if (flagged.length === 0) {
    console.log("✅  No anomalies detected in top rows.");
    return;
  }

  console.log(`⚠  ${flagged.length} anomalous row(s) detected (showing top ${Math.min(TOP, flagged.length)}):\n`);
  for (const { row, flags } of flagged.slice(0, TOP)) {
    console.log(`  ${row.name || "?"} [${row.id?.slice(0, 8)}] score=${row.score} kills=${row.kills} wave=${row.wave} dmg=${row.totalDamage} mode=${row.mode}`);
    for (const f of flags) console.log(`    ⛔ ${f}`);
    console.log();
  }

  if (flagged.length > TOP) {
    console.log(`  … and ${flagged.length - TOP} more. Re-run with --top ${flagged.length} to see all.\n`);
  }
}

main().catch(err => { console.error(err.message); process.exit(1); });
