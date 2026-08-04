#!/usr/bin/env node

// Usage: node scripts/ops.mjs <command> [args...]
// Project-local command router; `help` is always side-effect free.

import { spawnSync } from "./lib/safe-spawn.mjs";
import { dedupeInnovationCandidates } from "./lib/innovation-candidates.mjs";
import { syncDoctorScore } from "./lib/doctor-score-sync.mjs";
import { collectTaskWork, slugifyTask } from "./lib/task-work.mjs";
import { parseSectionCheckboxItems } from "./lib/task-board.mjs";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const STUDIO_OPS = path.resolve(ROOT, "..", "vaultspark-studio-ops", "scripts", "ops.mjs");

const [, , command, ...args] = process.argv;

function runNode(script, extraArgs = []) {
  const result = spawnSync(process.execPath, [script, ...extraArgs], {
    cwd: ROOT,
    stdio: "inherit",
  });
  process.exit(result.status ?? 1);
}

function runDoctor(extraArgs = []) {
  const result = spawnSync(process.execPath, [STUDIO_OPS, "doctor", ...extraArgs], {
    cwd: ROOT,
    stdio: "inherit",
  });
  if ((result.status ?? 1) === 0 && extraArgs.includes("--update-json")) {
    const sourceStatusPath = path.resolve(ROOT, "..", "vaultspark-studio-ops", "context", "PROJECT_STATUS.json");
    const targetStatusPath = path.join(ROOT, "context", "PROJECT_STATUS.json");
    try {
      syncDoctorScore({ sourceStatusPath, targetStatusPath });
      process.stderr.write("✓ synced doctorScore to this project's context/PROJECT_STATUS.json\n");
    } catch (error) {
      process.stderr.write(`⛔ doctor passed but local doctorScore sync failed: ${error.message}\n`);
      process.exit(1);
    }
  }
  process.exit(result.status ?? 1);
}

function printHelp() {
  console.log(`Usage: node scripts/ops.mjs <command> [args...]

Commands:
  action-queue     Print the current Now queue from context/TASK_BOARD.md
  blocker-preflight  Check human-blocked items against local secret readiness
  closeout, c      Project-local closeout autopilot
  doctor           Proxy to Studio Ops doctor for project health checks
  feedback-score   Proxy to Studio Ops feedback-score
  genius-list      Generate or print the cached local genius list
  innovation-pack  Write docs/INNOVATION_PACK.md from repo-local open work and genius signals
  onboard          Verify local startup tooling exists; use --repair --write to report repair state
  rescore          Proxy the authoritative IGNIS rescore command
  router           Run the local intent router (for example: router suggest --json)
  help             Show this help`);
}

function readText(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), "utf8");
}

function printActionQueue() {
  const board = readText("context/TASK_BOARD.md");
  const items = parseSectionCheckboxItems(board, "Now");
  console.log("Action Queue");
  console.log("============");
  if (items.length === 0) {
    console.log("No open Now items found.");
    return;
  }
  items.forEach((item, index) => {
    console.log(`${index + 1}. ${item.body}`);
  });
}


function collectOpenTasks() {
  const board = readText("context/TASK_BOARD.md");
  return collectTaskWork(board).map((item) => ({
    slug: item.slug,
    title: item.title,
    source: item.source,
    axis: item.axis,
    status: item.status,
    executable: item.executable,
    reason: item.reason,
  }));
}

