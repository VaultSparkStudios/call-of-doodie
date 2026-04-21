#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function read(relPath, fallback = "") {
  try { return fs.readFileSync(path.join(ROOT, relPath), "utf8"); } catch { return fallback; }
}

function match(text, pattern, fallback = "unknown") {
  return text.match(pattern)?.[1]?.trim() || fallback;
}

function section(text, heading) {
  return text.match(new RegExp(`## ${heading}\\s+([\\s\\S]*?)(?:\\n## |\\n$)`))?.[1]?.trim() || "";
}

const status = JSON.parse(read("context/PROJECT_STATUS.json", "{}"));
const sil = read("context/SELF_IMPROVEMENT_LOOP.md");
const board = read("context/TASK_BOARD.md");
const handoff = read("context/LATEST_HANDOFF.md");
const currentState = read("context/CURRENT_STATE.md");
const truth = read("context/TRUTH_AUDIT.md");

const nowItems = section(board, "Now").split(/\r?\n/).filter(line => line.trim().startsWith("- [ ]")).slice(0, 6);
const handoffLine = match(handoff, /## Where We Left Off \((.*?)\)/, "latest handoff");
const shipped = match(handoff, /- Shipped:\s*(.*)/, "see LATEST_HANDOFF");
const tests = match(handoff, /- Tests:\s*(.*)/, "see LATEST_HANDOFF");
const deploy = match(handoff, /- Deploy:\s*(.*)/, "unknown");
const lastSession = match(sil, /Last session:\s*([0-9-]+)/, status.silLastSession || "unknown");
const silMax = Number(status.silMax || 1000);
const score = Number(status.silScore || match(sil, new RegExp(`Total:\\s*(\\d+)\\/${silMax}`), 0) || match(sil, /Total:\s*(\d+)\/500/, 0));
const avg3 = Number(status.silAvg3 || match(sil, /Avgs .*?3:\s*([0-9.]+)/, 0));
const runway = match(sil, /Momentum runway:\s*~?([0-9.]+ sessions)/, "unknown");
const contextAge = match(currentState, /last updated:\s*([0-9-]+)/i, status.lastUpdated || "unknown");
const truthStatus = status.truthAuditStatus || match(truth, /Overall status:\s*(.*)/, "unknown");

const lines = [
  "╔══════════════════════════════════════════════════════════════════╗",
  `║  STARTUP BRIEF  ·  ${status.name || "Call-Of-Doodie"}`.padEnd(67) + "║",
  `║  ${new Date().toISOString().slice(0, 10)}  ·  Session ${status.currentSession || "?"}  ·  ${(status.sessionMode || "builder").toUpperCase()} MODE`.padEnd(67) + "║",
  `║  returning  ·  ${status.lifecycle || "unknown"}/${status.audience || "unknown"}  ·  VaultSpark Studios`.padEnd(67) + "║",
  "╚══════════════════════════════════════════════════════════════════╝",
  "",
  "╔══ SCORE ═════════════════════════════════════════════════════════╗",
  `║  ${score}/${silMax}  ·  Avg3: ${avg3}  ·  Last session: ${lastSession}`.padEnd(67) + "║",
  `║  IGNIS ${status.ignisScore || "unknown"} ${status.ignisGrade || ""}  ·  Entropy ${status.entropyScore ?? "unknown"}  ·  Runway ${runway}`.padEnd(67) + "║",
  "╚══════════════════════════════════════════════════════════════════╝",
  "",
  `╔══ WHERE WE LEFT OFF · ${handoffLine} ════════════════════════════╗`,
  `║  Shipped: ${shipped}`.slice(0, 66).padEnd(67) + "║",
  `║  Tests: ${tests}`.slice(0, 66).padEnd(67) + "║",
  `║  Deploy: ${deploy}`.slice(0, 66).padEnd(67) + "║",
  "╚══════════════════════════════════════════════════════════════════╝",
  "",
  "╔══ SIGNALS ═══════════════════════════════════════════════════════╗",
  `║  Truth: ${truthStatus}  ·  Context: ${contextAge}  ·  Mode: ${status.sessionMode || "builder"}`.padEnd(67) + "║",
  `║  Focus: ${(status.currentFocus || "see PROJECT_STATUS").slice(0, 54)}`.padEnd(67) + "║",
  "╚══════════════════════════════════════════════════════════════════╝",
  "",
  `╔══ NOW BUCKET (${nowItems.length} shown) ═════════════════════════════════════╗`,
  ...nowItems.map((item, index) => `║  ${index + 1}. ${item.replace(/^- \[ \]\s*/, "")}`.slice(0, 66).padEnd(67) + "║"),
  "╚══════════════════════════════════════════════════════════════════╝",
  "",
  "IGNIS INSIGHT: Current project signal favors execution-quality refinement over broad feature count.",
  "CANON CHECK: Proprietary-first public repo rules still apply; keep internal ops detail out of this repository.",
].join("\n");

fs.mkdirSync(path.join(ROOT, "docs"), { recursive: true });
fs.writeFileSync(path.join(ROOT, "docs/STARTUP_BRIEF.md"), lines + "\n", "utf8");
console.log(lines);
