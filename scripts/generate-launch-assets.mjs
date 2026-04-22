import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = process.cwd();
const assetsDir = path.join(ROOT, "public", "launch-assets");

if (!fs.existsSync(assetsDir)) {
  console.error("Launch assets directory not found:", assetsDir);
  process.exit(1);
}

const svgFiles = fs.readdirSync(assetsDir)
  .filter((name) => name.endsWith(".svg"))
  .sort();

if (svgFiles.length === 0) {
  console.error("No SVG launch assets found.");
  process.exit(1);
}

for (const file of svgFiles) {
  const srcPath = path.join(assetsDir, file);
  const destPath = path.join(assetsDir, file.replace(/\.svg$/i, ".png"));
  await sharp(srcPath)
    .png({ compressionLevel: 9, quality: 100 })
    .toFile(destPath);
  console.log(`✓ ${path.basename(destPath)}`);
}

console.log(`Generated ${svgFiles.length} launch PNG asset(s).`);
