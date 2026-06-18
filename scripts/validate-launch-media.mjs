#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "public", "manifest.json"), "utf8"));
const visual = JSON.parse(fs.readFileSync(path.join(ROOT, "assets", "visual-assets.json"), "utf8"));
const visualRuntime = new Set((visual.assets || []).map((asset) => asset.runtimePath));

let failures = 0;
function fail(message) {
  failures++;
  console.error(`Launch media error: ${message}`);
}

const screenshots = Array.isArray(manifest.screenshots) ? manifest.screenshots : [];
if (!screenshots.length) fail("manifest screenshots[] is empty.");

for (const shot of screenshots) {
  const src = shot.src || "";
  if (!src.endsWith(".svg")) {
    fail(`${src} must keep SVG source in manifest until real screenshot replacement is declared.`);
    continue;
  }
  const pngPublic = src.replace(/\.svg$/i, ".png");
  const pngRepoPath = path.join("public", pngPublic.replace(/^\//, ""));
  if (!fs.existsSync(path.join(ROOT, pngRepoPath))) fail(`${src} missing generated PNG sibling ${pngPublic}.`);
  if (!visualRuntime.has(pngRepoPath.replace(/\\/g, "/"))) fail(`${pngRepoPath} missing from assets/visual-assets.json.`);
}

if (failures) {
  process.exitCode = 1;
} else {
  console.log(`Launch media ok: ${screenshots.length} manifest screenshot(s) have PNG provenance.`);
}
