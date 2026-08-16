#!/usr/bin/env node

// Usage: node scripts/generate-public-pages.mjs [--check]
// Generates the public companion shell and every route-derived discovery surface.

import fs from "node:fs";
import path from "node:path";
import {
  buildAgentsManifest,
  buildFooterManifest,
  buildLlmsText,
  buildSitemapXml,
  buildRouteContractProof,
  escapeHtml,
  getGeneratedCompanionPages,
  getPublicRouteRegistry,
  renderFooterLinks,
  renderHeaderNav,
  PARODY_DISCLAIMER,
  PUBLIC_CONTENT_VERSION_DATE,
} from "./lib/public-route-registry.mjs";
import { copyrightYear } from "./lib/build-date.mjs";
import { buildPublicGameplayContract } from "./lib/public-gameplay-contract.mjs";
import { ENEMY_ATLAS_CONTRACT } from "../src/utils/enemyAtlasContract.js";

const root = path.resolve("public");
const checkOnly = process.argv.includes("--check");
if (process.argv.includes("--help")) {
  console.log("Usage: node scripts/generate-public-pages.mjs [--check]");
  process.exit(0);
}

const expected = new Map();

function queue(relativePath, content) {
  expected.set(path.join(root, relativePath), content.endsWith("\n") ? content : `${content}\n`);
}

const EXPLORE_POOL = [
  ["modes", "Modes"],
  ["arsenal", "Arsenal"],
  ["accessibility", "Accessibility"],
  ["support", "Support"],
  ["stats", "Stats"],
];

function buildExploreLinks(page) {
  return EXPLORE_POOL
    .filter(([id]) => id !== page.id)
    .slice(0, 4)
    .map(([id, label]) => `<a href="../${id}/">${escapeHtml(label)}</a>`)
    .join("");
}

function card([title, body]) {
  return `<section class="card"><h2>${escapeHtml(title)}</h2><p>${escapeHtml(body)}</p></section>`;
}

function renderArt() {
  // S155: atlas filenames come from the runtime contract (a version bump in
  // enemyAtlasContract.js used to leave this page pointing at a dead file).
  const atlasImg = (atlas, alt) => `<img src="../${atlas.runtimePath.replace(/^public\//, "")}" alt="${alt}">`;
  return `
    <figure class="roster-art card">
      ${atlasImg(ENEMY_ATLAS_CONTRACT.core, "Core enemy roster atlas")}
      ${atlasImg(ENEMY_ATLAS_CONTRACT.specialists, "Specialist enemy roster atlas")}
      ${atlasImg(ENEMY_ATLAS_CONTRACT.bosses, "Signature encounter roster atlas")}
      <figcaption>Production character art shown at high resolution; in-game silhouettes are optimized for combat scale. Gameplay classifications come from the live contract below.</figcaption>
    </figure>`;
}

// S155: fallback numbers come from the committed snapshot
// (data/community-stats-snapshot.json, refreshed via `npm run stats:snapshot`)
// and carry their snapshot date, so a stale fallback reads as dated history
// instead of masquerading as live truth.
const statsSnapshot = JSON.parse(fs.readFileSync(path.resolve("data", "community-stats-snapshot.json"), "utf8"));
const fmtInt = (value) => Number(value || 0).toLocaleString("en-US");

