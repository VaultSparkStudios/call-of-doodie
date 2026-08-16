#!/usr/bin/env node

// Usage: node scripts/capture-operation-modal-visuals.mjs --url <local-harness-url> [--output <dir>]

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
  console.error("Usage: node scripts/capture-operation-modal-visuals.mjs --url <local-harness-url> [--output <dir>]");
  process.exit(2);
}
const outputDir = path.resolve(valueAfter("--output", "output/playwright/operation-modal"));
const matrix = [
  { theme: "sewer-night", width: 390, colorScheme: "dark" },
  { theme: "sewer-night", width: 1440, colorScheme: "dark" },
  { theme: "porcelain-day", width: 390, colorScheme: "light" },
  { theme: "porcelain-day", width: 1440, colorScheme: "light" },
];
const hash = (file) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
fs.mkdirSync(outputDir, { recursive: true });
const receipt = { schemaVersion: "operation-completion-rendered-pixel-v1", generatedAt: new Date().toISOString(), baseUrl, captures: [], summary: { pass: true, checks: 0, passed: 0, failures: [] } };
const browser = await chromium.launch({ headless: true });
try {
  for (const entry of matrix) {
    const context = await browser.newContext({ viewport: { width: entry.width, height: 1000 }, colorScheme: entry.colorScheme, reducedMotion: "reduce" });
    const page = await context.newPage();
    const pageErrors = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    const url = new URL(baseUrl);
    url.searchParams.set("theme", entry.theme);
    const response = await page.goto(url.href, { waitUntil: "domcontentloaded" });
    const dialog = page.getByRole("dialog");
    await dialog.waitFor({ state: "visible" });
    const actions = dialog.getByRole("button");
    const actionCount = await actions.count();
    const actionHeights = [];
    for (let index = 0; index < actionCount; index += 1) actionHeights.push((await actions.nth(index).boundingBox())?.height || 0);
    const modalFile = `operation-complete--${entry.theme}--${entry.width}.png`;
    await page.screenshot({ path: path.join(outputDir, modalFile), fullPage: false });
    const commandPost = dialog.locator("details");
    await commandPost.locator("summary").click();
    await commandPost.scrollIntoViewIfNeeded();
    const commandPostFile = `operation-command-post--${entry.theme}--${entry.width}.png`;
    await commandPost.screenshot({ path: path.join(outputDir, commandPostFile) });
    const dimensions = await page.evaluate(() => ({ viewport: innerWidth, scroll: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth), theme: document.documentElement.dataset.codTheme }));
    const text = await dialog.innerText();
    const checks = [
      { id: "http-ok", ok: Boolean(response?.ok()), actual: response?.status() ?? null },
      { id: "theme-applied", ok: dimensions.theme === entry.theme, actual: dimensions.theme },
      { id: "victory-readable", ok: /MISSION VICTORY/.test(text), actual: /MISSION VICTORY/.test(text) },
      { id: "honest-gates", ok: /not live yet/.test(text) && /not connected/.test(text), actual: text },
      { id: "exactly-three-actions", ok: actionCount === 3, actual: actionCount },
      { id: "action-touch-targets", ok: actionHeights.every((height) => height >= 48), actual: actionHeights },
      { id: "command-post-expanded", ok: await commandPost.getAttribute("open") !== null, actual: await commandPost.getAttribute("open") },
      { id: "no-horizontal-overflow", ok: dimensions.scroll <= dimensions.viewport + 1, actual: `${dimensions.scroll}/${dimensions.viewport}` },
      { id: "no-page-errors", ok: pageErrors.length === 0, actual: pageErrors },
    ];
    for (const check of checks) {
      receipt.summary.checks += 1;
      if (check.ok) receipt.summary.passed += 1;
      else { receipt.summary.pass = false; receipt.summary.failures.push({ theme: entry.theme, width: entry.width, ...check }); }
    }
    receipt.captures.push({ ...entry, screenshots: [modalFile, commandPostFile].map((file) => ({ file, sha256: hash(path.join(outputDir, file)) })), checks });
    await context.close();
  }
} finally {
  await browser.close();
}
fs.writeFileSync(path.join(outputDir, "operation-modal-visual-receipt.json"), `${JSON.stringify(receipt, null, 2)}\n`);
console.log(`Operation completion visual QA: ${receipt.summary.pass ? "PASS" : "FAIL"} · ${receipt.summary.passed}/${receipt.summary.checks}`);
for (const failure of receipt.summary.failures) console.error(`- ${failure.theme}/${failure.width} · ${failure.id}: ${JSON.stringify(failure.actual)}`);
process.exitCode = receipt.summary.pass ? 0 : 1;
