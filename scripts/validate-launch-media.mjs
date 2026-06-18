#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "public", "manifest.json"), "utf8"));
const visual = JSON.parse(fs.readFileSync(path.join(ROOT, "assets", "visual-assets.json"), "utf8"));
const visualRuntime = new Set((visual.assets || []).map((asset) => asset.runtimePath));
const truthPackDoc = path.join(ROOT, "docs", "LAUNCH_SCREENSHOT_TRUTH_PACK.md");
const verifiedCaptures = [
  {
    path: "public/launch-captures/real-combat.png",
    label: "desktop combat",
  },
  {
    path: "public/launch-captures/real-mobile-controls.png",
    label: "mobile controls",
  },
];

let failures = 0;
function fail(message) {
  failures++;
  console.error(`Launch media error: ${message}`);
}

const screenshots = Array.isArray(manifest.screenshots) ? manifest.screenshots : [];
if (!screenshots.length) fail("manifest screenshots[] is empty.");

for (const shot of screenshots) {
  const src = shot.src || "";
  if (!src.endsWith(".svg") && !src.endsWith(".png")) {
    fail(`${src} must be an SVG fallback or a verified PNG capture.`);
    continue;
  }
  if (src.endsWith(".png")) {
    const pngRepoPath = path.join("public", src.replace(/^\//, ""));
    if (!fs.existsSync(path.join(ROOT, pngRepoPath))) fail(`${src} missing manifest PNG file.`);
    continue;
  }
  const pngPublic = src.replace(/\.svg$/i, ".png");
  const pngRepoPath = path.join("public", pngPublic.replace(/^\//, ""));
  if (!fs.existsSync(path.join(ROOT, pngRepoPath))) fail(`${src} missing generated PNG sibling ${pngPublic}.`);
  if (!visualRuntime.has(pngRepoPath.replace(/\\/g, "/"))) fail(`${pngRepoPath} missing from assets/visual-assets.json.`);
}

if (!fs.existsSync(truthPackDoc)) {
  fail("docs/LAUNCH_SCREENSHOT_TRUTH_PACK.md is missing.");
}

for (const capture of verifiedCaptures) {
  const fullPath = path.join(ROOT, capture.path);
  if (!fs.existsSync(fullPath)) {
    fail(`${capture.label} verified capture missing at ${capture.path}. Run npm run launch:screenshots.`);
    continue;
  }
  const bytes = fs.statSync(fullPath).size;
  if (bytes < 25000) fail(`${capture.path} is too small to be a credible gameplay capture (${bytes} bytes).`);
}

if (failures) {
  process.exitCode = 1;
} else {
  console.log(`Launch media ok: ${screenshots.length} manifest screenshot(s) have fallback provenance and ${verifiedCaptures.length} verified capture(s).`);
}
