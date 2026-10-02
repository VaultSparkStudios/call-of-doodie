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
import { renderVisualFieldGuide } from "./lib/field-guide-render.mjs";
import { renderModeDiscovery, renderOperationDiscovery } from "./lib/play-discovery-render.mjs";
import { renderSupportCenter } from "./lib/support-render.mjs";
import { renderChallengePreview } from "./lib/challenge-render.mjs";
import { renderFieldLab } from "./lib/field-lab-render.mjs";
import { CAPABILITY_EVIDENCE, PUBLIC_CAPABILITIES, capability, publicCapabilityManifest } from "../src/content/capabilities.js";
import { RUN_ANALYSIS_SCHEMA } from "../src/utils/agentRunPack.js";

const root = path.resolve("public");
const liveGameplay = buildPublicGameplayContract();
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
  ["operations", "Operations"],
  ["field-lab", "Field Lab"],
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

function renderPressKit() {
  const assets = [
    ["Game mark", "../icon.svg", "SVG", "Call of Doodie illustrated icon"],
    ["Original nemesis", "../visual-assets/cod-karen-nemesis-v2.png", "PNG", "Original Call of Doodie nemesis illustration"],
    ["Actual play frame", "../visual-assets/play-console-gameplay.webp", "WebP", "Call of Doodie arena gameplay frame"],
    ["Original operative", "../visual-assets/cod-doodie-operative-v3.png", "PNG", "Original Call of Doodie operative illustration"],
  ];
  return `<div class="press-kit" id="materials">
    <section class="card press-facts" aria-labelledby="press-facts-heading"><p class="eyebrow">Current fact sheet</p><h2 id="press-facts-heading">The game in one breath</h2>
      <p>A free, comedy-first browser arena roguelite by VaultSpark Studios LLC. Guests can start without an account; progress is stored in the browser and can be exported. A run combines movement, improvised weapons, escalating waves and authored challenges.</p>
      <dl><div><dt>Play</dt><dd>Free browser game · desktop, touch and compatible gamepad</dd></div><div><dt>Content</dt><dd>${liveGameplay.operations.length} authored Operations · ${liveGameplay.enemies.length} live enemy types · ${liveGameplay.weapons.length} weapons</dd></div><div><dt>Competition</dt><dd>Separate verified score checks; replay receipts are advisory, not frame-perfect proof</dd></div><div><dt>Current limits</dt><dd>Cloud recovery and online duel results are not available on the last checked deployment</dd></div></dl>
      <p class="press-facts__date">Product-service availability last checked ${escapeHtml(CAPABILITY_EVIDENCE.checkedAt.slice(0, 10))}; see <a href="../status/">dated status</a> and <a href="../capabilities.json">machine-readable capabilities</a>.</p>
    </section>
    <section class="press-assets" aria-labelledby="press-assets-heading"><div class="press-assets__head"><div><p class="eyebrow">First-party files</p><h2 id="press-assets-heading">Look at the world</h2></div><p>Download the source files for review. The game and its assets remain proprietary; this page does not grant a reuse license.</p></div>
      <div class="press-assets__grid">${assets.map(([title, href, format, alt]) => `<figure class="press-asset"><div class="press-asset__image"><img src="${href}" alt="${escapeHtml(alt)}" loading="lazy"></div><figcaption><strong>${escapeHtml(title)}</strong><span>${format}</span><a href="${href}" download>Download file ↓</a></figcaption></figure>`).join("")}</div>
    </section>
    <section class="card press-permission"><h2>Attribution and permission</h2><p>Credit “Call of Doodie © VaultSpark Studios LLC” when discussing the game. Original art, code, characters, music and written material are proprietary and all rights are reserved. For publication, asset reuse or a different format, <a href="../contact/">request permission</a> and review the <a href="../ip/">Rights &amp; IP page</a>. This parody is not affiliated with Activision or the Call of Duty® franchise.</p></section>
  </div>`;
}

