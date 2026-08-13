#!/usr/bin/env node

// Usage: node scripts/capture-playtest-signal-visuals.mjs --url <staging-url> [--output <dir>]
// Exercises the actual deploy -> defeat -> structured feedback -> aggregate command-post flow.

import fs from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";

const valueAfter = (name, fallback = null) => {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : fallback;
};
const baseUrl = valueAfter("--url");
if (!baseUrl || !/^https?:\/\//.test(baseUrl)) {
  console.error("Usage: node scripts/capture-playtest-signal-visuals.mjs --url <staging-url> [--output <dir>]");
  process.exit(2);
}
const outputDir = path.resolve(process.cwd(), valueAfter("--output", "output/playwright/playtest-signals"));
const selectedTheme = valueAfter("--theme");
const selectedWidth = Number(valueAfter("--width"));
const themes = selectedTheme ? [selectedTheme] : ["sewer-night", "porcelain-day"];
const widths = Number.isFinite(selectedWidth) && selectedWidth > 0 ? [selectedWidth] : [390, 1440];
fs.mkdirSync(outputDir, { recursive: true });

const receipt = { schemaVersion: 1, generatedAt: new Date().toISOString(), baseUrl, captures: [] };
const browser = await chromium.launch({ headless: true });
try {
  for (const theme of themes) {
    for (const width of widths) {
      const context = await browser.newContext({
        viewport: { width, height: 1000 },
        colorScheme: theme === "porcelain-day" ? "light" : "dark",
      });
      await context.addInitScript(({ selectedTheme }) => {
        localStorage.setItem("cod-theme", selectedTheme);
        localStorage.setItem("cod-callsign-v1", "VISUAL-QA");
        localStorage.setItem("cod-home-v2", "1");
        localStorage.setItem("cod-tutorial-v2", "1");
        localStorage.setItem("cod-playtest-pulse-enabled", "1");
        sessionStorage.setItem("cod-tutorial-v2", "1");
      }, { selectedTheme: theme });
      const page = await context.newPage();
      const consoleErrors = [];
      const pageErrors = [];
      const responseFailurePromises = [];
      page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
      page.on("pageerror", (error) => pageErrors.push(error.message));
      page.on("response", (response) => {
        if (response.status() >= 400) {
          responseFailurePromises.push(response.text().catch(() => "").then((body) => ({ status: response.status(), url: response.url(), body: body.slice(0, 500) })));
        }
      });

      const homeUrl = new URL("/?home=v2&playtest=1", baseUrl);
      homeUrl.searchParams.set("theme", theme);
      const response = await page.goto(homeUrl.href, { waitUntil: "networkidle" });
      const deploy = page.locator('[data-testid="front-door-deploy"]');
      await deploy.waitFor({ state: "visible", timeout: 20000 });

      await deploy.click({ force: true });

      const skipDraft = page.getByRole("button", { name: /SKIP.*GO IN CLEAN/i });
      await skipDraft.waitFor({ state: "visible", timeout: 10000 }).then(() => skipDraft.click()).catch(() => {});
      await page.locator("#game-canvas").waitFor({ state: "visible", timeout: 20000 });

      const flight = page.getByRole("region", { name: "Playtest flight receipt" });
      await flight.waitFor({ state: "visible", timeout: 180000 });
      await page.getByRole("group", { name: "Did the cause of death make sense?" }).getByRole("button", { name: "CLEAR", exact: true }).click();
      await page.getByRole("group", { name: "Would you start another run?" }).getByRole("button", { name: "NOW", exact: true }).click();
      await page.getByRole("group", { name: "Did the controls obey you?" }).getByRole("button", { name: "YES", exact: true }).click();
      await page.getByRole("group", { name: "Could you read the danger?" }).getByRole("button", { name: "CLEAR", exact: true }).click();
      await flight.scrollIntoViewIfNeeded();
      const flightState = await page.evaluate(() => {
        const value = JSON.parse(sessionStorage.getItem("cod-playtest-flight-v1") || "null");
        const region = document.querySelector('[aria-label="Playtest flight receipt"]');
        const rect = region?.getBoundingClientRect();
        return {
          visible: Boolean(rect && rect.width > 0 && rect.height > 0),
          noHorizontalOverflow: document.documentElement.scrollWidth <= innerWidth + 1,
          annotations: value?.annotations || null,
        };
      });
      const flightFile = `playtest-flight--${theme}--${width}.png`;
      await page.screenshot({ path: path.join(outputDir, flightFile), fullPage: false });

      await page.goto(homeUrl.href, { waitUntil: "networkidle" });
      await deploy.waitFor({ state: "visible", timeout: 20000 });
      const pulse = page.locator('[data-testid="playtest-pulse-panel"]');
      await pulse.waitFor({ state: "visible", timeout: 10000 });
      await pulse.evaluate((element) => { element.open = true; element.scrollIntoView({ block: "center" }); });
      await page.waitForTimeout(100);
      const pulseState = await page.evaluate(() => {
        const value = JSON.parse(localStorage.getItem("cod-playtest-pulse-v1") || "null");
        const panel = document.querySelector('[data-testid="playtest-pulse-panel"]');
        const rect = panel?.getBoundingClientRect();
        return {
          visible: Boolean(rect && rect.width > 0 && rect.height > 0),
          noHorizontalOverflow: document.documentElement.scrollWidth <= innerWidth + 1,
          sampleSize: value?.sampleSize || 0,
          answers: value?.flights?.[0]?.annotations || null,
          text: panel?.textContent || "",
        };
      });
      const pulseFile = `playtest-pulse--${theme}--${width}.png`;
      await page.screenshot({ path: path.join(outputDir, pulseFile), fullPage: false });
      const responseFailures = await Promise.all(responseFailurePromises);

      const checks = [
        { id: "http-ok", ok: Boolean(response?.ok()), actual: response?.status() ?? null },
        { id: "flight-visible", ok: flightState.visible, actual: flightState.visible },
        { id: "flight-four-answers", ok: JSON.stringify(flightState.annotations) === JSON.stringify({ deathClarity: "clear", replayIntent: "now", inputTrust: "trusted", threatReadability: "clear" }), actual: flightState.annotations },
        { id: "flight-no-horizontal-overflow", ok: flightState.noHorizontalOverflow, actual: flightState.noHorizontalOverflow },
        { id: "pulse-visible", ok: pulseState.visible, actual: pulseState.visible },
        { id: "pulse-sample-recorded", ok: pulseState.sampleSize === 1, actual: pulseState.sampleSize },
        { id: "pulse-four-signal-groups", ok: ["DEATH CLARITY", "REPLAY INTENT", "CONTROL TRUST", "DANGER READABILITY"].every((label) => pulseState.text.includes(label)), actual: pulseState.text },
        { id: "pulse-no-horizontal-overflow", ok: pulseState.noHorizontalOverflow, actual: pulseState.noHorizontalOverflow },
        { id: "no-console-errors", ok: consoleErrors.length === 0, actual: consoleErrors },
        { id: "no-page-errors", ok: pageErrors.length === 0, actual: pageErrors },
        { id: "no-failed-responses", ok: responseFailures.length === 0, actual: responseFailures },
      ];
      receipt.captures.push({
        theme,
        width,
        screenshots: [flightFile, pulseFile],
        checks,
        pass: checks.every((check) => check.ok),
      });
      await context.close();
    }
  }
} finally {
  await browser.close();
}

receipt.summary = {
  pass: receipt.captures.every((capture) => capture.pass),
  captures: receipt.captures.length * 2,
  checks: receipt.captures.reduce((total, capture) => total + capture.checks.length, 0),
  passed: receipt.captures.reduce((total, capture) => total + capture.checks.filter((check) => check.ok).length, 0),
};
fs.writeFileSync(path.join(outputDir, "playtest-signal-receipt.json"), `${JSON.stringify(receipt, null, 2)}\n`);
console.log(`Playtest signal visual QA: ${receipt.summary.pass ? "PASS" : "FAIL"} · ${receipt.summary.passed}/${receipt.summary.checks}`);
if (!receipt.summary.pass) process.exitCode = 1;
