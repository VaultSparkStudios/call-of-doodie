#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const JSON_MODE = process.argv.includes("--json");
const maxTokensArg = process.argv.find((arg) => arg.startsWith("--max-tokens="));
const maxTokens = Number(maxTokensArg?.split("=")[1] || process.argv[process.argv.indexOf("--max-tokens") + 1]) || 30000;
const maxChars = Math.max(4000, maxTokens * 4);

const includeExt = new Set([".js", ".jsx", ".mjs", ".cjs", ".ts", ".tsx", ".json", ".md", ".css", ".html", ".yml", ".yaml"]);
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
  "src/App.launch.test.jsx",
  "tests/startup-brief-boxes.test.js",
  "context/CURRENT_STATE.md",
  "context/TASK_BOARD.md",
  "index.html",
];
const categoryOrder = ["manifest", "runtime", "systems", "ui", "tooling", "tests", "context", "public", "other"];

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

function categoryFor(relativePath) {
  if (/(\.test\.|\.spec\.)/.test(relativePath) || relativePath.startsWith("tests/")) return "tests";
  if (relativePath === "package.json" || relativePath.startsWith(".github/") || /^[^/]+\.(json|js|ts|yml|yaml)$/.test(relativePath)) return "manifest";
  if (relativePath.startsWith("src/systems/") || relativePath.startsWith("src/utils/") || relativePath.startsWith("src/hooks/")) return "systems";
  if (relativePath.startsWith("src/components/")) return "ui";
  if (relativePath.startsWith("src/")) return "runtime";
  if (relativePath.startsWith("scripts/")) return "tooling";
  if (relativePath.startsWith("context/") || relativePath.startsWith("docs/")) return "context";
  if (relativePath.startsWith("public/") || relativePath === "index.html") return "public";
  return "other";
}

function priorityRank(relativePath) {
  const index = priority.indexOf(relativePath);
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

function excerpt(text, budget) {
  if (text.length <= budget) {
    return { preview: text, truncated: false, ranges: [{ start: 0, end: text.length }] };
  }
  const marker = "\n\n… excerpt omitted …\n\n";
  const payload = Math.max(3, budget - marker.length * 2);
  const headSize = Math.floor(payload * 0.45);
  const middleSize = Math.floor(payload * 0.25);
  const tailSize = payload - headSize - middleSize;
  const middleStart = Math.max(headSize, Math.floor((text.length - middleSize) / 2));
  const tailStart = Math.max(middleStart + middleSize, text.length - tailSize);
  const ranges = [
    { start: 0, end: headSize },
    { start: middleStart, end: middleStart + middleSize },
    { start: tailStart, end: text.length },
  ];
  return {
    preview: [
      text.slice(ranges[0].start, ranges[0].end),
      text.slice(ranges[1].start, ranges[1].end),
      text.slice(ranges[2].start, ranges[2].end),
    ].join(marker).slice(0, budget),
    truncated: true,
    ranges,
  };
}

const files = walk(ROOT);
const queues = new Map(categoryOrder.map((category) => [category, []]));
for (const file of files) {
  const relativePath = rel(file);
  const category = categoryFor(relativePath);
  queues.get(category).push({ file, relativePath });
}
for (const queue of queues.values()) {
  queue.sort((a, b) => priorityRank(a.relativePath) - priorityRank(b.relativePath)
    || a.relativePath.localeCompare(b.relativePath));
}

const totals = Object.fromEntries(categoryOrder.map((category) => [category, queues.get(category).length]));
const perFileCap = Math.max(1200, Math.min(12000, Math.floor(maxChars / 10)));
let used = 0;
const samples = [];
let madeProgress = true;
while (used < maxChars && madeProgress) {
  madeProgress = false;
  for (const category of categoryOrder) {
    const next = queues.get(category).shift();
    if (!next) continue;
    madeProgress = true;
    const remaining = maxChars - used;
    if (remaining < 600 && samples.length > 0) break;
    const text = fs.readFileSync(next.file, "utf8");
    const budget = Math.min(text.length, perFileCap, remaining);
    const sampled = excerpt(text, budget);
    samples.push({
      path: next.relativePath,
      category,
      bytes: Buffer.byteLength(text),
      lines: text.split(/\r?\n/).length,
      previewChars: sampled.preview.length,
      truncated: sampled.truncated,
      excerptRanges: sampled.ranges,
      preview: sampled.preview,
    });
    used += sampled.preview.length;
    if (used >= maxChars) break;
  }
}

const coverage = Object.fromEntries(categoryOrder.map((category) => {
  const sampled = samples.filter((item) => item.category === category).length;
  return [category, { sampled, total: totals[category], omitted: totals[category] - sampled }];
}));

const result = {
  schemaVersion: "2.0",
  maxTokens,
  maxChars,
  perFileCap,
  sampledFiles: samples.length,
  approxChars: used,
  coverage,
  omittedFiles: files.length - samples.length,
  samples,
};

if (JSON_MODE) console.log(JSON.stringify(result, null, 2));
else {
  console.log("Codebase Sample");
  console.log("===============");
  for (const sample of samples) console.log(`- ${sample.path} (${sample.lines} lines, ${sample.bytes} bytes)`);
}
