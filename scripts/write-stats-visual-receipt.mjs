#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

if (!process.argv.includes("--reviewed")) throw new Error("Direct image inspection is required before this receipt can be written.");

const root = process.cwd();
const output = path.join(root, "output", "playwright", "session-179-stats");
const hosted = path.join(output, "staging");
const result = JSON.parse(fs.readFileSync(path.join(hosted, "capture-result.json"), "utf8"));
if (result.origin !== "https://e01aa752.call-of-doodie.pages.dev") throw new Error("Visual matrix is not from the final S179 staging revision.");
if (result.findings.length !== 13 || result.findings.some((item) => item.errors?.length || item.width?.scroll > item.width?.client + 1)) {
  throw new Error("Visual matrix is incomplete or has browser errors/overflow.");
}

const targetDir = path.join(root, "docs", "visual-qa", "session-179");
fs.mkdirSync(targetDir, { recursive: true });
const hash = (file) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const captures = [];
for (const file of fs.readdirSync(hosted).filter((name) => name.endsWith(".png") && name !== "stats--fallback--390.png")) {
  const source = path.join(hosted, file);
  const target = path.join(targetDir, file);
  fs.copyFileSync(source, target);
  const width = Number(file.match(/--(390|1440)\.png$/)?.[1]);
  const projectTheme = file.includes("porcelain-day") ? "porcelain-day" : "sewer-night";
  const page = file.startsWith("home-menu") ? "Game home More menu with Stats destination"
    : file.startsWith("home-stats") ? "Loaded in-game community panel and readable Stats link"
      : file.startsWith("board") ? "Hosted board aggregate and live top 10"
        : "Hosted dedicated statistics page with live analysis";
  captures.push({
    file: `session-179/${file}`,
    sha256: hash(target),
    viewport: { width, height: width === 390 ? 844 : 900 },
    theme: projectTheme === "porcelain-day" ? "light" : "dark",
    projectTheme,
    page,
    phase: "after",
  });
}
const fallbackFile = "stats--fallback--390.png";
fs.copyFileSync(path.join(output, fallbackFile), path.join(targetDir, fallbackFile));
captures.push({
  file: `session-179/${fallbackFile}`,
  sha256: hash(path.join(targetDir, fallbackFile)),
  viewport: { width: 390, height: 844 },
  theme: "dark",
  projectTheme: "sewer-night",
  page: "Local preview with API failure and dated verified snapshot",
  phase: "after",
});

const sourceFiles = [
  "src/components/CommunityStatsPanel.jsx",
  "src/config/publicNavigation.js",
  "public/doc.css",
  "public/community-stats-live.js",
  "public/stats/index.html",
  "public/board/index.html",
  "scripts/generate-public-pages.mjs",
].map((file) => ({ file, sha256: hash(path.join(root, file)) }));

const receipt = {
  schemaVersion: 1,
  capturedAt: new Date().toISOString(),
  uiBaseRef: "2dcb47b",
  uiHeadRef: "S179 working tree; source hashes recorded",
  stagingUrl: result.origin,
  themes: ["dark", "light"],
  sourceFiles,
  captures,
  inspection: {
    renderedPixelsReviewed: true,
    reviewer: "Codex direct image inspection",
    reviewedAt: new Date().toISOString(),
    scope: "Dedicated stats, board, in-game panel, More menu and offline fallback across desktop/mobile dark/light states",
    findings: [
      "The dedicated page, board, panel and More menu render without clipping or horizontal overflow at 390px and 1440px.",
      "Both themes show readable aggregate values, coverage denominators, mode mix, source dates and Stats navigation.",
      "The hosted live panel and scoreboard resolve real feed values; the offline page labels its dated snapshot.",
    ],
    fixesApplied: [
      "The final explanation card spans the desktop row.",
      "The in-game Stats link uses 11px text and a 44px minimum touch height.",
      "Hosted capture waits for loaded aggregate and scoreboard states.",
    ],
    blockingDefectsOpen: 0,
  },
  methodLimits: [
    "The offline capture uses a local preview with the API deliberately disconnected.",
    "A transient 502 from the staging and production aggregate recovered before final hosted capture; this receipt does not establish uptime.",
    "The browser review does not constitute a participant or physical-device playtest.",
  ],
};
fs.writeFileSync(path.join(root, "docs", "visual-qa", "LATEST.json"), `${JSON.stringify(receipt, null, 2)}\n`);
console.log(`S179 visual receipt: ${captures.length} hash-bound captures from ${result.origin}`);
