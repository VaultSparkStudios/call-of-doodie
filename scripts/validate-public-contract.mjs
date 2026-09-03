#!/usr/bin/env node

// Usage: node scripts/validate-public-contract.mjs [--json]
// Validates the complete public-safe static contract without network access.

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { buildPublicGameplayContract } from "./lib/public-gameplay-contract.mjs";
import {
  buildAgentsManifest,
  buildFooterManifest,
  buildLlmsText,
  buildSitemapXml,
  buildRouteContractProof,
  getPublicRouteRegistry,
  renderFooterLinks,
  renderHeaderNav,
} from "./lib/public-route-registry.mjs";

const root = process.cwd();
const jsonMode = process.argv.includes("--json");
const errors = [];
const warnings = [];

if (process.argv.includes("--help")) {
  console.log("Usage: node scripts/validate-public-contract.mjs [--json]");
  process.exit(0);
}

function relative(...parts) {
  return path.join(...parts);
}

function read(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

function requireFile(file) {
  const full = path.join(root, file);
  if (!fs.existsSync(full)) {
    errors.push("missing file: " + file);
    return "";
  }
  const content = fs.readFileSync(full, "utf8");
  if (!content.trim()) errors.push("empty file: " + file);
  return content;
}

function requireIncludes(label, content, values) {
  for (const value of values) {
    if (!content.includes(value)) errors.push(label + " missing: " + value);
  }
}

function hrefs(items = []) {
  return new Set(items.map((item) => typeof item === "string" ? item : item?.href).filter(Boolean));
}

const routeRegistry = getPublicRouteRegistry();
const requiredFiles = [
  ...routeRegistry.filter((route) => route.path !== "/").map((route) => relative(...route.filePath.split("/"))),
  relative("public", "agents.json"),
  relative("public", "gameplay-contract.json"),
  relative("public", "route-contract.json"),
  relative("public", ".well-known", "llms.txt"),
  relative("public", "sitemap.xml"),
  relative("public", "robots.txt"),
  relative("public", "footer-manifest.json"),
  relative("public", "doc.css"),
  relative("public", "tokens.css"),
  relative("public", "theme.js"),
  relative("docs", "DEPLOY_ROLLBACK.md"),
  relative("docs", "RELEASE_PARITY.md"),
];
const contentByFile = Object.fromEntries(requiredFiles.map((file) => [file, requireFile(file)]));

let agents = null;
let footer = null;
let gameplayContract = null;
let routeContractProof = null;
try {
  agents = JSON.parse(contentByFile[relative("public", "agents.json")]);
} catch (error) {
  errors.push("agents.json invalid JSON: " + error.message);
}
try {
  footer = JSON.parse(contentByFile[relative("public", "footer-manifest.json")]);
} catch (error) {
  errors.push("footer-manifest.json invalid JSON: " + error.message);
}
try {
  gameplayContract = JSON.parse(contentByFile[relative("public", "gameplay-contract.json")]);
} catch (error) {
  errors.push("gameplay-contract.json invalid JSON: " + error.message);
}
try {
  routeContractProof = JSON.parse(contentByFile[relative("public", "route-contract.json")]);
} catch (error) {
  errors.push("route-contract.json invalid JSON: " + error.message);
}

if (routeContractProof) {
  if (JSON.stringify(routeContractProof) !== JSON.stringify(buildRouteContractProof())) {
    errors.push("route-contract.json fingerprint drifted from source; run npm run build");
  }
  if (routeContractProof.coverage?.routes !== routeRegistry.length) errors.push("route-contract.json route count is incomplete");
}
if (agents) {
  if (JSON.stringify(agents) !== JSON.stringify(buildAgentsManifest())) {
    errors.push("agents.json drifted from the public route graph; run npm run build");
  }
  requireIncludes("agents.json", JSON.stringify(agents), [
    "VaultSpark Studios LLC",
    "cost-neutral",
    "advisory deterministic evidence",
    "https://callofdoodie.wtf/contact/",
    "https://callofdoodie.wtf/ip/",
  ]);
  if (agents.access?.writeActions !== "not-offered") errors.push("agents.json must not invent a public write action");
}

if (footer) {
  if (JSON.stringify(footer) !== JSON.stringify(buildFooterManifest())) {
    errors.push("footer-manifest.json drifted from the public route graph; run npm run build");
  }
  const allFooterLinks = hrefs(footer.footerLinks);
  const requiredLinks = new Set([
    ...hrefs(footer.headerLinks),
    ...(footer.footerOnly || []),
    ...(footer.legalPages || []),
  ]);
  for (const href of requiredLinks) {
    if (!allFooterLinks.has(href)) errors.push("footer manifest missing required destination: " + href);
  }
}

if (gameplayContract) {
  const expectedGameplayContract = buildPublicGameplayContract();
  if (JSON.stringify(gameplayContract) !== JSON.stringify(expectedGameplayContract)) {
    errors.push("gameplay-contract.json drifted from source; run npm run gameplay:contract");
  }
}

const expectedHeaderNav = renderHeaderNav("../");
const expectedFooterLinks = renderFooterLinks("../");
for (const route of routeRegistry.filter((entry) => entry.path !== "/")) {
  const file = relative(...route.filePath.split("/"));
  requireIncludes(route.id, contentByFile[file], [
    route.canonicalUrl,
    expectedHeaderNav,
    expectedFooterLinks,
    "VaultSpark Studios LLC",
    "data-theme-toggle",
  ]);
}

if (contentByFile[relative("public", "sitemap.xml")] !== buildSitemapXml()) {
  errors.push("sitemap.xml drifted from the public route graph; run npm run build");
}
if (contentByFile[relative("public", ".well-known", "llms.txt")] !== buildLlmsText()) {
  errors.push("llms.txt drifted from the public route graph; run npm run build");
}

// S146: HomeV2/HomeV3/MenuScreen consolidated their three drifted inline footers into one
// shared SiteFooter.jsx component (CANON — single source of truth for legal/agent links).
// Verify the shared component carries the required destinations, and that each home wires it in.
// S155: link truth moved from SiteFooter.jsx into publicNavigation.js — the
// destination pins now check the shared module, and the footer component is
// checked for consuming it plus the stable © suffix (year injected at build).
const publicNavFile = relative("src", "config", "publicNavigation.js");
requireIncludes(publicNavFile, read(publicNavFile), [
  "/privacy/",
  "/terms/",
  "/ip/",
  "/agents.json",
  "/.well-known/llms.txt",
]);
const siteFooterFile = relative("src", "components", "SiteFooter.jsx");
requireIncludes(siteFooterFile, read(siteFooterFile), [
  "LEGAL_PUBLIC_NAV",
  "AGENT_PUBLIC_NAV",
  "PARODY_DISCLAIMER",
  "VaultSpark Studios LLC. All rights reserved.",
]);

// S155: the React footer's membership list (FOOTER_PUBLIC_NAV) and the
// registry's route.footer flags are two spellings of the same truth — assert
// they agree so they can't drift apart again.
{
  const { FOOTER_PUBLIC_NAV } = await import("../src/config/publicNavigation.js");
  const navHrefs = new Set(FOOTER_PUBLIC_NAV.map((item) => item.href.replace("/#deploy", "/")));
  const registryFooterHrefs = new Set(routeRegistry.filter((route) => route.footer).map((route) => route.path));
  for (const href of registryFooterHrefs) {
    // /play/ is footer-listed on static pages; the in-app footer's Play entry
    // is the /#deploy anchor instead, so it is exempt here.
    if (!navHrefs.has(href) && !["/privacy/", "/terms/", "/contact/", "/ip/", "/", "/play/"].includes(href)) {
      errors.push(`registry footer route ${href} missing from FOOTER_PUBLIC_NAV`);
    }
  }
  for (const href of navHrefs) {
    if (!registryFooterHrefs.has(href) && href !== "/") {
      errors.push(`FOOTER_PUBLIC_NAV href ${href} not flagged footer in the route registry`);
    }
  }
}
for (const file of [
  relative("src", "components", "HomeV2.jsx"),
]) {
  requireIncludes(file, read(file), ["./SiteFooter.jsx", "<SiteFooter"]);
}

for (const page of ["privacy", "terms", "contact", "ip"]) {
  const file = relative("public", page, "index.html");
  requireIncludes(file, contentByFile[file], [
    "VaultSpark Studios LLC. All rights reserved.",
    "https://callofdoodie.wtf/" + page + "/",
    "../privacy/",
    "../terms/",
    "../contact/",
    "../ip/",
    "../theme.js",
    "data-theme-toggle",
  ]);
}

// S163: static pages consume the generated design tokens plus a hex-free doc layer.
requireIncludes("tokens.css", contentByFile[relative("public", "tokens.css")], [
  "porcelain-day",
  "--cod-orange",
  "--cod-focus",
  "--font-display",
]);
requireIncludes("doc.css", contentByFile[relative("public", "doc.css")], [
  "var(--cod-",
  "--button-ink",
  ".theme-toggle",
  ".footer-links nav",
]);
if (/#[0-9a-fA-F]{6}/.test(contentByFile[relative("public", "doc.css")] || "")) errors.push("doc.css contains a raw hex color; use a token from src/utils/theme.js");
requireIncludes("theme.js", contentByFile[relative("public", "theme.js")], [
  "cod-theme",
  "porcelain-day",
  "sewer-night",
  'themes.includes(stored) ? stored : "sewer-night"',
]);

requireIncludes("contact", contentByFile[relative("public", "contact", "index.html")], [
  "hello@callofdoodie.wtf",
  "EMAIL SUPPORT",
  "founder@vaultsparkstudios.com",
]);
requireIncludes("ip", contentByFile[relative("public", "ip", "index.html")], [
  "License: Proprietary — All Rights Reserved, VaultSpark Studios LLC",
  "First-party provenance",
  "independent comedy parody",
  "Call of Duty®",
]);
requireIncludes("llms.txt", contentByFile[relative("public", ".well-known", "llms.txt")], [
  "Proprietary — All Rights Reserved",
  "advisory deterministic decision-stream evidence",
  "gameplay-contract.json",
]);
requireIncludes("sitemap.xml", contentByFile[relative("public", "sitemap.xml")], [
  "https://callofdoodie.wtf/",
  "https://callofdoodie.wtf/privacy/",
  "https://callofdoodie.wtf/terms/",
  "https://callofdoodie.wtf/contact/",
  "https://callofdoodie.wtf/ip/",
]);
requireIncludes("robots.txt", contentByFile[relative("public", "robots.txt")], [
  "Allow: /",
  "Sitemap: https://callofdoodie.wtf/sitemap.xml",
]);

const index = read("index.html");
const jsonLdMatch = index.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
if (!jsonLdMatch) {
  errors.push("index.html missing JSON-LD");
} else {
  try { JSON.parse(jsonLdMatch[1]); } catch (error) { errors.push("index JSON-LD invalid: " + error.message); }
  const hash = crypto.createHash("sha256").update(jsonLdMatch[1]).digest("base64");
  const headers = read(relative("public", "_headers"));
  if (!headers.includes("'sha256-" + hash + "'")) errors.push("Content Security Policy missing the JSON-LD hash");
}

const result = { ok: errors.length === 0, errors, warnings, checkedFiles: requiredFiles.length };
if (jsonMode) console.log(JSON.stringify(result, null, 2));
else {
  console.log("Public contract: " + (result.ok ? "PASS" : "FAIL") + " · " + requiredFiles.length + " files");
  for (const error of errors) console.error("- " + error);
  for (const warning of warnings) console.warn("- " + warning);
}
process.exitCode = result.ok ? 0 : 1;
