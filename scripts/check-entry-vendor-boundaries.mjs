#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const htmlPath = path.join(root, "dist", "index.html");
if (!fs.existsSync(htmlPath)) {
  console.error("dist/index.html missing — run npm run build first");
  process.exit(2);
}

const html = fs.readFileSync(htmlPath, "utf8");
const preloads = [...html.matchAll(/rel=["']modulepreload["'][^>]*href=["']([^"']+)["']/gi)].map((match) => match[1]);
const forbidden = preloads.filter((href) => /vendor-(?:data|observability)/i.test(href));
if (forbidden.length) {
  console.error(`Entry vendor boundary failed — optional clients are preloaded: ${forbidden.join(", ")}`);
  process.exit(1);
}
console.log(`Entry vendor boundary: PASS · ${preloads.length} static preload(s) · optional data/observability clients remain interaction-gated`);
