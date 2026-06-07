#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function arg(name) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : null;
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function lineItem(item) {
  return `| ${item.title} | ${item.projectImpact} | ${item.ecosystemImpact} | ${item.evidence} |`;
}

function render(input) {
  const shipped = Array.isArray(input.items) ? input.items : [];
  const validation = Array.isArray(input.validation) ? input.validation : [];
  const followUps = Array.isArray(input.followUps) ? input.followUps : [];
  const blockers = Array.isArray(input.blockers) ? input.blockers : [];
  const lines = [
    `# Closeout Brief - Session ${input.session} - ${input.date}`,
    "",
    `Headline: ${input.headline}`,
    "",
    "## Shipped",
    "",
    "| Item | Project Impact | Ecosystem Impact | Evidence |",
    "|---|---:|---:|---|",
    ...shipped.map(lineItem),
    "",
    "## Validation",
    "",
    ...(validation.length ? validation.map((item) => `- ${item}`) : ["- No validation recorded."]),
    "",
    "## Remaining",
    "",
    ...(followUps.length ? followUps.map((item) => `- ${item}`) : ["- No follow-ups recorded."]),
    ...(blockers.length ? ["", "## Blockers", "", ...blockers.map((item) => `- ${item}`)] : []),
    "",
  ];
  return lines.join("\n");
}

const inputPath = arg("--input");
if (!inputPath) {
  console.error("Usage: node scripts/render-closeout-brief.mjs --input <json>");
  process.exit(1);
}

const input = readJson(path.resolve(ROOT, inputPath));
const date = input.date || new Date().toISOString().slice(0, 10);
const session = input.session || "local";
const outputPath = path.join(ROOT, "docs", `CLOSEOUT_BRIEF_${session}_${date}.md`);
const markdown = render(input);

fs.writeFileSync(outputPath, markdown, "utf8");
console.log(markdown);
console.log(`Wrote ${path.relative(ROOT, outputPath)}`);