function renderCapabilityRoadmap() {
  const groups = [
    ["shipped", "Playable now", "Choose a mode, make a save, or read the public board today."],
    ["next", "In progress", "These online services and refinements are not being advertised as live."],
    ["later", "On the horizon", "Ideas we want to earn through player evidence."],
  ];
  const labels = { live: "Observed online", local: "In your browser", unavailable: "Not available yet", planned: "Planned" };
  return `<div class="capability-roadmap">${groups.map(([group, title, summary], index) => `
    <section class="capability-group card" aria-labelledby="capability-${group}">
      <div class="capability-group-head"><span class="capability-index">0${index + 1}</span><div><h2 id="capability-${group}">${title}</h2><p>${summary}</p></div></div>
      <ul class="capability-list">${PUBLIC_CAPABILITIES.filter((entry) => entry.group === group).map((entry) => `
        <li><div><strong>${escapeHtml(entry.label)}</strong><span class="capability-badge" data-availability="${entry.availability}">${labels[entry.availability]}</span></div><p>${escapeHtml(entry.benefit)}</p>${group === "shipped" ? `<a href="..${escapeHtml(entry.route)}">Explore <span aria-hidden="true">→</span></a>` : ""}</li>`).join("")}</ul>
    </section>`).join("")}</div>`;
}

// S155: fallback numbers come from the committed snapshot
// (data/community-stats-snapshot.json, refreshed via `npm run stats:snapshot`)
// and carry their snapshot date, so a stale fallback reads as dated history
// instead of masquerading as live truth.
const statsSnapshot = JSON.parse(fs.readFileSync(path.resolve("data", "community-stats-snapshot.json"), "utf8"));
const fmtInt = (value) => Number(value || 0).toLocaleString("en-US");

function renderLiveCommunityStats(page) {
  if (page.id !== "board" && page.id !== "stats") return "";
  const snap = statsSnapshot.stats;
  if (page.id === "board") return `
      <section class="live-stats board-stats-summary" aria-labelledby="board-stats-heading">
        <div class="live-stats-head"><div><p class="eyebrow">From the same verified feed</p><h2 id="board-stats-heading">The room at a glance</h2></div><span class="status" data-community-status data-state="connecting" aria-live="polite">Connecting to live totals…</span></div>
        <div class="live-stat-grid">${[["runs", "Runs", fmtInt(snap.runs)], ["runners", "Runners", fmtInt(snap.runners)], ["kills", "Enemies terminated", fmtInt(snap.kills)], ["score", "Total score", fmtInt(snap.score)]].map(([id, label, fallback]) => `<div class="live-stat"><span>${escapeHtml(label)}</span><strong data-community-stat="${id}">${escapeHtml(fallback)}</strong></div>`).join("")}</div>
        <p class="live-coverage" data-community-coverage>Verified fallback snapshot from ${escapeHtml(statsSnapshot.snapshotDate)}; live totals replace it when connected.</p>
        <p class="live-caveat">Recorded activity is not a retention or balance result. Historical coverage and definitions live with the full analysis.</p>
        <a class="stats-detail-link" href="../stats/">Read the full stats and definitions →</a>
      </section>`;
  const metrics = [
    ["runs", "Runs", fmtInt(snap.runs)],
    ["runners", "Runners", fmtInt(snap.runners)],
    ["hours", "Hours played", `${snap.hours} h`],
    ["kills", "Enemies terminated", fmtInt(snap.kills)],
    ["score", "Total score", fmtInt(snap.score)],
    ["damage", "Damage dealt", fmtInt(snap.damage)],
    ["accuracy", "Measured accuracy", snap.shots > 0 && snap.hits != null ? `${Math.round((snap.hits / snap.shots) * 1000) / 10}%` : "—"],
    ["bosses", "Recorded boss defeats", fmtInt(snap.bosses)],
  ];
  return `
      <section class="live-stats" aria-labelledby="live-community-heading">
        <div class="live-stats-head">
          <div><p class="eyebrow">Live-checked aggregate</p><h2 id="live-community-heading">All supported history</h2></div>
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
        <p class="live-caveat">Mini lines show changes this browser has observed while visiting; they are not a server-wide history chart.</p>
        ${page.id === "board" ? '<a class="stats-detail-link" href="../stats/">Read the full stats and definitions →</a>' : ""}
      </section>`;
}

