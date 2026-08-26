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
  console.error("Usage: node scripts/capture-s162-visuals.mjs --url <visual-harness-url> [--output <dir>]");
  process.exit(2);
}
const outputDir = path.resolve(process.cwd(), valueAfter("--output", "docs/visual-qa/session-162"));
fs.mkdirSync(outputDir, { recursive: true });

const surfaces = [
  { id: "order-hud-before", expected: "BEST-OF-3 0/2" },
  { id: "order-hud-after", expected: "EVIDENCE 1/2" },
  { id: "order-history-before", absent: "ORDER EVIDENCE" },
  { id: "order-history-after", expected: "REPEATABLE IMPROVEMENT" },
];
const receipt = { schemaVersion: 1, session: 162, generatedAt: new Date().toISOString(), baseUrl, captures: [] };
const browser = await chromium.launch({ headless: true });
try {
  for (const surface of surfaces) {
    for (const theme of ["sewer-night", "porcelain-day"]) {
      for (const width of [390, 1440]) {
        const context = await browser.newContext({ viewport: { width, height: 1000 }, colorScheme: theme === "porcelain-day" ? "light" : "dark" });
        await context.addInitScript(({ selectedTheme }) => {
          localStorage.setItem("cod-theme", selectedTheme);
        }, { selectedTheme: theme });
        const page = await context.newPage();
        const consoleErrors = [];
        const pageErrors = [];
        page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
        page.on("pageerror", (error) => pageErrors.push(error.message));
        const url = new URL("operation.html", baseUrl);
        url.searchParams.set("surface", surface.id);
        url.searchParams.set("theme", theme);
        const response = await page.goto(url.href, { waitUntil: "domcontentloaded" });
        await page.locator("#root").waitFor({ state: "attached" });
        await page.waitForTimeout(250);
        if (surface.id.startsWith("order-hud") && width === 390) {
          await page.getByTestId("hud-priority-chip").click();
          await page.getByTestId("hud-context-drawer").waitFor({ state: "visible" });
        }
        const state = await page.evaluate(({ expected, absent }) => {
          const text = document.body.innerText;
          const scrollPanel = document.querySelector("[data-gamepad-scroll]");
          return {
            appliedTheme: document.documentElement.dataset.codTheme,
            expectedVisible: expected ? text.includes(expected) : true,
            absentConfirmed: absent ? !text.includes(absent) : true,
            panelNoHorizontalOverflow: scrollPanel ? scrollPanel.scrollWidth <= scrollPanel.clientWidth + 1 : true,
            documentNoHorizontalOverflow: document.documentElement.scrollWidth <= innerWidth + 1,
          };
        }, surface);
        const file = `${surface.id}--${theme}--${width}.png`;
        await page.screenshot({ path: path.join(outputDir, file), fullPage: false });
        const checks = [
          { id: "http-ok", ok: Boolean(response?.ok()), actual: response?.status() ?? null },
          { id: "theme-applied", ok: state.appliedTheme === theme, actual: state.appliedTheme },
          { id: "expected-visible", ok: state.expectedVisible, actual: surface.expected || null },
          { id: "baseline-absence", ok: state.absentConfirmed, actual: surface.absent || null },
          { id: "panel-no-horizontal-overflow", ok: state.panelNoHorizontalOverflow, actual: state.panelNoHorizontalOverflow },
          { id: "document-no-horizontal-overflow", ok: state.documentNoHorizontalOverflow, actual: state.documentNoHorizontalOverflow },
          { id: "no-console-errors", ok: consoleErrors.length === 0, actual: consoleErrors },
          { id: "no-page-errors", ok: pageErrors.length === 0, actual: pageErrors },
        ];
        receipt.captures.push({ surface: surface.id, theme, width, screenshot: file, checks, pass: checks.every((check) => check.ok) });
        await context.close();
      }
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
fs.writeFileSync(path.join(outputDir, "receipt.json"), `${JSON.stringify(receipt, null, 2)}\n`);
console.log(`S162 visual QA: ${receipt.summary.pass ? "PASS" : "FAIL"} · ${receipt.summary.passed}/${receipt.summary.checks}`);
if (!receipt.summary.pass) process.exitCode = 1;
