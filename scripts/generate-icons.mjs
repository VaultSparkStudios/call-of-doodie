#!/usr/bin/env node
// Build-time SVG → PNG icon generator.
// Reads public/icon.svg and writes public/icon-192.png + public/icon-512.png.
// Skips work when the PNGs are newer than the source SVG (so repeat builds are cheap).

import { readFile, writeFile, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = resolve(__dirname, "..", "public");
const sourcePath = resolve(publicDir, "icon.svg");

const targets = [
  { out: resolve(publicDir, "icon-192.png"), size: 192 },
  { out: resolve(publicDir, "icon-512.png"), size: 512 },
];

async function mtime(path) {
  try {
    return (await stat(path)).mtimeMs;
  } catch {
    return 0;
  }
}

async function main() {
  const sourceMtime = await mtime(sourcePath);
  if (!sourceMtime) {
    console.error(`[generate-icons] source not found: ${sourcePath}`);
    process.exit(1);
  }

  const svg = await readFile(sourcePath);

  let generated = 0;
  for (const { out, size } of targets) {
    const outMtime = await mtime(out);
    if (outMtime >= sourceMtime) {
      continue;
    }
    const buf = await sharp(svg, { density: 384 })
      .resize(size, size, { fit: "contain", background: { r: 10, g: 10, b: 10, alpha: 1 } })
      .png({ compressionLevel: 9 })
      .toBuffer();
    await writeFile(out, buf);
    generated += 1;
    console.log(`[generate-icons] wrote ${out} (${size}x${size}, ${buf.length} bytes)`);
  }

  if (generated === 0) {
    console.log("[generate-icons] PNGs up to date — no work.");
  }
}

main().catch((err) => {
  console.error("[generate-icons] failed:", err);
  process.exit(1);
});
