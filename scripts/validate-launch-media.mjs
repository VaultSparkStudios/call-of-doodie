#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "public", "manifest.json"), "utf8"));
const visual = JSON.parse(fs.readFileSync(path.join(ROOT, "assets", "visual-assets.json"), "utf8"));
const visualAssets = Array.isArray(visual.assets) ? visual.assets : [];
const visualRuntime = new Set(visualAssets.map((asset) => asset.runtimePath));
const visualByRuntime = new Map(visualAssets.map((asset) => [asset.runtimePath, asset]));
const truthPackDoc = path.join(ROOT, "docs", "LAUNCH_SCREENSHOT_TRUTH_PACK.md");
const verifiedCaptures = [
  {
    path: "public/launch-captures/real-combat.png",
    label: "desktop combat",
    width: 1280,
    height: 720,
  },
  {
    path: "public/launch-captures/real-boss-rush.png",
    label: "boss rush",
    width: 1280,
    height: 720,
  },
  {
    path: "public/launch-captures/real-loadout-builder.png",
    label: "loadout builder",
    width: 1280,
    height: 720,
  },
  {
    path: "public/launch-captures/real-leaderboard.png",
    label: "leaderboard",
    width: 1280,
    height: 720,
  },
  {
    path: "public/launch-captures/real-mobile-controls.png",
    label: "mobile controls",
    width: 390,
    height: 844,
  },
];

let failures = 0;
function fail(message) {
  failures++;
  console.error(`Launch media error: ${message}`);
}

function readPngSize(fullPath) {
  const header = fs.readFileSync(fullPath, { encoding: null, flag: "r" }).subarray(0, 24);
  const signature = header.subarray(0, 8).toString("hex");
  if (signature !== "89504e470d0a1a0a") return null;
  return {
    width: header.readUInt32BE(16),
    height: header.readUInt32BE(20),
  };
}

const captureByRuntime = new Map(verifiedCaptures.map((capture) => [capture.path, capture]));

const screenshots = Array.isArray(manifest.screenshots) ? manifest.screenshots : [];
if (!screenshots.length) fail("manifest screenshots[] is empty.");

for (const shot of screenshots) {
  const src = shot.src || "";
  if (!src.endsWith(".svg") && !src.endsWith(".png")) {
    fail(`${src} must be an SVG fallback or a verified PNG capture.`);
    continue;
  }
  if (src.endsWith(".png")) {
    const pngRepoPath = path.join("public", src.replace(/^\//, "")).replace(/\\/g, "/");
    const fullPath = path.join(ROOT, pngRepoPath);
    if (!fs.existsSync(fullPath)) fail(`${src} missing manifest PNG file.`);
    const asset = visualByRuntime.get(pngRepoPath);
    if (!asset) fail(`${pngRepoPath} missing from assets/visual-assets.json.`);
    if (asset && asset.sourceType !== "browser-capture") fail(`${pngRepoPath} must be a browser-capture asset, got ${asset.sourceType}.`);
    if (asset && asset.status !== "production-ready") fail(`${pngRepoPath} must be production-ready, got ${asset.status}.`);
    const capture = captureByRuntime.get(pngRepoPath);
    if (!capture) fail(`${pngRepoPath} is a manifest PNG but is not listed in verifiedCaptures.`);
    if (capture && fs.existsSync(fullPath)) {
      const size = readPngSize(fullPath);
      if (!size) fail(`${pngRepoPath} is not a readable PNG.`);
      if (size && (size.width !== capture.width || size.height !== capture.height)) {
        fail(`${pngRepoPath} dimensions ${size.width}x${size.height} do not match expected ${capture.width}x${capture.height}.`);
      }
    }
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
  const size = readPngSize(fullPath);
  if (!size) {
    fail(`${capture.path} is not a readable PNG.`);
    continue;
  }
  if (size.width !== capture.width || size.height !== capture.height) {
    fail(`${capture.path} dimensions ${size.width}x${size.height} do not match expected ${capture.width}x${capture.height}.`);
  }
}

if (failures) {
  process.exitCode = 1;
} else {
  console.log(`Launch media ok: ${screenshots.length} manifest screenshot(s) have fallback provenance and ${verifiedCaptures.length} verified capture(s).`);
}
