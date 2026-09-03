#!/usr/bin/env node
// Proves the live aggregate, in-game panel, and public stats surface against a deployed origin.

import { chromium } from "@playwright/test";

const origin = String(process.argv[2] || "").replace(/\/+$/, "");
if (!/^https:\/\/[a-z0-9.-]+$/i.test(origin)) {
  console.error("Usage: node scripts/verify-live-community-stats.mjs https://deployed-origin");
  process.exit(2);
}

const apiResponse = await fetch(`${origin}/api/community-stats`, {
  headers: { accept: "application/json" },
});
if (!apiResponse.ok) throw new Error(`Community Stats API returned ${apiResponse.status}.`);
const api = await apiResponse.json();
const coverage = api?.stats?.coverage || {};
if (
  api?.stats?.scope !== "all_available_server_history"
  || coverage.history !== "all_available_server_history"
  || Number(api.stats.runs) !== Number(coverage.richRuns) + Number(coverage.legacyRuns)
) {
  throw new Error("Community Stats API did not reconcile all supported history.");
}

const browser = await chromium.launch({ headless: true });
const errors = [];
let proof;
try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    localStorage.setItem("cod-home-v2", "1");
    localStorage.setItem("cod-tutorial-v2", "1");
    localStorage.setItem("cod-music-muted", "1");
    localStorage.setItem("cod-callsign-v1", "LIVE-PROBE");
  });
  await page.goto(`${origin}/?home=v2`, { waitUntil: "networkidle" });
  const panel = page.locator('[data-testid="community-stats"]');
  await panel.waitFor({ state: "visible" });
  await panel.getByRole("button", { name: "COMMUNITY", exact: true }).click();
  await panel.getByText("ALL AVAILABLE HISTORY", { exact: false }).waitFor({ state: "visible" });
  await panel.getByText("LIVE", { exact: false }).last().waitFor({ state: "visible" });
  const inGameText = await panel.innerText();

  await page.goto(`${origin}/board/`, { waitUntil: "networkidle" });
  await page.locator('[data-community-status][data-state="live"]').waitFor({ state: "visible" });
  const publicRuns = await page.locator('[data-community-stat="runs"]').innerText();
  const publicCoverage = await page.locator("[data-community-coverage]").innerText();
  proof = {
    apiRuns: Number(api.stats.runs),
    richRuns: Number(coverage.richRuns),
    legacyRuns: Number(coverage.legacyRuns),
    oldestSupportedAt: coverage.oldestSupportedAt,
    inGameLive: /LIVE/.test(inGameText),
    inGameAllHistory: /ALL AVAILABLE HISTORY/.test(inGameText),
    publicRuns: Number(publicRuns.replace(/,/g, "")),
    publicAllHistory: /supported runs/i.test(publicCoverage),
    pageErrors: errors,
  };
  await context.close();
} finally {
  await browser.close();
}

const pass = proof.inGameLive
  && proof.inGameAllHistory
  && proof.publicRuns === proof.apiRuns
  && proof.publicAllHistory
  && proof.pageErrors.length === 0;
console.log(JSON.stringify({
  schemaVersion: "live-community-stats-proof-v1",
  checkedAt: new Date().toISOString(),
  origin,
  ...proof,
  pass,
}, null, 2));
if (!pass) process.exitCode = 1;
