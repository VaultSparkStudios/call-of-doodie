#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const manifestPath = path.join(ROOT, "assets", "visual-assets.json");
const requiredFields = ["id", "kind", "sourceType", "license", "sourcePath", "runtimePath", "dimensions", "status"];
const allowedStatuses = new Set(["source", "placeholder-export", "runtime-generated", "production-ready", "retired"]);

function fail(message) {
  console.error(`Visual asset manifest error: ${message}`);
  process.exitCode = 1;
}

function existsProjectPath(value) {
  if (!value || value === "virtual" || value === "none") return true;
  return fs.existsSync(path.join(ROOT, value));
}

if (!fs.existsSync(manifestPath)) {
  fail("assets/visual-assets.json is missing.");
  process.exit();
}

let manifest;
try {
  manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
} catch (error) {
  fail(`invalid JSON (${error.message})`);
  process.exit();
}

const assets = Array.isArray(manifest.assets) ? manifest.assets : [];
if (!assets.length) fail("assets[] must contain at least one asset.");

const ids = new Set();
for (const asset of assets) {
  const label = asset?.id || "(missing id)";
  for (const field of requiredFields) {
    if (asset?.[field] === undefined || asset?.[field] === "") fail(`${label} missing ${field}.`);
  }
  if (ids.has(asset.id)) fail(`${label} duplicate id.`);
  ids.add(asset.id);
  if (!allowedStatuses.has(asset.status)) fail(`${label} has unsupported status ${asset.status}.`);
  if (!asset.license || String(asset.license).toLowerCase().includes("unknown")) fail(`${label} has unknown license.`);
  if (!existsProjectPath(asset.sourcePath)) fail(`${label} sourcePath not found: ${asset.sourcePath}`);
  if (!existsProjectPath(asset.runtimePath)) fail(`${label} runtimePath not found: ${asset.runtimePath}`);
  const dims = asset.dimensions || {};
  if (!Number.isFinite(Number(dims.width)) || !Number.isFinite(Number(dims.height))) {
    fail(`${label} dimensions must include numeric width and height.`);
  }
}

if (!process.exitCode) {
  console.log(`Visual asset manifest ok: ${assets.length} asset(s).`);
}
