#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";

const root = process.cwd();
const baseUrl = process.argv[2] || "https://session-142-staging.call-of-doodie.pages.dev/";
const outputIndex = process.argv.indexOf("--output");
const outputArg = process.argv.find((arg) => arg.startsWith("--output="))?.split("=")[1]
  || (outputIndex >= 0 ? process.argv[outputIndex + 1] : null)
  || "docs/performance/STAGING_SESSION_149_INP.json";
const outPath = path.resolve(root, outputArg);
const matrix = [
  { width: 390, height: 844, theme: "sewer-night" },
  { width: 1440, height: 1000, theme: "porcelain-day" },
];

const browser = await chromium.launch({ headless: true });
const results = [];
try {
  for (const item of matrix) {
    const context = await browser.newContext({
      viewport: { width: item.width, height: item.height },
    });
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    await page.addInitScript(({ theme }) => {
      localStorage.setItem("cod-theme", theme);
      localStorage.setItem("cod-callsign-v1", "RELEASE-QA");
      localStorage.setItem("cod-home-v2", "1");
      window.__releaseEventDurations = [];
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.interactionId > 0) window.__releaseEventDurations.push(entry.duration);
        }
      }).observe({ type: "event", buffered: true, durationThreshold: 0 });
    }, { theme: item.theme });
    console.log(`INP capture: navigate ${item.width}x${item.height} ${item.theme}`);
    await page.goto(new URL(`?home=v2&theme=${item.theme}`, baseUrl).href, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.locator('[data-testid="home-v2-shell"]').waitFor({ state: "visible" });
    let action;
    let controlKind;
    if (item.width <= 430) {
      action = page.locator('button[data-mode-id="score_attack"]');
      controlKind = "accessible-radio-button";
    } else {
      const toggle = page.locator('button[aria-label="Change mode or difficulty"]');
      await toggle.waitFor({ state: "visible" });
      await toggle.click({ timeout: 15000 });
      action = page.locator('#deploy-config-panel button').filter({ hasText: "SCORE ATTACK" }).first();
      controlKind = "desktop-popover-button";
    }
    try {
      await action.waitFor({ state: "visible" });
    } catch (error) {
      const diagnostic = await page.evaluate(() => ({
        url: location.href,
        body: String(document.body?.innerText || "").slice(0, 1000),
        modeControls: [...document.querySelectorAll("[data-mode-id], #deploy-config-panel button")].map((node) => node.getAttribute("data-mode-id") || node.textContent?.trim()),
      }));
      throw new Error(`${error.message}\n${JSON.stringify(diagnostic, null, 2)}`);
    }
    await page.waitForTimeout(1000);
    await page.evaluate(() => { window.__releaseEventDurations = []; });
    console.log(`INP capture: click ${controlKind}`);
    await action.click({ timeout: 15000 });
    await page.waitForTimeout(750);
    const durations = await page.evaluate(() => window.__releaseEventDurations || []);
    results.push({
      ...item,
      controlKind,
      samplesMs: durations,
      inpMs: durations.length ? Math.max(...durations) : null,
    });
    console.log(`INP capture: ${controlKind} -> ${results.at(-1).inpMs ?? "no-sample"}ms`);
    await context.close();
  }
} finally {
  await browser.close();
}

const measured = results.map((result) => result.inpMs).filter(Number.isFinite);
const receipt = {
  schemaVersion: "staging-inp-v2",
  capturedAt: new Date().toISOString(),
  baseUrl,
  method: "Event Timing API interactionId durations for selecting Score Attack with a real button after a 1s post-hydration quiet window",
  comparisonBaseline: {
    path: "docs/performance/STAGING_SESSION_142_INP.json",
    mobileInpMs: 1408,
    note: "Historical production synthetic measurement on the retired native select; not a physical-device claim.",
  },
  results,
  maxInpMs: measured.length ? Math.max(...measured) : null,
  thresholdMs: 200,
  pass: measured.length === results.length && Math.max(...measured) < 200,
};

fs.writeFileSync(outPath, JSON.stringify(receipt, null, 2) + "\n");
console.log(JSON.stringify(receipt, null, 2));
if (!receipt.pass) process.exitCode = 1;
