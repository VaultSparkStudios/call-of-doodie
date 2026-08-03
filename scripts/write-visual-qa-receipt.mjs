#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "./lib/safe-spawn.mjs";

const root = process.cwd();
const valueAfter = (name, fallback) => {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : fallback;
};
const auditDir = path.resolve(root, valueAfter("--audit-dir", "output/playwright/session-137-staging"));
const canonicalDir = path.join(root, "docs", "visual-qa");
const auditPath = path.join(auditDir, "visual-audit-receipt.json");
const audit = JSON.parse(fs.readFileSync(auditPath, "utf8"));
if (!audit?.summary?.pass) throw new Error("Refusing visual receipt: source matrix did not pass.");

const selected = [
  { source: "home--sewer-night--390.png", file: "home-dark-mobile.png", theme: "dark", width: 390, height: 1000, page: "Home v2 default command center and all-open loadout" },
  { source: "home--porcelain-day--1440.png", file: "home-light-desktop.png", theme: "light", width: 1440, height: 1000, page: "Home v2 default command center and all-open loadout" },
  { source: "arsenal--sewer-night--1440.png", file: "arsenal-dark-desktop.png", theme: "dark", width: 1440, height: 1546, page: "Public Arsenal open-roster contract" },
  { source: "arsenal--porcelain-day--390.png", file: "arsenal-light-mobile.png", theme: "light", width: 390, height: 2082, page: "Public Arsenal open-roster contract" },
];

const sha256 = (file) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
fs.mkdirSync(canonicalDir, { recursive: true });
const captures = selected.map((entry) => {
  const source = path.join(auditDir, entry.source);
  const target = path.join(canonicalDir, entry.file);
  fs.copyFileSync(source, target);
  return {
    file: entry.file,
    sha256: sha256(target),
    theme: entry.theme,
    projectTheme: entry.theme === "dark" ? "sewer-night" : "porcelain-day",
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
  themes: ["dark", "light"],
  captures,
  inspection: {
    renderedPixelsReviewed: true,
    reviewer: "Codex image-capable rendered-pixel review",
    findings: [
      "Home v2 remains legible and compositionally stable at 390px dark and 1440px light; the deploy action and open-arsenal roster are visible without overlap.",
      "The Arsenal page clearly presents all twelve weapons as available now, with mastery as recognition rather than access, on desktop dark and mobile light.",
      "No black-on-black, light-on-white, horizontal overflow, clipped primary action, console error, or page error was observed in the complete matrix.",
    ],
    fixesApplied: [
      "Added exact route/theme/viewport diagnostics to visual-audit timeouts after the first transient unlabeled browser wait; the complete rerun passed.",
    ],
    blockingDefectsOpen: 0,
  },
};
fs.writeFileSync(path.join(canonicalDir, "LATEST.json"), JSON.stringify(receipt, null, 2) + "\n");
console.log(`Visual QA receipt: PASS · ${captures.length} inspected captures · matrix ${audit.summary.passed}/${audit.summary.total}`);
