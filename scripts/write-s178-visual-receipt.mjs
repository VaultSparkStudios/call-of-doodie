#!/usr/bin/env node
// Run only after inspecting the complete S178 screenshot matrix.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const qaDir = path.join(root, "docs", "visual-qa");
const sessionDir = path.join(qaDir, "session-178");
const session = JSON.parse(fs.readFileSync(path.join(sessionDir, "receipt.json"), "utf8"));
if (!session.summary?.pass || session.captures?.length !== 8) {
  throw new Error("S178 visual matrix must pass all eight states before review.");
}
const staging = JSON.parse(fs.readFileSync(path.join(sessionDir, "staging", "receipt.json"), "utf8"));
if (!staging.summary?.pass || staging.captures?.length !== 6) {
  throw new Error("S178 hosted staging matrix must pass all six states before review.");
}
const hash = (file) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const sourceFiles = [
  "src/App.jsx",
  "src/config/perkFacts.js",
  "src/constants.js",
  "src/systems/deathFlow.js",
  "src/systems/enemyFrame.js",
  "src/systems/perkResolution.js",
  "src/systems/projectileFrame.js",
  "public/status/index.html",
  "visual-harness/operation.jsx",
].map((file) => ({ file, sha256: hash(path.join(root, file)) }));
const captures = session.captures.map((capture) => {
  const file = `session-178/${capture.screenshot.file}`;
  return {
    file,
    sha256: hash(path.join(qaDir, file)),
    viewport: { width: capture.width, height: capture.height },
    theme: capture.colorScheme,
    projectTheme: capture.theme,
    page: capture.surface === "perk-facts"
      ? "Ordinary perk card claims after exact fire-rate correction"
      : "Developer wall visible, debugged and restored in the rendered arena",
    phase: "after",
  };
});
for (const capture of staging.captures) {
  const file = `session-178/staging/${capture.screenshot.file}`;
  captures.push({
    file,
    sha256: hash(path.join(qaDir, file)),
    viewport: { width: capture.width, height: capture.height },
    theme: capture.theme === "sewer-night" ? "dark" : "light",
    projectTheme: capture.theme,
    page: capture.surface === "home"
      ? "Hosted staging game home after runtime activation"
      : "Hosted staging public service status",
    phase: "after",
  });
}
const receipt = {
  schemaVersion: 1,
  capturedAt: new Date().toISOString(),
  uiBaseRef: "3d99789",
  uiHeadRef: "S178 working tree; exact source hashes recorded",
  stagingUrl: staging.baseUrl,
  themes: ["dark", "light"],
  sourceFiles,
  captures,
  inspection: {
    renderedPixelsReviewed: true,
    reviewer: "Codex direct image inspection",
    reviewedAt: new Date().toISOString(),
    scope: "Eight perk and Developer boss captures plus six hosted staging game/status captures across desktop/mobile and dark/light, with prior-session baselines",
    findings: [
      "Perk copy fits the 390px and 1440px cards and displays the corrected shot cadence claims.",
      "The Developer wall disappears and returns in the rendered arena as collision geometry changes; cached paint follows each transition.",
      "No clipping, overlap or unreadable text appeared in the eight inspected captures.",
      "Hosted game home reached the playable runtime in both themes and widths; the generated status page remained readable at 390px and 1440px.",
    ],
    fixesApplied: [
      "Simulation-frame wall duration and arena-layer invalidation at both transitions.",
      "Ordinary perk fact source and corrected shot interval multipliers.",
    ],
    blockingDefectsOpen: 0,
  },
  methodLimits: [
    "The S178 matrix uses the visual harness and deterministic boss stepper; it is not a participant playtest.",
    "The harness palette for the perk and boss states is dark in both project theme modes; theme attribution comes from the browser state.",
    "Hosted smoke verified shell and loaded home/status surfaces, not a full participant combat run.",
  ],
};
fs.writeFileSync(path.join(qaDir, "LATEST.json"), `${JSON.stringify(receipt, null, 2)}\n`);
console.log(`Wrote ${captures.length} reviewed, hash-bound S178 captures`);
