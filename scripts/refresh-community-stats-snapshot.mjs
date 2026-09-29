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
if (!stats || typeof stats.runs !== "number" || stats.scope !== "all_available_server_history" || !stats.coverage) {
  console.error("stats snapshot refresh failed: unexpected payload shape", JSON.stringify(body).slice(0, 300));
  process.exit(1);
}

const num = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0);
const optionalNum = (value) => value == null || !Number.isFinite(Number(value)) ? null : Number(value);
const validDate = (value) => value && Number.isFinite(Date.parse(value)) ? new Date(value).toISOString() : null;
const countMap = (value) => Object.fromEntries(Object.entries(value && typeof value === "object" ? value : {})
  .filter(([key, count]) => /^[a-z0-9_]{1,40}$/.test(key) && count != null && Number.isFinite(Number(count)))
  .map(([key, count]) => [key, Math.max(0, Math.floor(num(count)))]));
const richRuns = num(stats.coverage.richRuns);
const legacyRuns = num(stats.coverage.legacyRuns);
if (richRuns + legacyRuns !== stats.runs) {
  console.error("stats snapshot refresh failed: coverage does not partition supported runs");
  process.exit(1);
}
const snapshot = {
  schemaVersion: "community-stats-snapshot-v1",
  snapshotDate: new Date().toISOString().slice(0, 10),
  source: "Production get_cod_community_stats verification receipt",
  checkedAt: validDate(body.checkedAt),
  lastCompletedAt: validDate(stats.updatedAt),
  stats: {
    runs: num(stats.runs),
    runners: num(stats.runners),
    hours: num(stats.hours),
    kills: num(stats.kills),
    score: num(stats.score),
    damage: num(stats.damage),
    bosses: num(stats.bosses),
    excludedHealthChecks: optionalNum(stats.excludedHealthChecks ?? stats.excluded_health_checks),
    runs24h: optionalNum(stats.runs24h ?? stats.runs_24h),
    kills24h: optionalNum(stats.kills24h ?? stats.kills_24h),
    shots: optionalNum(stats.shots),
    hits: optionalNum(stats.hits),
    modes: countMap(stats.modes),
    feedback: countMap(stats.feedback),
  },
  coverage: {
    richRuns,
    legacyRuns,
    oldestSupportedAt: validDate(stats.coverage.oldestSupportedAt),
    richCoverageStartsAt: validDate(stats.coverage.richCoverageStartsAt),
    durationRuns: optionalNum(stats.coverage.durationRuns),
    damageRuns: optionalNum(stats.coverage.damageRuns),
    accuracyRuns: optionalNum(stats.coverage.accuracyRuns),
    feedbackRuns: optionalNum(stats.coverage.feedbackRuns),
  },
};

fs.writeFileSync(OUT, `${JSON.stringify(snapshot, null, 2)}\n`);
console.log(`Wrote ${path.relative(process.cwd(), OUT)} (runs ${snapshot.stats.runs}, snapshot ${snapshot.snapshotDate})`);
console.log("Now run: npm run build  (regenerates /stats/ fallback + stats-surface.json), review, commit.");
