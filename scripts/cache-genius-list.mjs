#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const CACHE = path.join(ROOT, ".cache", "genius-list.json");
const WRITE = process.argv.includes("--write");
const CHECK = process.argv.includes("--check");
const BRIEF = process.argv.includes("--brief");
const topArg = process.argv.find((arg) => arg.startsWith("--top="));
const topIndex = process.argv.indexOf("--top");
const top = Number(topArg?.split("=")[1] || (topIndex >= 0 ? process.argv[topIndex + 1] : null) || 5);
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

function readSection(file, heading) {
  if (!fs.existsSync(file)) return "";
  const text = fs.readFileSync(file, "utf8");
  return text.match(new RegExp(`## ${heading}\\s+([\\s\\S]*?)(?:\\n## |\\n$)`))?.[1] || "";
}

function generate() {
  const board = path.join(ROOT, "context", "TASK_BOARD.md");
  const now = readSection(board, "Now");
  const deferred = readSection(board, "Deferred");
  const open = [...now.split(/\r?\n/), ...deferred.split(/\r?\n/)]
    .filter((line) => line.trim().startsWith("- [ ]"))
    .slice(0, top)
    .map((line, index) => ({
      rank: index + 1,
      slug: line.replace(/^- \[ \]\s*/, "").replace(/[`*_#[\]]/g, "").slice(0, 72).trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `item-${index + 1}`,
      title: line.replace(/^- \[ \]\s*/, "").trim(),
      axis: /protocol|script|startup|closeout/i.test(line) ? "protocol" : /qa|input|gamepad/i.test(line) ? "launch-qa" : "product",
      insight: "Open project work remains in the public-safe task board. Treat human-only items as founder gates and prefer repo-executable work first.",
      evidence: "context/TASK_BOARD.md",
    }));
  return {
    schemaVersion: "1.0",
    generatedAt: new Date().toISOString(),
    repo: "call-of-doodie",
    items: open.length ? open : [{
      rank: 1,
      slug: "maintain-launch-confidence",
      title: "Maintain launch confidence with protocol, test, and build verification.",
      axis: "protocol",
      insight: "No open repo-executable Now items were found. The next best move is preserving the verified launch baseline and avoiding false blockers.",
      evidence: "context/TASK_BOARD.md",
    }],
  };
}

function isFresh() {
  if (!fs.existsSync(CACHE)) return false;
  return Date.now() - fs.statSync(CACHE).mtimeMs < MAX_AGE_MS;
}

if (CHECK) {
  if (isFresh()) process.exit(0);
  process.exit(1);
}

let data;
if (WRITE || !isFresh()) {
  data = generate();
  fs.mkdirSync(path.dirname(CACHE), { recursive: true });
  fs.writeFileSync(CACHE, `${JSON.stringify(data, null, 2)}\n`);
} else {
  data = JSON.parse(fs.readFileSync(CACHE, "utf8"));
}

if (BRIEF) {
  for (const item of data.items.slice(0, top)) console.log(`${item.rank}. ${item.title}`);
} else {
  console.log(JSON.stringify(data, null, 2));
}