function renderStatsAnalysis(page) {
  if (page.id !== "stats") return "";
  const snap = statsSnapshot.stats;
  const coverage = statsSnapshot.coverage;
  const modeRows = Object.entries(snap.modes || {}).sort((a, b) => b[1] - a[1]);
  const modes = modeRows.length
    ? modeRows.map(([mode, count]) => `<li><span>${escapeHtml(mode.replaceAll("_", " "))}</span><strong>${fmtInt(count)} of ${fmtInt(snap.runs)} runs</strong><progress value="${Math.max(0, Number(count) || 0)}" max="${Math.max(1, Number(snap.runs) || 1)}"></progress></li>`).join("")
    : '<li>Mode breakdown was not captured in this dated snapshot.</li>';
  const richShare = snap.runs > 0 ? `${Math.round((coverage.richRuns / snap.runs) * 100)}%` : "—";
  const lastRun = statsSnapshot.lastCompletedAt ? new Date(statsSnapshot.lastCompletedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "unknown";
  return `
      <section class="stats-analysis" aria-labelledby="stats-analysis-heading">
        <div class="stats-analysis-head"><div><p class="eyebrow">What the ledger can say</p><h2 id="stats-analysis-heading">Activity with its denominator</h2></div><p data-stats-source>Verified snapshot · ${escapeHtml(statsSnapshot.snapshotDate)}</p></div>
        <div class="stats-analysis-grid">
          <article><span>Last 24 hours</span><strong data-stats-recent>${snap.runs24h == null ? "Unknown" : fmtInt(snap.runs24h)} runs</strong><p data-stats-recent-note>Completed supported runs in the 24 hours before this snapshot. This is activity, not retention.</p></article>
          <article><span>Full-detail coverage</span><strong data-stats-rich>${fmtInt(coverage.richRuns)} of ${fmtInt(snap.runs)} · ${richShare}</strong><p data-stats-rich-note>Remaining records are legacy; unavailable fields stay unknown.</p></article>
          <article><span>Latest completed run</span><strong data-stats-last-run>${escapeHtml(lastRun)}</strong><p>Server record time. Checking the feed again does not create a new run.</p></article>
        </div>
        <div class="stats-mode-panel"><div><h3>How the runs were played</h3><p>Mode counts use all supported completed runs; they are not session or player counts.</p></div><ul data-stats-modes>${modes}</ul></div>
        <p class="stats-takeaway" data-stats-takeaway>${fmtInt(snap.runs)} supported runs are available through ${escapeHtml(statsSnapshot.snapshotDate)}. This corpus describes recorded activity; it does not measure difficulty balance or return visits.</p>
        <p class="live-caveat" data-stats-coverage-note>Oldest supported record: ${coverage.oldestSupportedAt ? escapeHtml(new Date(coverage.oldestSupportedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })) : "unknown"}. ${fmtInt(coverage.richRuns)} full-detail and ${fmtInt(coverage.legacyRuns)} legacy records. Unsubmitted pre-telemetry runs cannot be counted.</p>
      </section>`;
}

// S155 — the /leaderboard/ page previously explained the leaderboard without
// showing a single score (a dead end for the visitor's intent). It now
// renders a live top-10 from /api/top-scores with a graceful offline state.
function renderLiveLeaderboard(page) {
  if (page.id !== "board") return "";
  return `
      <section class="live-stats" aria-labelledby="live-board-heading">
        <div class="live-stats-head">
          <div><p class="eyebrow">Verified global board</p><h2 id="live-board-heading">Latest verified top 10</h2></div>
          <span class="status" data-top-scores-status data-state="connecting" aria-live="polite">Connecting to the live board…</span>
        </div>
        <div class="board-table-scroll" tabindex="0" aria-label="Latest verified scores; scroll horizontally to see every column">
          <table class="board-table" data-top-scores hidden>
            <thead><tr style="text-align:left"><th>#</th><th>Callsign</th><th>Score</th><th>Wave</th><th>Kills</th><th>Mode</th></tr></thead>
            <tbody></tbody>
          </table>
        </div>
        <p class="board-table-hint">Swipe or scroll the score table to see every column.</p>
        <p class="live-caveat">Scores carry trust checks; runs with modified gameplay settings are badged in game. Play as a guest and submit with any callsign.</p>
      </section>`;
}

function renderPage(page) {
  const visualGuide = renderVisualFieldGuide(page.id, liveGameplay);
  const discovery = page.id === "modes" ? renderModeDiscovery(liveGameplay) : page.id === "operations" ? renderOperationDiscovery(liveGameplay) : "";
  const supportCenter = page.id === "support" ? renderSupportCenter(liveGameplay) : "";
  const challengePreview = page.id === "challenge" ? renderChallengePreview() : "";
  const fieldLab = page.id === "field-lab" ? renderFieldLab() : "";
  const pressKit = page.id === "press-kit" ? renderPressKit() : "";
  const feedbackPanel = page.id === "feedback" ? `<section class="card feedback-summary" aria-labelledby="feedback-summary-heading" data-feedback-summary>
        <p class="eyebrow">Consented categories · live aggregate</p><h2 id="feedback-summary-heading">Field Report signal</h2>
        <p data-feedback-status role="status">Checking the report aggregate. No result is assumed while it loads.</p>
        <div class="feedback-summary-grid" data-feedback-results hidden></div>
        <p class="live-caveat">Responses are reports, not unique people. Reporters are distinct consenting IDs; returning reporters sent two reports at least 24 hours apart. The runner sample counts separate completed server run facts, not everyone who opened the game. No response count proves retention or the effect of a change.</p>
      </section>` : "";
  const liveStats = renderLiveLeaderboard(page) + renderLiveCommunityStats(page) + feedbackPanel;
  const liveStatsScript = page.id === "bestiary" || page.id === "field-manual" ? '<script src="../field-guide.js" defer></script>' : page.id === "board"
    ? '<script src="../leaderboard-live.js" defer></script>\n  <script src="../community-stats-live.js" defer></script>'
    : page.id === "stats" ? '<script src="../community-stats-live.js" defer></script>' : page.id === "feedback" ? '<script src="../feedback-summary-live.js" defer></script>' : page.id === "support" ? '<script src="../support-diagnostics.js" defer></script>' : page.id === "challenge" ? '<script type="module" src="../challenge-preview.js"></script>' : page.id === "field-lab" ? '<script type="module" src="../field-lab.js"></script>' : "";
  const cta = page.cta
    ? `<a class="primary-cta" href="${escapeHtml(page.cta[1])}">${escapeHtml(page.cta[0])} <span aria-hidden="true">→</span></a>`
    : "";
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#070b10">
  <meta name="description" content="${escapeHtml(page.description)}">
  <link rel="canonical" href="${page.canonicalUrl}">
  <link rel="icon" href="../favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="../tokens.css">
  <link rel="stylesheet" href="../doc.css">
  <script src="../theme.js" defer></script>
${liveStatsScript ? `  ${liveStatsScript}\n` : ""}  <title>${escapeHtml(page.title)} | Call of Doodie</title>
</head>
<body class="fx-vignette">
  <div class="shell">
    <header class="site-header"><a class="brand" href="../">CALL OF <span>DOODIE</span></a><nav aria-label="Primary navigation">
${renderHeaderNav("../")}
    </nav></header>
    <main>
      <p class="eyebrow">${escapeHtml(page.eyebrow)}</p>
      <h1>${escapeHtml(page.title)}</h1>
      <p class="lede">${escapeHtml(page.lede)}</p>
      ${cta}${liveStats}${renderStatsAnalysis(page)}
      ${visualGuide || discovery || supportCenter || fieldLab || pressKit || challengePreview + (page.id === "challenge" ? `<div class="card-grid">${page.sections.map(card).join("")}</div>` : "") || (page.id === "roadmap" ? renderCapabilityRoadmap() : `<div class="card-grid${page.id === "stats" ? " stats-card-grid" : ""}">${page.sections.map(card).join("")}</div>`)}
      <aside class="next-links card" aria-label="Explore more"><strong>Keep exploring</strong>${buildExploreLinks(page)}</aside>
    </main>
    <footer><div class="footer-links">${renderFooterLinks("../")}</div><p class="parody-note">${escapeHtml(PARODY_DISCLAIMER)}</p><div>© ${copyrightYear()} <a href="https://vaultsparkstudios.com/">VaultSpark Studios LLC</a>. All rights reserved.</div></footer>
  </div>
</body>
</html>`.replace(/^[ \t]+$/gm, "");
}

for (const page of getGeneratedCompanionPages()) {
  queue(path.join(page.id, "index.html"), renderPage(page));
}
queue("challenge-payload.js", fs.readFileSync(path.resolve("src/utils/challengePayload.js"), "utf8"));
queue("field-lab-models.js", fs.readFileSync(path.resolve("src/utils/fieldLabModels.js"), "utf8"));

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
queue("run-analysis-schema.json", JSON.stringify(RUN_ANALYSIS_SCHEMA, null, 2));
queue("route-contract.json", JSON.stringify(buildRouteContractProof(), null, 2));
queue("capabilities.json", JSON.stringify(publicCapabilityManifest(), null, 2));
queue(path.join(".well-known", "llms.txt"), buildLlmsText());
queue("field-manual.json", JSON.stringify({
  schemaVersion: "field-manual-truth-v1",
  effectiveDate: PUBLIC_CONTENT_VERSION_DATE,
  canonicalUrl: "https://callofdoodie.wtf/field-manual.json",
  claims: {
    price: { value: "free-to-play", source: "/terms/" },
    progress: { value: "browser-local-no-cloud-sync-claim", source: "/privacy/" },
    roster: { value: { weapons: liveGameplay.weapons.length, enemies: liveGameplay.enemies.length, operations: liveGameplay.operations.length, modes: liveGameplay.modes.length }, source: "/gameplay-contract.json" },
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
      ? `${fmtInt(snap.runs)} verified runs describe recorded activity; they do not measure retention or balance.`
      : `${fmtInt(snap.runs)} verified runs describe aggregate activity, not the effect of a change or a retention rate.`;
  const runnersNote = `${fmtInt(snap.runners)} privacy-safe runner identifiers appear in supported records; this does not prove a count of individual people.`;
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
    freshness: `Verified fallback snapshot from ${statsSnapshot.snapshotDate}; the live endpoint is checked every 15 seconds while visible and healthy, with bounded retry delays after failures. A check does not imply a new completed run`,
    snapshotCheckedAt: statsSnapshot.checkedAt,
    lastCompletedAt: statsSnapshot.lastCompletedAt,
    recentWindow: { hours: 24, runs: snap.runs24h, kills: snap.kills24h },
    modes: snap.modes,
    coverage: {
      history: "all_available_server_history",
      oldestSupportedAt: statsSnapshot.coverage.oldestSupportedAt,
      richRuns: statsSnapshot.coverage.richRuns,
      legacyRuns: statsSnapshot.coverage.legacyRuns,
      accuracyRuns: statsSnapshot.coverage.accuracyRuns,
      feedbackRuns: statsSnapshot.coverage.feedbackRuns,
      unrecoverablePreTelemetryRuns: "not_measurable",
      unknownLegacyMetrics: ["shots", "hits", "criticals", "bosses", "feedback"],
    },
    metrics: [
      metric("verified_runs", "Verified public runs", snap.runs, "completed non-synthetic runs", runsNote),
      metric("distinct_runners", "Distinct runners", snap.runners, "privacy-safe distinct public runner identifiers", runnersNote),
      metric("enemies_terminated", "Enemies terminated", snap.kills, "kills across verified completed runs", "Combat activity is present across the verified corpus; this total is not a per-player average."),
      metric("total_score", "Total score", snap.score, "score points across verified completed runs", "The total proves score ingestion coverage, while mode and difficulty mix still limit direct comparisons."),
      metric("total_damage", "Total damage", snap.damage, "damage points across verified completed runs", "Damage is available for current rich run facts; unsupported legacy detail is not reconstructed."),
      ...(snap.shots > 0 && snap.hits != null ? [metric("measured_accuracy", "Measured accuracy", Math.round((snap.hits / snap.shots) * 1000) / 10, `${fmtInt(snap.hits)} hits / ${fmtInt(snap.shots)} shots across ${fmtInt(statsSnapshot.coverage.accuracyRuns)} runs with shot fields`, "Legacy runs without shot fields are excluded from this ratio, not treated as misses.")] : []),
      ...(snap.excludedHealthChecks == null ? [] : [metric("excluded_health_checks", "Excluded health checks", snap.excludedHealthChecks, "server-identified synthetic rows", "Automation remains queryable for operations but cannot inflate public player, score, or combat totals.")]),
    ],
  }, null, 2));
}

queue("status.json", JSON.stringify({
  schemaVersion: "public-service-status-v1",
  effectiveDate: CAPABILITY_EVIDENCE.checkedAt.slice(0, 10),
  checkedAt: CAPABILITY_EVIDENCE.checkedAt,
  overall: "last-observed-healthy",
  surfaces: {
    browserGame: { status: "last-observed-healthy", fallback: "local-play" },
    leaderboard: { status: "last-observed-healthy", controls: ["origin-allowlist", "bounded-request-quota", "replay-check", "reversible-anomaly-quarantine"] },
    careerProgress: { status: capability("local-backup").availability, crossDeviceSync: capability("cloud-backup").availability === "live" },
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
