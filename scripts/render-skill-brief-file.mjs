#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { renderAndArchive } from "./lib/skill-brief.mjs";

function argValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

const input = argValue("--input");
if (!input) {
  console.error("Usage: node scripts/render-skill-brief-file.mjs --input <brief.json> [--action-gate <text>]");
  process.exit(2);
}

const inputPath = path.resolve(process.cwd(), input);
const brief = JSON.parse(fs.readFileSync(inputPath, "utf8"));
const result = renderAndArchive(brief, {
  docsDir: argValue("--docs-dir") || "docs",
  actionGate: argValue("--action-gate") || undefined,
});

console.log(result.text);
console.log(`\nArchived: ${path.relative(process.cwd(), result.path)}`);
