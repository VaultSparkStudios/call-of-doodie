#!/usr/bin/env node

// Usage: node scripts/generate-proprietary-visual-assets.mjs
// Deterministically regenerates VaultSpark-proprietary source and runtime art.

import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { ENEMY_ATLAS_CONTRACT } from "../src/utils/enemyAtlasContract.js";
import { WEAPON_ATLAS_CONTRACT, WORLD_OBJECT_ATLAS_CONTRACT, WORLD_OBJECT_CELLS, THEME_PROP_ATLAS_CONTRACT, THEME_PROP_CELLS } from "../src/utils/objectAtlasContract.js";
import { ZOMBIE_ATLAS_CONTRACT } from "../src/utils/zombieAtlasContract.js";
import { buildWeaponAtlasSvg, buildWorldObjectAtlasSvg, buildThemePropAtlasSvg, buildZombieAtlasSvg } from "./lib/object-atlas-svg.mjs";
import { removeChromaKey } from "./lib/chroma-key.mjs";

const ROOT = process.cwd();
const sourceDir = path.join(ROOT, "assets", "source", "signature-pack");
const runtimeDir = path.join(ROOT, "public", "visual-assets");
const runtimeSpriteSourceDir = path.join(ROOT, "assets", "source", "runtime-sprites");

if (process.argv.includes("--help")) {
  console.log("Usage: node scripts/generate-proprietary-visual-assets.mjs");
  process.exit(0);
}

fs.mkdirSync(sourceDir, { recursive: true });
fs.mkdirSync(runtimeDir, { recursive: true });

function svgFrame({ id, title, subtitle, bg0, bg1, fg, accent, body }) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512" role="img" aria-label="${title}">
  <defs>
    <radialGradient id="${id}-bg" cx="38%" cy="25%" r="76%">
      <stop offset="0%" stop-color="${bg0}"/>
      <stop offset="100%" stop-color="${bg1}"/>
    </radialGradient>
    <linearGradient id="${id}-shine" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.72"/>
      <stop offset="45%" stop-color="#ffffff" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0.22"/>
    </linearGradient>
    <filter id="${id}-shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="20" stdDeviation="18" flood-color="#000000" flood-opacity="0.45"/>
    </filter>
  </defs>
  <rect width="512" height="512" rx="56" fill="url(#${id}-bg)"/>
  <path d="M42 404 C128 364 210 396 286 358 C356 322 418 332 472 298 L472 512 L42 512 Z" fill="#000000" opacity="0.2"/>
  ${body}
  <rect x="26" y="26" width="460" height="460" rx="44" fill="none" stroke="${accent}" stroke-opacity="0.62" stroke-width="4"/>
  <text x="38" y="434" fill="${fg}" font-family="Courier New, monospace" font-size="28" font-weight="900" letter-spacing="2">${title}</text>
  <text x="40" y="464" fill="${fg}" opacity="0.72" font-family="Courier New, monospace" font-size="16" font-weight="700" letter-spacing="1.4">${subtitle}</text>
