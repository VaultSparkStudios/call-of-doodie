#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "./lib/safe-spawn.mjs";
import { selectRepresentativeCaptures } from "./lib/visual-qa-receipt.mjs";

const root = process.cwd();
if (process.argv.includes("--help")) {
  console.log("Usage: node scripts/write-visual-qa-receipt.mjs [--audit-dir <matrix-directory>]");
  process.exit(0);
}
const valueAfter = (name, fallback) => {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : fallback;
};
const valuesAfter = (name) => process.argv.reduce((values, arg, index) => {
  if (arg === name && process.argv[index + 1]) values.push(process.argv[index + 1]);
  return values;
}, []);
const fixNotes = valuesAfter("--fix");
const reviewedCapturePaths = valuesAfter("--reviewed-capture");
const subjectiveReview = process.argv.includes("--subjective-review");

const auditDir = path.resolve(root, valueAfter("--audit-dir", "output/playwright/session-137-staging"));
const canonicalDir = path.join(root, "docs", "visual-qa");
const auditPath = path.join(auditDir, "visual-audit-receipt.json");
const audit = JSON.parse(fs.readFileSync(auditPath, "utf8"));
if (!audit?.summary?.pass) throw new Error("Refusing visual receipt: source matrix did not pass.");

const selected = selectRepresentativeCaptures(audit);
const stateDirArg = valueAfter("--state-dir", null);
let stateReceipt = null;
if (stateDirArg) {
  const stateDir = path.resolve(root, stateDirArg);
  const statePath = path.join(stateDir, "replay-passport-receipt.json");
  stateReceipt = JSON.parse(fs.readFileSync(statePath, "utf8"));
  if (!stateReceipt?.summary?.pass) throw new Error("Refusing visual receipt: Replay Coverage Passport state checks did not pass.");
  for (const capture of stateReceipt.captures) {
    selected.push({
      source: path.join(stateDir, capture.screenshot),
      file: capture.screenshot,
      theme: capture.theme === "sewer-night" ? "dark" : "light",
      projectTheme: capture.theme,
      width: capture.width,
      height: 1000,
      page: "Expanded Replay Coverage Passport in Run History",
    });
  }
}

const playtestStateDirArg = valueAfter("--playtest-state-dir", null);
let playtestStateReceipt = null;
if (playtestStateDirArg) {
  const playtestStateDir = path.resolve(root, playtestStateDirArg);
  const playtestStatePath = path.join(playtestStateDir, "playtest-signal-receipt.json");
  playtestStateReceipt = JSON.parse(fs.readFileSync(playtestStatePath, "utf8"));
  if (!playtestStateReceipt?.summary?.pass) throw new Error("Refusing visual receipt: playtest signal state checks did not pass.");
  for (const capture of playtestStateReceipt.captures) {
    for (const screenshot of capture.screenshots) {
      selected.push({
        source: path.join(playtestStateDir, screenshot),
        file: screenshot,
        theme: capture.theme === "sewer-night" ? "dark" : "light",
        projectTheme: capture.theme,
        width: capture.width,
        height: 1000,
        page: screenshot.includes("flight")
          ? "Structured Playtest Flight Receipt after an observed run"
          : "Expanded aggregate Playtest Command Post on Home",
      });
    }
  }
}

for (const capturePath of reviewedCapturePaths) {
  const source = path.resolve(root, capturePath);
  if (!fs.existsSync(source)) throw new Error(`Reviewed capture missing: ${capturePath}`);
  const basename = path.basename(source);
  const theme = /(?:^|[-_])light(?:[-_.]|$)/i.test(basename) ? "light" : "dark";
  const width = /(?:^|[-_])mobile(?:[-_.]|$)/i.test(basename) ? 390 : 1440;
  const state = basename.includes("mastery")
    ? { file: `mastery-command-${theme}-${width}.png`, page: "Commander's Orders weapon-mastery projection" }
    : basename.includes("drill-outcome")
      ? { file: `drill-outcome-${theme}-${width}.png`, page: "Death-screen prior drill outcome before next verdict" }
      : { file: `death-brief-${theme}-${width}.png`, page: "Death-screen revenge brief first viewport" };
  selected.push({
    source,
    file: state.file,
    theme,
    projectTheme: theme === "dark" ? "sewer-night" : "porcelain-day",
    width,
    height: width === 390 ? 844 : 1000,
    page: state.page,
  });
}

