#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";

const valueAfter = (name, fallback = null) => {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : fallback;
};
const baseUrl = valueAfter("--url");
if (!baseUrl || !/^https?:\/\//.test(baseUrl)) {
  console.error("Usage: node scripts/capture-replay-passport-visuals.mjs --url <staging-url> [--output <dir>]");
  process.exit(2);
}
const outputDir = path.resolve(process.cwd(), valueAfter("--output", "output/playwright/replay-passport"));
fs.mkdirSync(outputDir, { recursive: true });

const receipt = { schemaVersion: 1, generatedAt: new Date().toISOString(), baseUrl, captures: [] };
const browser = await chromium.launch({ headless: true });
try {
  for (const theme of ["sewer-night", "porcelain-day"]) {
    for (const width of [390, 1440]) {
      const context = await browser.newContext({ viewport: { width, height: 1000 }, colorScheme: theme === "porcelain-day" ? "light" : "dark" });
      await context.addInitScript(({ selectedTheme }) => {
        localStorage.setItem("cod-theme", selectedTheme);
        localStorage.setItem("cod-callsign-v1", "VISUAL-QA");
        localStorage.setItem("cod-home-v2", "1");
      }, { selectedTheme: theme });
      const page = await context.newPage();
      const consoleErrors = [];
      const pageErrors = [];
      page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
      page.on("pageerror", (error) => pageErrors.push(error.message));
      const url = new URL("/?home=v2", baseUrl);
      url.searchParams.set("theme", theme);
      const response = await page.goto(url.href, { waitUntil: "networkidle" });
      const blockingDialog = page.getByRole("dialog");
      if (await blockingDialog.isVisible().catch(() => false)) {
        await blockingDialog.getByRole("button").last().click();
      }
      const progressToolsButton = page.locator("button").filter({ hasText: "PROGRESS TOOLS" }).first();
      const historyButton = page.locator("button").filter({ hasText: "HISTORY" }).first();
      if (await progressToolsButton.getAttribute("aria-expanded") === "false") {
        await progressToolsButton.click();
      }
      const historyVisible = await historyButton.waitFor({ state: "visible", timeout: 5000 }).then(() => true).catch(() => false);
      if (!historyVisible) {
        const buttonLabels = await page.locator("button").allTextContents();
        throw new Error(`History action remained unavailable. Buttons: ${JSON.stringify(buttonLabels)}`);
      }
      await historyButton.click();
      const passport = page.locator("details").filter({ hasText: "REPLAY COVERAGE PASSPORT" });
      await passport.waitFor({ state: "visible" });
      await passport.evaluate((element) => { element.open = true; element.scrollIntoView({ block: "center" }); });
      await page.waitForTimeout(100);
      const state = await page.evaluate(() => {
        const passportElement = [...document.querySelectorAll("details")].find((element) => element.textContent?.includes("REPLAY COVERAGE PASSPORT"));
        const scrollPanel = passportElement?.closest("[data-gamepad-scroll]");
        const rect = passportElement?.getBoundingClientRect();
        return {
          appliedTheme: document.documentElement.dataset.codTheme,
          passportVisible: Boolean(rect && rect.width > 0 && rect.height > 0),
          passportOpen: Boolean(passportElement?.open),
          panelNoHorizontalOverflow: Boolean(scrollPanel && scrollPanel.scrollWidth <= scrollPanel.clientWidth + 1),
          documentNoHorizontalOverflow: document.documentElement.scrollWidth <= innerWidth + 1,
        };
      });
      const file = `replay-passport--${theme}--${width}.png`;
      await page.screenshot({ path: path.join(outputDir, file), fullPage: false });
      const checks = [
        { id: "http-ok", ok: Boolean(response?.ok()), actual: response?.status() ?? null },
        { id: "theme-applied", ok: state.appliedTheme === theme, actual: state.appliedTheme },
        { id: "passport-visible", ok: state.passportVisible, actual: state.passportVisible },
        { id: "passport-expanded", ok: state.passportOpen, actual: state.passportOpen },
        { id: "panel-no-horizontal-overflow", ok: state.panelNoHorizontalOverflow, actual: state.panelNoHorizontalOverflow },
        { id: "document-no-horizontal-overflow", ok: state.documentNoHorizontalOverflow, actual: state.documentNoHorizontalOverflow },
        { id: "no-console-errors", ok: consoleErrors.length === 0, actual: consoleErrors },
        { id: "no-page-errors", ok: pageErrors.length === 0, actual: pageErrors },
      ];
      receipt.captures.push({ theme, width, screenshot: file, checks, pass: checks.every((check) => check.ok) });
      await context.close();
    }
  }
} finally {
  await browser.close();
}
receipt.summary = {
  pass: receipt.captures.every((capture) => capture.pass),
  captures: receipt.captures.length,
  checks: receipt.captures.reduce((total, capture) => total + capture.checks.length, 0),
  passed: receipt.captures.reduce((total, capture) => total + capture.checks.filter((check) => check.ok).length, 0),
};
fs.writeFileSync(path.join(outputDir, "replay-passport-receipt.json"), `${JSON.stringify(receipt, null, 2)}\n`);
console.log(`Replay passport visual QA: ${receipt.summary.pass ? "PASS" : "FAIL"} · ${receipt.summary.passed}/${receipt.summary.checks}`);
if (!receipt.summary.pass) process.exitCode = 1;
