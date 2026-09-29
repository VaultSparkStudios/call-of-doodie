#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";

const origin = process.argv[2] || "http://127.0.0.1:4173";
const hosted = origin.startsWith("https://");
const outputDir = path.resolve(hosted ? "output/playwright/session-179-stats/staging" : "output/playwright/session-179-stats");
const snapshot = JSON.parse(fs.readFileSync("data/community-stats-snapshot.json", "utf8"));
const fixture = {
  checkedAt: snapshot.checkedAt,
  stats: {
    ...snapshot.stats,
    updatedAt: snapshot.lastCompletedAt,
    coverage: snapshot.coverage,
  },
};
const matrix = [
  { theme: "sewer-night", width: 1440, height: 900 },
  { theme: "porcelain-day", width: 1440, height: 900 },
  { theme: "sewer-night", width: 390, height: 844 },
  { theme: "porcelain-day", width: 390, height: 844 },
];

fs.mkdirSync(outputDir, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const findings = [];
try {
  for (const item of matrix) {
    const context = await browser.newContext({
      viewport: { width: item.width, height: item.height },
      colorScheme: item.theme === "porcelain-day" ? "light" : "dark",
    });
    await context.addInitScript((theme) => {
      localStorage.setItem("cod-theme", theme);
      localStorage.setItem("cod-home-v2", "1");
      localStorage.setItem("cod-music-muted", "1");
      localStorage.setItem("cod-callsign-v1", "VISUAL-QA");
    }, item.theme);
    if (!hosted) await context.route("**/api/community-stats", (route) => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(fixture),
    }));
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    for (const route of ["stats", "board"]) {
      await page.goto(`${origin}/${route}/`, { waitUntil: "domcontentloaded" });
      await page.locator("[data-community-status][data-state=live]").waitFor();
      if (route === "board" && hosted) await page.locator("[data-top-scores-status][data-state=live]").waitFor();
      const width = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
      const label = `${route}--${item.theme}--${item.width}`;
      await page.screenshot({ path: path.join(outputDir, `${label}.png`), fullPage: true });
      findings.push({ label, title: await page.title(), width, errors: [...errors], statsAnalysis: await page.locator("#stats-analysis-heading").count(), statsLink: await page.locator('a[href="../stats/"]').count() });
      if (width.scroll > width.client + 1 || errors.length) throw new Error(`${label}: ${JSON.stringify({ width, errors })}`);
      if (route === "stats" && !(await page.locator("#stats-analysis-heading").isVisible())) throw new Error(`${label}: missing visible analysis`);
    }
    if (hosted) {
      await page.goto(`${origin}/?home=v2&theme=${item.theme}`, { waitUntil: "domcontentloaded" });
      await page.getByTestId("home-v2-shell").waitFor({ state: "visible", timeout: 30000 });
      const panel = page.getByTestId("community-stats");
      await panel.locator('a[href$="stats/"]').waitFor({ state: "visible" });
      await panel.getByText(/LIVE · AUTO-REFRESH/).waitFor({ state: "visible", timeout: 30000 });
      await panel.screenshot({ path: path.join(outputDir, `home-stats--${item.theme}--${item.width}.png`) });
      await page.getByRole("button", { name: "More", exact: true }).click();
      await page.locator('.home-more-menu a[href="/stats/"]').waitFor({ state: "visible" });
      await page.screenshot({ path: path.join(outputDir, `home-menu--${item.theme}--${item.width}.png`), fullPage: false });
      findings.push({ label: `home--${item.theme}--${item.width}`, statsLink: true, menuStatsLink: true, errors: [...errors] });
      if (errors.length) throw new Error(`home--${item.theme}--${item.width}: ${JSON.stringify(errors)}`);
    }
    await context.close();
  }
  const offline = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await offline.route("**/api/community-stats", (route) => route.abort("internetdisconnected"));
  const page = await offline.newPage();
  await page.goto(`${origin}/stats/`, { waitUntil: "domcontentloaded" });
  await page.screenshot({ path: path.join(outputDir, "stats--fallback--390.png"), fullPage: true });
  findings.push({ label: "stats--fallback--390", status: await page.locator("[data-community-status]").textContent(), analysis: await page.locator("#stats-analysis-heading").textContent() });
  await offline.close();
  fs.writeFileSync(path.join(outputDir, "capture-result.json"), `${JSON.stringify({ origin, capturedAt: new Date().toISOString(), findings }, null, 2)}\n`);
  console.log(JSON.stringify({ outputDir, captures: findings.length, findings }, null, 2));
} finally {
  await browser.close();
}