function renderLiveCommunityStats(page) {
  if (page.id !== "stats") return "";
  const snap = statsSnapshot.stats;
  const metrics = [
    ["runs", "Runs", fmtInt(snap.runs)],
    ["runners", "Runners", fmtInt(snap.runners)],
    ["hours", "Hours played", `${snap.hours} h`],
    ["kills", "Enemies terminated", fmtInt(snap.kills)],
    ["score", "Total score", fmtInt(snap.score)],
    ["damage", "Damage dealt", fmtInt(snap.damage)],
    ["accuracy", "Measured accuracy", "—"],
    ["bosses", "Bosses terminated", fmtInt(snap.bosses)],
  ];
  return `
      <section class="live-stats" aria-labelledby="live-community-heading">
        <div class="live-stats-head">
          <div><p class="eyebrow">Always-current aggregate</p><h2 id="live-community-heading">All supported history</h2></div>
          <span class="status" data-community-status data-state="connecting" aria-live="polite">Connecting to live totals…</span>
        </div>
        <div class="live-stat-grid">${metrics.map(([id, label, fallback]) => `<div class="live-stat"><span>${escapeHtml(label)}</span><strong data-community-stat="${id}">${escapeHtml(fallback)}</strong><svg class="live-spark" data-community-spark="${id}" viewBox="0 0 64 18" preserveAspectRatio="none" aria-hidden="true"></svg></div>`).join("")}</div>
        <div class="live-records" data-community-records hidden>
          <strong>🏆 Community records</strong>
          <span>Best wave <b data-community-record="bestWave">—</b></span>
          <span>Best score <b data-community-record="bestScore">—</b></span>
          <span>Best kills <b data-community-record="bestKills">—</b></span>
          <span>Last 24h: <b data-community-record="runs24h">—</b> runs · <b data-community-record="kills24h">—</b> kills</span>
        </div>
        <div class="live-feedback" data-community-feedback hidden>
          <strong>Field reports</strong>
          <div class="live-feedback-bar" aria-hidden="true"><i data-feedback-seg="too_easy"></i><i data-feedback-seg="dialed_in"></i><i data-feedback-seg="brutal"></i></div>
          <span data-feedback-legend></span>
        </div>
        <p class="live-coverage" data-community-coverage>As of ${escapeHtml(statsSnapshot.snapshotDate)}: all ${fmtInt(snap.runs)} supported runs · ${fmtInt(statsSnapshot.coverage.richRuns)} full-detail · ${fmtInt(statsSnapshot.coverage.legacyRuns)} legacy${statsSnapshot.coverage.oldestSupportedAt ? ` · oldest supported record ${new Date(statsSnapshot.coverage.oldestSupportedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}` : ""}. Live totals replace this snapshot when connected.</p>
        <p class="live-caveat">This includes every recoverable server record. Runs never submitted before telemetry existed cannot be reconstructed; unavailable legacy fields remain unknown instead of being estimated.</p>
      </section>`;
}

// S155 — the /leaderboard/ page previously explained the leaderboard without
// showing a single score (a dead end for the visitor's intent). It now
// renders a live top-10 from /api/top-scores with a graceful offline state.
function renderLiveLeaderboard(page) {
  if (page.id !== "leaderboard") return "";
  return `
      <section class="live-stats" aria-labelledby="live-board-heading">
        <div class="live-stats-head">
          <div><p class="eyebrow">Verified global board</p><h2 id="live-board-heading">Top 10 right now</h2></div>
          <span class="status" data-top-scores-status data-state="connecting" aria-live="polite">Connecting to the live board…</span>
        </div>
        <div style="overflow-x:auto">
          <table data-top-scores hidden style="width:100%;border-collapse:collapse;font-variant-numeric:tabular-nums">
            <thead><tr style="text-align:left"><th>#</th><th>Callsign</th><th>Score</th><th>Wave</th><th>Kills</th><th>Mode</th></tr></thead>
            <tbody></tbody>
          </table>
        </div>
        <p class="live-caveat">Scores carry trust checks; runs with modified gameplay settings are badged in game. Play as a guest and submit with any callsign.</p>
      </section>`;
}

function renderPage(page) {
  const art = page.art ? renderArt() : "";
  const liveStats = renderLiveCommunityStats(page) + renderLiveLeaderboard(page);
  const liveStatsScript = page.id === "stats"
    ? '<script src="../community-stats-live.js" defer></script>'
    : page.id === "leaderboard"
      ? '<script src="../leaderboard-live.js" defer></script>'
      : "";
  const cta = page.cta
    ? `<a class="primary-cta" href="${escapeHtml(page.cta[1])}">${escapeHtml(page.cta[0])} <span aria-hidden="true">→</span></a>`
    : "";
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#090a0d">
  <meta name="description" content="${escapeHtml(page.description)}">
  <link rel="canonical" href="${page.canonicalUrl}">
  <link rel="icon" href="../favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="../legal.css">
  <script src="../theme.js" defer></script>
${liveStatsScript ? `  ${liveStatsScript}\n` : ""}  <title>${escapeHtml(page.title)} | Call of Doodie</title>
</head>
<body>
  <div class="shell">
    <header class="site-header"><a class="brand" href="../">CALL OF <span>DOODIE</span></a><nav aria-label="Primary navigation">
${renderHeaderNav("../")}
    </nav></header>
    <main>
      <p class="eyebrow">${escapeHtml(page.eyebrow)}</p>
      <h1>${escapeHtml(page.title)}</h1>
      <p class="lede">${escapeHtml(page.lede)}</p>
      ${cta}${liveStats}${art}
      <div class="card-grid">${page.sections.map(card).join("")}</div>
      <aside class="next-links card" aria-label="Explore more"><strong>Keep exploring</strong>${buildExploreLinks(page)}</aside>
    </main>
    <footer><div class="footer-links">${renderFooterLinks("../")}</div><p class="parody-note">${escapeHtml(PARODY_DISCLAIMER)}</p><div>© ${copyrightYear()} <a href="https://vaultsparkstudios.com/">VaultSpark Studios LLC</a>. All rights reserved.</div></footer>
  </div>
</body>
</html>`;
}

for (const page of getGeneratedCompanionPages()) {
  queue(path.join(page.id, "index.html"), renderPage(page));
}

const sharedNav = `<nav aria-label="Primary navigation">\n${renderHeaderNav("../")}\n      </nav>`;
const sharedFooter = `<div class="footer-links">${renderFooterLinks("../")}</div>`;
for (const route of getPublicRouteRegistry().filter((entry) => !entry.generated && entry.path !== "/")) {
  const fullPath = path.resolve(route.filePath);
  if (!fs.existsSync(fullPath)) continue;
  const current = fs.readFileSync(fullPath, "utf8");
  const next = current
    .replace(/<nav aria-label="Primary navigation">[\s\S]*?<\/nav>/, sharedNav)
    .replace(/<div class="footer-links">[\s\S]*?<\/div>/, sharedFooter);
  queue(path.relative(root, fullPath), next);
}

queue("footer-manifest.json", JSON.stringify(buildFooterManifest(), null, 2));
queue("sitemap.xml", buildSitemapXml());
queue("agents.json", JSON.stringify(buildAgentsManifest(), null, 2));
queue("route-contract.json", JSON.stringify(buildRouteContractProof(), null, 2));
queue(path.join(".well-known", "llms.txt"), buildLlmsText());
const liveGameplay = buildPublicGameplayContract();
queue("field-manual.json", JSON.stringify({
  schemaVersion: "field-manual-truth-v1",
  effectiveDate: PUBLIC_CONTENT_VERSION_DATE,
  canonicalUrl: "https://callofdoodie.wtf/field-manual.json",
  claims: {
    price: { value: "free-to-play", source: "/terms/" },
    progress: { value: "browser-local-no-cloud-sync-claim", source: "/privacy/" },
    roster: { value: { weapons: liveGameplay.weapons.length, enemies: liveGameplay.enemies.length, modes: liveGameplay.modes.length }, source: "/gameplay-contract.json" },
    replayProof: { value: liveGameplay.trust.replayEvidence, excludedClaim: liveGameplay.trust.excludedClaim, coverage: liveGameplay.trust.replayCoverage, source: "/gameplay-contract.json" },
    identity: { value: "guest-first-optional-local-porcelain-passport", source: "/privacy/" },
  },
}, null, 2));
// S155 — stats-surface.json is now generated from the committed snapshot with
// count-scaled interpretation copy. The hand-maintained version hardcoded
// prose like "twelve runs are too few…" that would read as false the moment
// traffic grew.
{
  const snap = statsSnapshot.stats;
  const period = `All supported production history through ${statsSnapshot.snapshotDate}`;
  const metric = (id, label, value, unitOrDenominator, interpretation) => ({
    id, label, value, period, computedAt: statsSnapshot.snapshotDate, unitOrDenominator, interpretation,
  });
  const runsNote = snap.runs < 50
    ? `The production fact pipeline is live, but ${fmtInt(snap.runs)} runs are too few for broad retention or balance conclusions.`
    : snap.runs < 500
      ? `${fmtInt(snap.runs)} verified runs form an early corpus — directional signals, not conclusions.`
      : `${fmtInt(snap.runs)} verified runs form a substantial corpus for aggregate analysis.`;
  const runnersNote = snap.runners < 20
    ? `${fmtInt(snap.runners)} runners establish real multi-player coverage without supporting a mass-audience claim.`
    : `${fmtInt(snap.runners)} distinct runners provide meaningful audience coverage.`;
  queue("stats-surface.json", JSON.stringify({
    schemaVersion: "1.1",
    title: "Call of Doodie verified game statistics",
    page: "https://callofdoodie.wtf/stats/",
    machineReadable: "https://callofdoodie.wtf/stats-surface.json",
    liveMachineReadable: "https://callofdoodie.wtf/api/community-stats",
    feedVersion: "analytica-feed-v1",
    refreshSeconds: 15,
    refreshMechanism: "poll",
    showcase: ["verified_runs", "distinct_runners", "enemies_terminated", "total_score"],
    precomputed: true,
    source: statsSnapshot.source,
    scope: "All recoverable server history; automated health checks, practice, and quarantined rows excluded",
    freshness: `Verified fallback snapshot from ${statsSnapshot.snapshotDate}; the live endpoint and visible Community Stats surfaces refresh every 15 seconds`,
    coverage: {
      history: "all_available_server_history",
      oldestSupportedAt: statsSnapshot.coverage.oldestSupportedAt,
      richRuns: statsSnapshot.coverage.richRuns,
      legacyRuns: statsSnapshot.coverage.legacyRuns,
      unrecoverablePreTelemetryRuns: "not_measurable",
      unknownLegacyMetrics: ["shots", "hits", "criticals", "bosses", "feedback"],
    },
    metrics: [
      metric("verified_runs", "Verified public runs", snap.runs, "completed non-synthetic runs", runsNote),
      metric("distinct_runners", "Distinct runners", snap.runners, "privacy-safe distinct public runner identifiers", runnersNote),
      metric("enemies_terminated", "Enemies terminated", snap.kills, "kills across verified completed runs", "Combat activity is present across the verified corpus; this total is not a per-player average."),
      metric("total_score", "Total score", snap.score, "score points across verified completed runs", "The total proves score ingestion coverage, while mode and difficulty mix still limit direct comparisons."),
      metric("total_damage", "Total damage", snap.damage, "damage points across verified completed runs", "Damage is available for current rich run facts; unsupported legacy detail is not reconstructed."),
      metric("excluded_health_checks", "Excluded health checks", snap.excludedHealthChecks, "server-identified synthetic rows", "Automation remains queryable for operations but cannot inflate public player, score, or combat totals."),
    ],
  }, null, 2));
}

queue("status.json", JSON.stringify({
  schemaVersion: "public-service-status-v1",
  effectiveDate: PUBLIC_CONTENT_VERSION_DATE,
  overall: "operational",
  surfaces: {
    browserGame: { status: "operational", fallback: "local-play" },
    leaderboard: { status: "operational", controls: ["origin-allowlist", "bounded-request-quota", "replay-check", "reversible-anomaly-quarantine"] },
    careerProgress: { status: "browser-local", crossDeviceSync: false },
    identity: { status: "guest-first", passport: "optional-local-receipt" },
  },
  source: "/status/",
}, null, 2));

const stale = [];
for (const [target, content] of expected) {
  const current = fs.existsSync(target) ? fs.readFileSync(target, "utf8") : "";
  if (current === content) continue;
  if (checkOnly) {
    stale.push(path.relative(process.cwd(), target).replaceAll("\\", "/"));
    continue;
  }
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
}

if (checkOnly && stale.length) {
  console.error(`Public route graph stale (${stale.length}):`);
  for (const file of stale) console.error(`- ${file}`);
  process.exit(1);
}

console.log(checkOnly
  ? `Public route graph current · ${expected.size} generated surfaces`
  : `Generated public route graph · ${expected.size} surfaces`);
