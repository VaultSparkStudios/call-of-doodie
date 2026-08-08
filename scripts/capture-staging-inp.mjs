#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";

const root = process.cwd();
const baseUrl = process.argv[2] || "https://session-142-staging.call-of-doodie.pages.dev/";
const outPath = path.join(root, "docs", "performance", "STAGING_SESSION_142_INP.json");
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
    await page.goto(new URL(`?home=v2&theme=${item.theme}`, baseUrl).href, { waitUntil: "networkidle" });
    const action = item.width <= 430
      ? page.locator('select[aria-label="Mobile game mode"]')
      : page.locator('button[aria-label="Change mode or difficulty"]');
    try {
      await action.waitFor({ state: "visible" });
    } catch (error) {
      const diagnostic = await page.evaluate(() => ({
        url: location.href,
        body: String(document.body?.innerText || "").slice(0, 1000),
        selects: [...document.querySelectorAll("select")].map((node) => node.getAttribute("aria-label")),
      }));
      throw new Error(`${error.message}\n${JSON.stringify(diagnostic, null, 2)}`);
    }
    await page.waitForTimeout(1000);
    await page.evaluate(() => { window.__releaseEventDurations = []; });
    await action.click();
    await page.waitForTimeout(750);
    const durations = await page.evaluate(() => window.__releaseEventDurations || []);
    results.push({
      ...item,
      samplesMs: durations,
      inpMs: durations.length ? Math.max(...durations) : null,
    });
    await context.close();
  }
} finally {
  await browser.close();
}

const measured = results.map((result) => result.inpMs).filter(Number.isFinite);
const receipt = {
  schemaVersion: "staging-inp-v1",
  capturedAt: new Date().toISOString(),
  baseUrl,
  method: "Event Timing API interactionId durations for the visible Command Deck mode selector after a 1s post-hydration quiet window",
  results,
  maxInpMs: measured.length ? Math.max(...measured) : null,
  thresholdMs: 200,
  pass: measured.length === results.length && Math.max(...measured) < 200,
};

fs.writeFileSync(outPath, JSON.stringify(receipt, null, 2) + "\n");
console.log(JSON.stringify(receipt, null, 2));
if (!receipt.pass) process.exitCode = 1;