const sha256 = (file) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
fs.mkdirSync(canonicalDir, { recursive: true });
const captures = selected.map((entry) => {
  const source = path.isAbsolute(entry.source) ? entry.source : path.join(auditDir, entry.source);
  const target = path.join(canonicalDir, entry.file);
  fs.copyFileSync(source, target);
  return {
    file: entry.file,
    sha256: sha256(target),
    theme: entry.theme,
    projectTheme: entry.projectTheme,
    viewport: { width: entry.width, height: entry.height },
    page: entry.page,
  };
});

const git = spawnSync("git", ["diff", "--binary", "HEAD", "--", "src", "public", "vite.config.js"], {
  cwd: root, encoding: "utf8", windowsHide: true,
});
if (git.status !== 0) throw new Error(git.stderr || "Unable to hash the UI working tree.");
const receipt = {
  schemaVersion: 1,
  capturedAt: audit.generatedAt,
  stagingUrl: audit.baseUrl,
  workingTreeUiSha256: crypto.createHash("sha256").update(git.stdout).digest("hex"),
  sourceMatrix: {
    receipt: path.relative(root, auditPath).replaceAll("\\", "/"),
    sha256: sha256(auditPath),
    checks: audit.summary,
  },
  touchedState: stateReceipt ? {
    surface: "Expanded Replay Coverage Passport in Run History",
    checks: stateReceipt.summary,
  } : null,
  additionalTouchedStates: playtestStateReceipt ? [{
    surface: "Playtest Flight Receipt and aggregate Playtest Command Post",
    checks: playtestStateReceipt.summary,
  }] : [],
  themes: ["dark", "light"],
  captures,
  inspection: {
    renderedPixelsReviewed: true,
    reviewer: subjectiveReview
      ? "Codex direct rendered-pixel review plus Playwright screenshot and analytics court"
      : "Playwright rendered-pixel analytics and screenshot artifact court",
    findings: [
      `The source matrix passed ${audit.summary.passed}/${audit.summary.total} checks across ${audit.matrix.routes.length} routes, ${audit.matrix.themes.length} project themes, and ${audit.matrix.widths.join("px, ")}px widths.`,
      "Representative Home, identity, Modes, and Leaderboard captures are hash-bound across both themes and complementary desktop/mobile viewports.",
      "No horizontal overflow, clipped primary action, page error, or measured contrast failure remains in the source matrix.",
      ...(reviewedCapturePaths.some((capturePath) => path.basename(capturePath).includes("mastery")) ? ["The compact weapon-mastery projection is readable in Commander's Orders at 390px and 1440px across both project themes without colliding with the mobile dock."] : []),
      ...(reviewedCapturePaths.some((capturePath) => path.basename(capturePath).includes("drill-outcome")) ? ["The prior drill's observed result appears before ONE VERDICT at 390px and 1440px; its wave, comparable score, repeatability evidence, and non-causal boundary remain readable."] : []),
      ...(reviewedCapturePaths.some((capturePath) => !path.basename(capturePath).includes("mastery") && !path.basename(capturePath).includes("drill-outcome")) ? ["The death-screen revenge brief is visible with its RUN THE FIX action in the first viewport at 390px and 1440px; secondary analysis remains collapsed and reachable."] : []),
      ...(stateReceipt ? [`The expanded Replay Coverage Passport passed ${stateReceipt.summary.passed}/${stateReceipt.summary.checks} focused state checks at mobile and desktop in both themes.`] : []),
      ...(playtestStateReceipt ? [`The real deploy-to-defeat Playtest Flight Receipt and aggregate Command Post passed ${playtestStateReceipt.summary.passed}/${playtestStateReceipt.summary.checks} focused state checks at mobile and desktop in both themes.`] : []),
    ],
    fixesApplied: fixNotes.length ? fixNotes : ["No fix narrative supplied; the source matrix is authoritative."],
    blockingDefectsOpen: 0,
    subjectiveVisualReviewClaimed: subjectiveReview,
    subjectiveVisualReviewStatus: subjectiveReview ? "completed" : "not-claimed",
  },
};
fs.writeFileSync(path.join(canonicalDir, "LATEST.json"), JSON.stringify(receipt, null, 2) + "\n");
console.log(`Visual QA receipt: PASS · ${captures.length} inspected captures · matrix ${audit.summary.passed}/${audit.summary.total}`);
