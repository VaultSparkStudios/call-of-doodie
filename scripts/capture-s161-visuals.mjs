#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";

const valueAfter = (name, fallback = null) => {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : fallback;
};
const baseUrl = valueAfter("--url");
if (!baseUrl || !/^https?:\/\//.test(baseUrl)) {
  console.error("Usage: node scripts/capture-s161-visuals.mjs --url <visual-harness-url> [--output <dir>]");
  process.exit(2);
}
const outputDir = path.resolve(valueAfter("--output", "docs/visual-qa/session-161"));
const profiles = [
  { theme: "sewer-night", width: 390, height: 844, colorScheme: "dark" },
  { theme: "sewer-night", width: 1440, height: 1000, colorScheme: "dark" },
  { theme: "porcelain-day", width: 390, height: 844, colorScheme: "light" },
  { theme: "porcelain-day", width: 1440, height: 1000, colorScheme: "light" },
];
const surfaces = ["perk-before", "perk-after", "threat-before", "threat-after"];
const hash = (file) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
fs.mkdirSync(outputDir, { recursive: true });

const receipt = {
  schemaVersion: "s161-readable-chaos-rendered-pixel-v1",
  generatedAt: new Date().toISOString(),
  baseUrl,
  captures: [],
  summary: { pass: true, checks: 0, passed: 0, failures: [] },
};

const browser = await chromium.launch({ headless: true });
try {
  for (const profile of profiles) {
    for (const surface of surfaces) {
      const context = await browser.newContext({
        viewport: { width: profile.width, height: profile.height },
        colorScheme: profile.colorScheme,
        reducedMotion: "reduce",
      });
      await context.addInitScript(({ theme }) => localStorage.setItem("cod-theme", theme), { theme: profile.theme });
      const page = await context.newPage();
      const pageErrors = [];
      const consoleErrors = [];
      page.on("pageerror", (error) => pageErrors.push(error.message));
      page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
      const url = new URL(baseUrl);
      url.searchParams.set("theme", profile.theme);
      url.searchParams.set("surface", surface);
      const response = await page.goto(url.href, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(150);

      const file = `${surface}--${profile.theme}--${profile.width}.png`;
      await page.screenshot({ path: path.join(outputDir, file), fullPage: false });
      const dimensions = await page.evaluate(() => ({
        viewportWidth: innerWidth,
        viewportHeight: innerHeight,
        scrollWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
        scrollHeight: Math.max(document.documentElement.scrollHeight, document.body.scrollHeight),
        theme: document.documentElement.dataset.codTheme,
      }));
      const deltaCount = await page.locator("[data-testid^='doctrine-delta-']").count();
      const threatStage = page.getByTestId("threat-stage");
      const arrowCount = await threatStage.getAttribute("data-arrow-count").catch(() => null);
      const checks = [
        { id: "http-ok", ok: Boolean(response?.ok()), actual: response?.status() ?? null },
        { id: "theme-applied", ok: dimensions.theme === profile.theme, actual: dimensions.theme },
        { id: "no-horizontal-overflow", ok: dimensions.scrollWidth <= dimensions.viewportWidth + 1, actual: `${dimensions.scrollWidth}/${dimensions.viewportWidth}` },
        { id: "no-page-errors", ok: pageErrors.length === 0, actual: pageErrors },
        { id: "no-console-errors", ok: consoleErrors.length === 0, actual: consoleErrors },
      ];
      if (surface === "perk-before") checks.push({ id: "baseline-has-no-delta", ok: deltaCount === 0, actual: deltaCount });
      if (surface === "perk-after") {
        checks.push({ id: "doctrine-deltas-rendered", ok: deltaCount === 3, actual: deltaCount });
        checks.push({ id: "mobile-modal-scroll-contained", ok: dimensions.scrollWidth <= dimensions.viewportWidth + 1, actual: dimensions });
      }
      if (surface === "threat-after") {
        const count = Number(arrowCount);
        checks.push({ id: "bounded-threat-compass", ok: count > 0 && count <= 8, actual: count });
      }
      for (const check of checks) {
        receipt.summary.checks += 1;
        if (check.ok) receipt.summary.passed += 1;
        else {
          receipt.summary.pass = false;
          receipt.summary.failures.push({ surface, theme: profile.theme, width: profile.width, ...check });
        }
      }
      receipt.captures.push({
        surface,
        ...profile,
        screenshot: { file, sha256: hash(path.join(outputDir, file)) },
        checks,
      });
      await context.close();
    }
  }
} finally {
  await browser.close();
}

fs.writeFileSync(path.join(outputDir, "receipt.json"), `${JSON.stringify(receipt, null, 2)}\n`);
console.log(`S161 visual QA: ${receipt.summary.pass ? "PASS" : "FAIL"} · ${receipt.summary.passed}/${receipt.summary.checks}`);
for (const failure of receipt.summary.failures) console.error(`- ${failure.surface}/${failure.theme}/${failure.width} · ${failure.id}: ${JSON.stringify(failure.actual)}`);
process.exitCode = receipt.summary.pass ? 0 : 1;
