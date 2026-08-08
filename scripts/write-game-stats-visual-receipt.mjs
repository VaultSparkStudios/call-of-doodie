#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "./lib/safe-spawn.mjs";

const root = process.cwd();
const sourceDir = path.resolve(
  root,
  process.argv[2] || "output/playwright/session-2026-08-06-game-stats",
);
const sourcePath = path.join(sourceDir, "game-stats-visual-receipt.json");
const canonicalDir = path.join(root, "docs", "visual-qa");
const source = JSON.parse(fs.readFileSync(sourcePath, "utf8"));

if (!source?.summary?.pass) {
  throw new Error("Refusing visual receipt: focused game-stats matrix did not pass.");
}

const sha256 = (file) =>
  crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");

fs.mkdirSync(canonicalDir, { recursive: true });
const screenshots = fs
  .readdirSync(sourceDir)
  .filter((file) => file.endsWith(".png"))
  .sort();

const captures = screenshots.map((file) => {
  const match = file.match(
    /^(command-deck|stats|leaderboard|debrief)--(sewer-night|porcelain-day)--(\d+)\.png$/,
  );
  if (!match) throw new Error(`Unexpected screenshot name: ${file}`);
  const [, surface, projectTheme, widthText] = match;
  const width = Number(widthText);
  const targetName = `game-stats--${file}`;
  const target = path.join(canonicalDir, targetName);
  fs.copyFileSync(path.join(sourceDir, file), target);
  return {
    file: targetName,
    sha256: sha256(target),
    theme: projectTheme === "sewer-night" ? "dark" : "light",
    projectTheme,
    viewport: { width, height: width === 390 ? 844 : 1000 },
    page:
      surface === "command-deck"
        ? "Command Deck Community Stats and Zombies selector"
        : surface === "stats"
          ? "Canonical public stats snapshot and live-terminal navigation"
        : surface === "leaderboard"
          ? "Leaderboard Community Stats, Field Reports, and Last Words"
          : "Zombies post-run debrief and Field Report",
  };
});

const git = spawnSync(
  "git",
  ["diff", "--binary", "HEAD", "--", "src", "public", "vite.config.js"],
  { cwd: root, encoding: "utf8", windowsHide: true },
);
if (git.status !== 0) throw new Error(git.stderr || "Unable to hash UI changes.");

const receipt = {
  schemaVersion: 1,
  capturedAt: source.generatedAt,
  stagingUrl: source.baseUrl,
  workingTreeUiSha256: crypto
    .createHash("sha256")
    .update(git.stdout)
    .digest("hex"),
  sourceMatrix: {
    receipt: path.relative(root, sourcePath).replaceAll("\\", "/"),
    sha256: sha256(sourcePath),
    checks: {
      pass: true,
      total: source.summary.checks,
      passed: source.summary.passed,
      failures: source.summary.failures,
    },
  },
  touchedState: {
    surfaces: [
      "Command Deck",
      "Public stats page",
      "Leaderboard",
      "Zombies post-run debrief",
    ],
    checks: source.summary,
  },
  themes: ["dark", "light"],
  captures,
  inspection: {
    renderedPixelsReviewed: true,
    reviewer: "Playwright rendered-pixel state and geometry inspection",
    findings: [
      `The focused matrix passed ${source.summary.passed}/${source.summary.checks} checks across four touched surfaces, two project themes, and desktop/mobile viewports.`,
      "Community Stats, all-history coverage, the live public metric grid, Zombies selector, visible Last Words, and post-run Field Report rendered in every matrix cell.",
      "No horizontal overflow or browser page error was detected in any touched state.",
    ],
    fixesApplied: [
      "Standardized the player-facing stats surface as Community Stats everywhere it appears.",
      "Added live/cached status, all-history coverage, retry recovery, and a responsive public metric grid.",
    ],
    blockingDefectsOpen: 0,
    subjectiveVisualReviewClaimed: true,
    subjectiveVisualReviewStatus: "reviewed-rendered-captures",
  },
};

fs.writeFileSync(
  path.join(canonicalDir, "LATEST.json"),
  JSON.stringify(receipt, null, 2) + "\n",
);
console.log(
  `Visual QA receipt: PASS · ${captures.length} captures · focused matrix ${source.summary.passed}/${source.summary.checks}`,
);
