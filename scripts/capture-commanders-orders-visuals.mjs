#!/usr/bin/env node
// S148 visual QA — Commander's Orders unified card
// Captures the four required states (onboarding+veteran) × two themes × two viewports.

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";

const ROOT = process.cwd();
const canonicalDir = path.join(ROOT, "docs", "visual-qa");
const outputDir = path.join(ROOT, "output", "playwright", "session-148-commanders-orders");
fs.mkdirSync(outputDir, { recursive: true });
fs.mkdirSync(canonicalDir, { recursive: true });

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:53173";
const sha256 = (file) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");

const VETERAN_CAREER = JSON.stringify({ totalRuns: 5, bestWave: 12, bestScore: 4200, totalKills: 220, totalDeaths: 5 });
const THEMES = ["sewer-night", "porcelain-day"];
const WIDTHS = [1440, 390];

const STATES = [
  {
    id: "onboarding",
    label: "Onboarding (new player — FIRST 3 RUNS view)",
    storage: { "cod-callsign-v1": "VISUAL-QA" },
  },
  {
    id: "veteran",
    label: "Veteran (ORDERS directive + Intel Ticker inline)",
    storage: { "cod-callsign-v1": "VISUAL-QA", "cod-career-v1": VETERAN_CAREER },
  },
];

const captures = [];
const checks = [];

const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.PLAYWRIGHT_BROWSERS_PATH
    ? `${process.env.PLAYWRIGHT_BROWSERS_PATH}/chromium`
    : undefined,
});

for (const state of STATES) {
  for (const theme of THEMES) {
    for (const width of WIDTHS) {
      const height = width <= 430 ? 844 : 1000;
      const context = await browser.newContext({
        viewport: { width, height },
        colorScheme: theme === "porcelain-day" ? "light" : "dark",
      });
      await context.addInitScript(({ storage }) => {
        for (const [k, v] of Object.entries(storage)) localStorage.setItem(k, v);
      }, { storage: { ...state.storage, "cod-theme": theme } });

      const page = await context.newPage();
      await page.goto(BASE_URL, { waitUntil: "networkidle" });

      // Wait for the unified card to appear
      const card = page.locator('[data-testid="commanders-orders-card"]');
      await card.waitFor({ state: "visible", timeout: 15000 });

      // Confirm expected text is present for this state
      const cardText = await card.textContent();
      const hasExpectedContent = state.id === "onboarding"
        ? cardText.includes("FIRST 3 RUNS") || cardText.includes("COMMANDER'S ORDERS")
        : cardText.includes("ORDERS ·") || cardText.includes("NEXT:");

      checks.push({
        id: `${state.id}--${theme}--${width}`,
        label: `${state.label} · ${theme} · ${width}px`,
        ok: hasExpectedContent,
        detail: hasExpectedContent ? "expected content present" : `expected content missing; got: ${cardText?.slice(0, 120)}`,
      });

      // Scroll card into view and capture full page
      await card.scrollIntoViewIfNeeded();
      const filename = `commanders-orders--${state.id}--${theme}--${width}.png`;
      const filepath = path.join(outputDir, filename);
      await page.screenshot({ path: filepath, fullPage: false });

      const canonicalPath = path.join(canonicalDir, filename);
      fs.copyFileSync(filepath, canonicalPath);

      captures.push({
        file: filename,
        sha256: sha256(canonicalPath),
        theme: theme === "porcelain-day" ? "light" : "dark",
        projectTheme: theme,
        state: state.id,
        viewport: { width, height },
        page: `Commander's Orders card — ${state.label}`,
      });
      console.log(`Captured: ${filename} (${hasExpectedContent ? "PASS" : "FAIL"})`);
      await context.close();
    }
  }
}

await browser.close();

const failures = checks.filter((c) => !c.ok);
const summary = { pass: failures.length === 0, total: checks.length, passed: checks.length - failures.length, failures };
if (!summary.pass) {
  console.error("VISUAL QA FAILURES:");
  for (const f of failures) console.error(`  FAIL: ${f.label} — ${f.detail}`);
  process.exit(1);
}

const receiptPath = path.join(outputDir, "commanders-orders-receipt.json");
const receipt = { schemaVersion: 1, generatedAt: new Date().toISOString(), baseUrl: BASE_URL, summary, captures };
fs.writeFileSync(receiptPath, JSON.stringify(receipt, null, 2) + "\n");
console.log(`Receipt: ${path.relative(ROOT, receiptPath)} · ${summary.passed}/${summary.total} PASS`);
