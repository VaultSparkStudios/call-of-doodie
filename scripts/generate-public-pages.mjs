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
  return `
    <figure class="roster-art card">
      <img src="../visual-assets/enemy-atlas-core-v3.webp" alt="Core enemy roster atlas">
      <img src="../visual-assets/enemy-atlas-specialists.webp" alt="Specialist enemy roster atlas">
      <img src="../visual-assets/enemy-atlas-bosses.webp" alt="Signature encounter roster atlas">
      <figcaption>Production character art shown at high resolution; in-game silhouettes are optimized for combat scale. Gameplay classifications come from the live contract below.</figcaption>
    </figure>`;
}

function renderLiveCommunityStats(page) {
  if (page.id !== "stats") return "";
  const metrics = [
    ["runs", "Runs", "12"],
    ["runners", "Runners", "5"],
    ["hours", "Hours played", "0.2 h"],
    ["kills", "Enemies terminated", "259"],
    ["score", "Total score", "119,223"],
    ["damage", "Damage dealt", "21,628"],
    ["accuracy", "Measured accuracy", "—"],
    ["bosses", "Bosses terminated", "0"],
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
        <p class="live-coverage" data-community-coverage>All 12 supported runs · 0 full-detail · 12 legacy · oldest supported record March 12, 2026.</p>
        <p class="live-caveat">This includes every recoverable server record. Runs never submitted before telemetry existed cannot be reconstructed; unavailable legacy fields remain unknown instead of being estimated.</p>
      </section>`;
}

function renderPage(page) {
  const art = page.art ? renderArt() : "";
  const liveStats = renderLiveCommunityStats(page);
  const liveStatsScript = page.id === "stats" ? '<script src="../community-stats-live.js" defer></script>' : "";
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
