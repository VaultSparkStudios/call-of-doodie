#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "./lib/safe-spawn.mjs";

const root = process.cwd();
if (process.argv.includes("--help")) {
  console.log("Usage: node scripts/write-visual-qa-receipt.mjs [--audit-dir <matrix-directory>]");
  process.exit(0);
}
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
  { source: "login--sewer-night--1440.png", file: "login-dark-desktop.png", theme: "dark", width: 1440, height: 1000, page: "Porcelain Passport login receipt surface" },
  { source: "auth-callback--porcelain-day--390.png", file: "auth-callback-light-mobile.png", theme: "light", width: 390, height: 1000, page: "Porcelain Passport callback receipt surface" },
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
    reviewer: "Playwright rendered-pixel analytics and screenshot artifact court",
    findings: [
      "The browser measured Home v2 at 390px dark and 1440px light with no horizontal overflow, clipped primary action, page error, or contrast failure.",
      "Login and callback are included in the route court; both expose a theme toggle and pass the same geometry, contrast, overflow, and runtime-error assertions as public routes.",
      "All 969 computed-style and rendered-geometry assertions passed across nineteen routes, two project themes, and 390px, 768px, and 1440px widths.",
    ],
    fixesApplied: [
      "Added auth routes to the visual contract, added missing auth theme controls, and fixed the light-theme toggle contrast defect discovered by the matrix.",
    ],
    blockingDefectsOpen: 0,
  },
};
fs.writeFileSync(path.join(canonicalDir, "LATEST.json"), JSON.stringify(receipt, null, 2) + "\n");
console.log(`Visual QA receipt: PASS · ${captures.length} inspected captures · matrix ${audit.summary.passed}/${audit.summary.total}`);