function innovationPack() {
  const cacheScript = path.join(__dirname, "cache-genius-list.mjs");
  spawnSync(process.execPath, [cacheScript, "--write"], { cwd: ROOT, stdio: "ignore" });
  const cachePath = path.join(ROOT, ".cache", "genius-list.json");
  const genius = fs.existsSync(cachePath) ? JSON.parse(fs.readFileSync(cachePath, "utf8")) : { items: [] };
  const allTaskItems = collectOpenTasks();
  const taskItems = allTaskItems.filter((item) => item.executable);
  const allGeniusItems = (genius.items || []).map((item) => ({
    slug: item.slug || slugifyTask(item.title || item.insight || "genius-item"),
    title: item.title || item.insight || "Maintain launch confidence.",
    source: item.evidence || ".cache/genius-list.json",
    axis: item.axis || "protocol",
    status: item.status || "unblocked",
    executable: item.executable !== false,
    reason: item.reason || "Repo-owned work.",
  }));
  const geniusItems = allGeniusItems.filter((item) => item.executable);
  const deferredItems = dedupeInnovationCandidates([
    ...allTaskItems.filter((item) => !item.executable),
    ...allGeniusItems.filter((item) => !item.executable),
  ], 12);
  const items = dedupeInnovationCandidates([...taskItems, ...geniusItems], 8);

  const generatedAt = new Date().toISOString();
  const lines = [
    "<!-- generated-by: node scripts/ops.mjs innovation-pack -->",
    `<!-- generated-at: ${generatedAt} -->`,
    "",
    "# Innovation Pack — Call-Of-Doodie",
    "",
    "> Repo-local second-order candidate list for `/implement` saturation loops.",
    "",
    "## Ranked Candidates",
    "",
  ];
  if (items.length === 0) {
    lines.push("- No repo-local candidates found. Maintain launch confidence with tests, build, and protocol checks.");
  } else {
    items.forEach((item, index) => {
      lines.push(`${index + 1}. **${item.slug}** — ${item.title}`);
      lines.push(`   - Axis: ${item.axis}`);
      lines.push(`   - Evidence: ${item.source}`);
      lines.push(`   - First step: verify the premise in source, then write a fresh \`docs/AUDIT_<date>.json\` item before implementation.`);
    });
  }
  lines.push("");
  lines.push("## Deferred Evidence");
  lines.push("");
  if (deferredItems.length === 0) lines.push("- No external or decision-gated work is currently open.");
  else deferredItems.forEach((item) => lines.push("- **" + item.status + "** - " + item.title + " (" + item.reason + ")"));
  lines.push("");
  lines.push("## Guardrails");
  lines.push("");
  lines.push("- Treat human/device/dashboard items as launch gates, not repo-code blockers.");
  lines.push("- Keep replay, leaderboard, and submission trust language evidence-backed.");
  lines.push("- Prefer local deterministic helpers over paid API or per-user variable cost.");
  lines.push("");

  const outPath = path.join(ROOT, "docs", "INNOVATION_PACK.md");
  fs.writeFileSync(outPath, `${lines.join("\n")}`);
  console.log(`Innovation pack written: ${path.relative(ROOT, outPath).replace(/\\/g, "/")}`);
}

function onboard() {
  const repair = args.includes("--repair") && args.includes("--write");
  const required = [
    "scripts/render-startup-brief.mjs",
    "scripts/validate-brief-format.mjs",
    "scripts/lib/brief-blocks.mjs",
    "scripts/lib/task-board.mjs",
    "scripts/lib/cross-repo-tasks.mjs",
    "scripts/lib/ignis-insight.mjs",
    "scripts/lib/human-action-ages.mjs",
  ];
  const missing = required.filter(rel => !fs.existsSync(path.join(ROOT, rel)));
  if (missing.length === 0) {
    console.log("Onboard check passed: startup renderer and validator exist.");
    return;
  }
  console.log(`Onboard check found missing files: ${missing.join(", ")}`);
  if (repair) {
    console.log("Repair requested, but this project keeps generated tooling source-controlled. Add the missing files in-repo.");
  }
  process.exit(1);
}

switch (command) {
  case "action-queue":
    printActionQueue();
    break;
  case "blocker-preflight":
    runNode(path.join(__dirname, "blocker-preflight.mjs"), args);
  case "c":
  case "closeout":
    runNode(path.join(__dirname, "closeout-autopilot.mjs"), args);
    break;
  case "doctor":
    runDoctor(args);
    break;
  case "feedback-score":
    runNode(STUDIO_OPS, ["feedback-score", ...args]);
    break;
  case "genius-list":
    runNode(path.join(__dirname, "cache-genius-list.mjs"), ["--write", ...args]);
    break;
  case "innovation-pack":
    innovationPack();
    break;
  case "onboard":
    onboard();
    break;
  case "rescore":
    runNode(path.join(ROOT, "..", "vaultspark-studio-ops", "scripts", "rescore-ignis.mjs"), args);
    break;
  case "router":
    runNode(path.join(__dirname, "router.mjs"), args);
    break;
  case "help":
  case "--help":
  case undefined:
    printHelp();
    break;
  default:
    console.error(`Unknown command: ${command}`);
    printHelp();
    process.exit(1);
}