</svg>`;
}

const assets = [
  {
    id: "cod-porcelain-throne",
    title: "PORCELAIN",
    subtitle: "CORE OBJECTIVE PROP",
    bg0: "#344659",
    bg1: "#090A0D",
    fg: "#F7FAFF",
    accent: "#BFE7FF",
    body: `
  <g filter="url(#cod-porcelain-throne-shadow)" transform="translate(0 2)">
    <ellipse cx="256" cy="322" rx="116" ry="42" fill="#93AFCB" opacity="0.32"/>
    <path d="M166 190 C166 142 201 116 258 116 C315 116 350 142 350 190 L334 326 C328 370 300 390 258 390 C216 390 188 370 182 326 Z" fill="#EAF6FF"/>
    <path d="M188 186 C188 158 212 143 258 143 C304 143 328 158 328 186 C328 215 304 230 258 230 C212 230 188 215 188 186 Z" fill="#BFD8F5"/>
    <ellipse cx="258" cy="182" rx="49" ry="24" fill="#102535"/>
    <path d="M208 115 L212 78 C215 50 236 38 262 42 L337 54 C358 58 373 75 372 96 L368 142 C333 124 294 115 258 115 Z" fill="#F7FAFF"/>
    <path d="M224 74 C248 60 295 67 340 78" fill="none" stroke="#BFD8F5" stroke-width="12" stroke-linecap="round"/>
    <ellipse cx="224" cy="132" rx="26" ry="15" fill="url(#cod-porcelain-throne-shine)" opacity="0.8"/>
    <path d="M186 290 C220 315 296 315 330 290" fill="none" stroke="#7EA7CC" stroke-width="8" stroke-linecap="round" opacity="0.55"/>
  </g>`
  },
  {
    id: "cod-plunger-rocket",
    title: "PLUNGER",
    subtitle: "MID-RANGE JUSTICE",
    bg0: "#4B2416",
    bg1: "#080403",
    fg: "#FFD8B5",
    accent: "#FF7A30",
    body: `
  <g filter="url(#cod-plunger-rocket-shadow)" transform="rotate(-18 256 246)">
    <rect x="222" y="110" width="58" height="240" rx="24" fill="#7A421E"/>
    <rect x="238" y="126" width="18" height="206" rx="9" fill="#C47A36" opacity="0.78"/>
    <path d="M156 312 C164 258 200 230 254 230 C308 230 344 258 352 312 C318 344 190 344 156 312 Z" fill="#9B1D1D"/>
    <path d="M178 298 C216 318 292 318 330 298" fill="none" stroke="#F05A37" stroke-width="14" stroke-linecap="round" opacity="0.72"/>
    <ellipse cx="256" cy="232" rx="56" ry="18" fill="#5E0E0E"/>
    <path d="M284 120 C334 132 376 166 396 212" stroke="#FFD740" stroke-width="12" stroke-linecap="round" fill="none" opacity="0.8"/>
    <path d="M302 105 C363 118 414 160 438 220" stroke="#FF7A30" stroke-width="5" stroke-linecap="round" fill="none" opacity="0.85"/>
  </g>`
  },
  // cod-doodie-operative and cod-karen-nemesis (plain signature exports) were
  // retired in S155 — superseded by the v3/v2 runtime sprites below. Their
  // source SVGs remain in assets/source/signature-pack/ for provenance.
];

for (const asset of assets) {
  const svg = svgFrame(asset);
  const svgPath = path.join(sourceDir, `${asset.id}.svg`);
  const pngPath = path.join(runtimeDir, `${asset.id}.png`);
  fs.writeFileSync(svgPath, svg, "utf8");
  await sharp(Buffer.from(svg)).png({ compressionLevel: 9, quality: 100 }).toFile(pngPath);
  console.log(`Generated ${path.relative(ROOT, svgPath)} -> ${path.relative(ROOT, pngPath)}`);
}

const runtimeSprites = [
  // cod-doodie-operative-v2 retired in S155 (superseded by v3)
  ["cod-doodie-operative-v3-source.png", "cod-doodie-operative-v3.png", true],
  ["cod-karen-nemesis-v2-source.png", "cod-karen-nemesis-v2.png", false],
];
for (const [sourceName, runtimeName, removeGreen] of runtimeSprites) {
  const sourcePath = path.join(runtimeSpriteSourceDir, sourceName);
  const runtimePath = path.join(runtimeDir, runtimeName);
  let image = sharp(sourcePath);
  let transparencyNote = "source alpha";
  if (removeGreen) {
    const source = await image.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const keyed = removeChromaKey(source, { transparentThreshold: 12, opaqueThreshold: 220, despill: true });
    image = sharp(keyed.data, { raw: keyed.info });
    transparencyNote = `${keyed.receipt.transparentPixels} transparent pixels`;
  }
  await image
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .resize(384, 384, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 }, kernel: sharp.kernel.lanczos3 })
    .png({ compressionLevel: 9, palette: true, quality: 95 })
    .toFile(runtimePath);
  console.log(`Generated ${path.relative(ROOT, sourcePath)} -> ${path.relative(ROOT, runtimePath)} (${transparencyNote})`);
}

for (const atlas of Object.values(ENEMY_ATLAS_CONTRACT)) {
  const sourcePath = path.join(ROOT, atlas.sourcePath);
  const runtimePath = path.join(ROOT, atlas.runtimePath);
  const source = await sharp(sourcePath).raw().toBuffer({ resolveWithObject: true });
  const keyed = removeChromaKey(source, { transparentThreshold: 12, opaqueThreshold: 220, despill: true });
  await sharp(keyed.data, { raw: keyed.info })
    .webp({ quality: 84, alphaQuality: 92, effort: 6, smartSubsample: true })
    .toFile(runtimePath);
  if (keyed.receipt.transparentPixels === 0 || keyed.receipt.partialPixels === 0) {
    throw new Error(`${atlas.id} chroma-key matte is missing transparent or softened edge pixels`);
  }
  const bytes = fs.statSync(runtimePath).size;
  if (bytes > atlas.maxBytes) throw new Error(`${atlas.id} exceeds ${atlas.maxBytes} byte runtime budget (${bytes})`);
  const alphaReceipt = `${keyed.receipt.transparentPixels} transparent / ${keyed.receipt.partialPixels} softened`;
  console.log(`Generated ${path.relative(ROOT, sourcePath)} -> ${path.relative(ROOT, runtimePath)} (${bytes} bytes; ${alphaReceipt})`);
}


// S145 — repo-authored SVG object atlases (transparent source, no chroma key).
const objectAtlases = [
  { contract: WEAPON_ATLAS_CONTRACT, svg: buildWeaponAtlasSvg({ width: WEAPON_ATLAS_CONTRACT.width, height: WEAPON_ATLAS_CONTRACT.height, columns: WEAPON_ATLAS_CONTRACT.columns }) },
  { contract: WORLD_OBJECT_ATLAS_CONTRACT, svg: buildWorldObjectAtlasSvg({ width: WORLD_OBJECT_ATLAS_CONTRACT.width, height: WORLD_OBJECT_ATLAS_CONTRACT.height, columns: WORLD_OBJECT_ATLAS_CONTRACT.columns, cells: WORLD_OBJECT_CELLS }) },
  { contract: THEME_PROP_ATLAS_CONTRACT, svg: buildThemePropAtlasSvg({ width: THEME_PROP_ATLAS_CONTRACT.width, height: THEME_PROP_ATLAS_CONTRACT.height, columns: THEME_PROP_ATLAS_CONTRACT.columns, cells: THEME_PROP_CELLS }) },
  // S148 — Sewer Zombies mode-exclusive atlas, fixes zombies reusing the base enemy roster re-tinted.
  { contract: ZOMBIE_ATLAS_CONTRACT, svg: buildZombieAtlasSvg({ width: ZOMBIE_ATLAS_CONTRACT.width, height: ZOMBIE_ATLAS_CONTRACT.height, columns: ZOMBIE_ATLAS_CONTRACT.columns }) },
];
for (const { contract, svg } of objectAtlases) {
  const svgPath = path.join(ROOT, contract.sourcePath);
  const runtimePath = path.join(ROOT, contract.runtimePath);
  fs.mkdirSync(path.dirname(svgPath), { recursive: true });
  fs.writeFileSync(svgPath, svg, "utf8");
  await sharp(Buffer.from(svg))
    .resize(contract.width, contract.height, { fit: "fill" })
    .webp({ quality: 86, alphaQuality: 92, effort: 6, smartSubsample: true })
    .toFile(runtimePath);
  const bytes = fs.statSync(runtimePath).size;
  if (bytes > contract.maxBytes) throw new Error(`${contract.id} exceeds ${contract.maxBytes} byte runtime budget (${bytes})`);
  const metadata = await sharp(runtimePath).metadata();
  if (!metadata.hasAlpha) throw new Error(`${contract.id} lost alpha transparency during export`);
  console.log(`Generated ${path.relative(ROOT, svgPath)} -> ${path.relative(ROOT, runtimePath)} (${bytes} bytes)`);
}

console.log(`Generated ${assets.length + runtimeSprites.length + Object.keys(ENEMY_ATLAS_CONTRACT).length + objectAtlases.length} proprietary visual asset(s).`);
