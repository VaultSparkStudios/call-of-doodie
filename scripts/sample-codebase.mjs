#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const JSON_MODE = process.argv.includes("--json");
const maxTokensArg = process.argv.find((arg) => arg.startsWith("--max-tokens="));
const maxTokens = Number(maxTokensArg?.split("=")[1] || process.argv[process.argv.indexOf("--max-tokens") + 1]) || 30000;
const maxChars = Math.max(4000, maxTokens * 4);

const includeExt = new Set([".js", ".jsx", ".ts", ".tsx", ".json", ".md", ".css", ".html"]);
const skipParts = new Set(["node_modules", "dist", "coverage", ".git", ".cache"]);
const priority = [
  "package.json",
  "vite.config.js",
  "src/App.jsx",
  "src/systems/waveDirector.js",
  "src/components/DeathScreen.jsx",
  "src/storage.js",
  "scripts/ops.mjs",
  "scripts/protocol-drift-check.mjs",
  "context/CURRENT_STATE.md",
  "context/TASK_BOARD.md",
];

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (skipParts.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (includeExt.has(path.extname(entry.name))) out.push(full);
  }
  return out;
}

function rel(file) {
  return path.relative(ROOT, file).replace(/\\/g, "/");
}

const files = walk(ROOT).sort((a, b) => {
  const ar = rel(a);
  const br = rel(b);
  const ap = priority.indexOf(ar);
  const bp = priority.indexOf(br);
  if (ap !== -1 || bp !== -1) return (ap === -1 ? 999 : ap) - (bp === -1 ? 999 : bp);
  return fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs;
});

let used = 0;
const samples = [];
for (const file of files) {
  if (used >= maxChars) break;
  const text = fs.readFileSync(file, "utf8");
  const budget = Math.min(text.length, Math.max(600, maxChars - used));
  samples.push({
    path: rel(file),
    bytes: Buffer.byteLength(text),
    lines: text.split(/\r?\n/).length,
    preview: text.slice(0, budget),
  });
  used += budget;
}

const result = {
  schemaVersion: "1.0",
  maxTokens,
  sampledFiles: samples.length,
  approxChars: used,
  samples,
};

if (JSON_MODE) console.log(JSON.stringify(result, null, 2));
else {
  console.log("Codebase Sample");
  console.log("===============");
  for (const sample of samples) console.log(`- ${sample.path} (${sample.lines} lines, ${sample.bytes} bytes)`);
}
