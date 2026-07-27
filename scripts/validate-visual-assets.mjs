#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import {
  ENEMY_ATLAS_CONTRACT, ENEMY_ATLAS_TOTAL_BYTE_BUDGET, getAtlasGridCoverage,
} from "../src/utils/enemyAtlasContract.js";


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
const atlasContractById = new Map(Object.values(ENEMY_ATLAS_CONTRACT).map((atlas) => [atlas.id, atlas]));
const atlasTypeIndices = [];
let atlasRuntimeBytes = 0;
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

  if (asset.kind === "runtime-character-atlas") {
    const contract = atlasContractById.get(asset.id);
    if (!contract) {
      fail(`${label} has no runtime atlas contract.`);
    } else {
      if (asset.runtimePath !== contract.runtimePath) fail(`${label} runtimePath drifted from atlas contract.`);
      if (Number(asset.maxBytes) !== contract.maxBytes) fail(`${label} maxBytes drifted from atlas contract.`);
      if (JSON.stringify(asset.grid) !== JSON.stringify({ columns: contract.columns, rows: contract.rows, slots: contract.slots })) fail(`${label} grid drifted from atlas contract.`);
      if (JSON.stringify(asset.typeIndices) !== JSON.stringify(contract.typeIndices)) fail(`${label} typeIndices drifted from atlas contract.`);
      const runtimeFullPath = path.join(ROOT, asset.runtimePath);
      if (fs.existsSync(runtimeFullPath)) {
        const bytes = fs.statSync(runtimeFullPath).size;
        atlasRuntimeBytes += bytes;
        if (bytes > contract.maxBytes) fail(`${label} exceeds ${contract.maxBytes} byte budget (${bytes}).`);
        const metadata = await sharp(runtimeFullPath).metadata();
        if (metadata.format !== "webp") fail(`${label} runtime format must be webp, received ${metadata.format}.`);
        if (metadata.width !== Number(dims.width) || metadata.height !== Number(dims.height)) fail(`${label} runtime dimensions drifted from manifest.`);
        if (!metadata.hasAlpha) fail(`${label} must preserve alpha transparency.`);
        const coverage = getAtlasGridCoverage(metadata.width, metadata.height, contract);
        if (!coverage.complete) fail(`${label} integer grid does not cover the complete atlas.`);
      }
      atlasTypeIndices.push(...contract.typeIndices);
    }
  }
}

const expectedAtlasTypes = Array.from({ length: 22 }, (_, index) => index);
const observedAtlasTypes = [...atlasTypeIndices].sort((left, right) => left - right);
if (JSON.stringify(observedAtlasTypes) !== JSON.stringify(expectedAtlasTypes)) fail("enemy atlas type coverage must be exactly 0..21 once.");
if (atlasRuntimeBytes > ENEMY_ATLAS_TOTAL_BYTE_BUDGET) fail(`enemy atlases exceed ${ENEMY_ATLAS_TOTAL_BYTE_BUDGET} aggregate byte budget (${atlasRuntimeBytes}).`);
if (atlasContractById.size !== 3) fail(`enemy atlas contract must define exactly 3 atlases, received ${atlasContractById.size}.`);


if (!process.exitCode) {
  console.log(`Visual asset manifest ok: ${assets.length} asset(s).`);
}
