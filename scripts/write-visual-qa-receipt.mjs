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
  themes: ["dark", "light"],
  captures,
  inspection: {
    renderedPixelsReviewed: true,
    reviewer: "Playwright rendered-pixel analytics and screenshot artifact court",
    findings: [
      `The source matrix passed ${audit.summary.passed}/${audit.summary.total} checks across ${audit.matrix.routes.length} routes, ${audit.matrix.themes.length} project themes, and ${audit.matrix.widths.join("px, ")}px widths.`,
      "Representative Home, identity, Modes, and Leaderboard captures are hash-bound across both themes and complementary desktop/mobile viewports.",
      "No horizontal overflow, clipped primary action, page error, or measured contrast failure remains in the source matrix.",
      ...(stateReceipt ? [`The expanded Replay Coverage Passport passed ${stateReceipt.summary.passed}/${stateReceipt.summary.checks} focused state checks at mobile and desktop in both themes.`] : []),
    ],
    fixesApplied: fixNotes.length ? fixNotes : ["No fix narrative supplied; the source matrix is authoritative."],
    blockingDefectsOpen: 0,
    subjectiveVisualReviewClaimed: false,
    subjectiveVisualReviewStatus: "unavailable-host-cryptunprotectdata",
  },
};
fs.writeFileSync(path.join(canonicalDir, "LATEST.json"), JSON.stringify(receipt, null, 2) + "\n");
console.log(`Visual QA receipt: PASS · ${captures.length} inspected captures · matrix ${audit.summary.passed}/${audit.summary.total}`);
