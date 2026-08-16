#!/usr/bin/env node

// Usage: node scripts/refresh-community-stats-snapshot.mjs  (npm run stats:snapshot)
//
// Fetches the live community-stats endpoint and rewrites the committed
// fallback snapshot (data/community-stats-snapshot.json). The snapshot feeds
// the /stats/ page fallback numbers and the generated stats-surface.json, so
// baked values age visibly ("as of <date>") instead of silently going stale.
// Network stays OUT of the normal build — run this explicitly, review the
// diff, commit, then `npm run build` regenerates the public surfaces.

import fs from "node:fs";
import path from "node:path";

const ENDPOINT = process.env.COD_STATS_ENDPOINT || "https://callofdoodie.wtf/api/community-stats";
const OUT = path.resolve("data", "community-stats-snapshot.json");

const response = await fetch(ENDPOINT, { headers: { accept: "application/json" } });
if (!response.ok) {
  console.error(`stats snapshot refresh failed: ${ENDPOINT} → ${response.status}`);
  process.exit(1);
}
const body = await response.json();
const stats = body?.stats;
if (!stats || typeof stats.runs !== "number") {
  console.error("stats snapshot refresh failed: unexpected payload shape", JSON.stringify(body).slice(0, 300));
  process.exit(1);
}

const num = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0);
const snapshot = {
  schemaVersion: "community-stats-snapshot-v1",
  snapshotDate: new Date().toISOString().slice(0, 10),
  source: "Production get_cod_community_stats verification receipt",
  stats: {
    runs: num(stats.runs),
    runners: num(stats.runners),
    hours: num(stats.hours),
    kills: num(stats.kills),
    score: num(stats.score),
    damage: num(stats.damage),
    bosses: num(stats.bosses),
    excludedHealthChecks: num(stats.excludedHealthChecks ?? stats.excluded_health_checks),
  },
  coverage: {
    richRuns: num(stats.coverage?.richRuns),
    legacyRuns: num(stats.coverage?.legacyRuns),
    oldestSupportedAt: stats.coverage?.oldestSupportedAt || null,
  },
};

fs.writeFileSync(OUT, `${JSON.stringify(snapshot, null, 2)}\n`);
console.log(`Wrote ${path.relative(process.cwd(), OUT)} (runs ${snapshot.stats.runs}, snapshot ${snapshot.snapshotDate})`);
console.log("Now run: npm run build  (regenerates /stats/ fallback + stats-surface.json), review, commit.");
