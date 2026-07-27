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
} from "./lib/public-route-registry.mjs";

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

function card([title, body]) {
  return `<section class="card"><h2>${escapeHtml(title)}</h2><p>${escapeHtml(body)}</p></section>`;
}

function renderArt() {
  return `
    <figure class="roster-art card">
      <img src="../visual-assets/enemy-atlas-core.webp" alt="Core enemy roster atlas">
      <img src="../visual-assets/enemy-atlas-specialists.webp" alt="Specialist enemy roster atlas">
      <img src="../visual-assets/enemy-atlas-bosses.webp" alt="Signature encounter roster atlas">
      <figcaption>Production character art shown at high resolution; in-game silhouettes are optimized for combat scale. Gameplay classifications come from the live contract below.</figcaption>
    </figure>`;
}

function renderPage(page) {
  const art = page.art ? renderArt() : "";
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
  <title>${escapeHtml(page.title)} | Call of Doodie</title>
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
      ${cta}${art}
      <div class="card-grid">${page.sections.map(card).join("")}</div>
      <aside class="next-links card" aria-label="Explore more"><strong>Keep exploring</strong><a href="../modes/">Modes</a><a href="../arsenal/">Arsenal</a><a href="../accessibility/">Accessibility</a><a href="../support/">Support</a></aside>
    </main>
    <footer><div class="footer-links">${renderFooterLinks("../")}</div><div>© 2026 <a href="https://vaultsparkstudios.com/">VaultSpark Studios LLC</a>. All rights reserved.</div></footer>
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
