#!/usr/bin/env node

// Usage: node scripts/capture-operation-visuals.mjs --url <staging-url> [--output <dir>]
// Captures the authored Operation command deck and the real in-game arena overlay.

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";

const valueAfter = (name, fallback = null) => {
  const inline = process.argv.find((arg) => arg.startsWith(`${name}=`));
  if (inline) return inline.slice(name.length + 1);
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : fallback;
};
const baseUrl = valueAfter("--url");
if (!baseUrl || !/^https?:\/\//.test(baseUrl)) {
  console.error("Usage: node scripts/capture-operation-visuals.mjs --url <staging-url> [--output <dir>]");
  process.exit(2);
}

const outputDir = path.resolve(valueAfter("--output", "output/playwright/operation-visuals"));
const matrix = [
  { theme: "sewer-night", width: 390, colorScheme: "dark" },
  { theme: "sewer-night", width: 1440, colorScheme: "dark" },
  { theme: "porcelain-day", width: 390, colorScheme: "light" },
  { theme: "porcelain-day", width: 1440, colorScheme: "light" },
];
const hash = (file) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
fs.mkdirSync(outputDir, { recursive: true });

const movementKeys = {
  EAST: ["KeyD"],
  "SOUTH-EAST": ["KeyS", "KeyD"],
  SOUTH: ["KeyS"],
  "SOUTH-WEST": ["KeyS", "KeyA"],
  WEST: ["KeyA"],
  "NORTH-WEST": ["KeyW", "KeyA"],
  NORTH: ["KeyW"],
  "NORTH-EAST": ["KeyW", "KeyD"],
};

async function moveIntoInteractionRange(page, interaction, proximity) {
  const trace = [];
  for (let step = 0; step < 48; step += 1) {
    const state = await page.evaluate(() => {
      const button = document.querySelector('[data-testid="operation-interact"]');
      const guidance = document.querySelector('[data-testid="operation-proximity-status"]');
      return { exists: Boolean(button), disabled: button?.disabled ?? true, guidance: guidance?.textContent || "" };
    });
    trace.push(state.guidance);
    if (!state.exists || !state.disabled) return { ...state, trace };
    const guidance = state.guidance;
    const distance = Number(guidance.match(/(\d+) PX TO RANGE/)?.[1] || 0);
    const direction = guidance.match(/MOVE ([A-Z-]+)/)?.[1];
    const keys = movementKeys[direction] || [];
    if (!keys.length) break;
    for (const key of keys) await page.keyboard.down(key);
    await page.waitForTimeout(distance > 160 ? 160 : distance > 60 ? 100 : distance > 20 ? 60 : 30);
    for (const key of keys) await page.keyboard.up(key);
    await page.waitForTimeout(80);
  }
  const finalState = await page.evaluate(() => {
    const button = document.querySelector('[data-testid="operation-interact"]');
    const guidance = document.querySelector('[data-testid="operation-proximity-status"]');
    return { exists: Boolean(button), disabled: button?.disabled ?? true, guidance: guidance?.textContent || "" };
  });
  return { ...finalState, trace };
}

const receipt = {
  schemaVersion: "operation-rendered-pixel-v1",
  generatedAt: new Date().toISOString(),
  baseUrl,
  captures: [],
  summary: { pass: true, checks: 0, passed: 0, failures: [] },
};
const browser = await chromium.launch({ headless: true });
try {
  for (const entry of matrix) {
    const context = await browser.newContext({
      viewport: { width: entry.width, height: 1000 },
      colorScheme: entry.colorScheme,
      reducedMotion: "reduce",
    });
    await context.addInitScript(({ theme }) => {
      localStorage.setItem("cod-theme", theme);
      localStorage.setItem("cod-callsign-v1", "OPERATION-QA");
      localStorage.setItem("cod-home-v2", "1");
      localStorage.setItem("cod-onboarding-complete", "1");
    }, { theme: entry.theme });
    const page = await context.newPage();
    const pageErrors = [];
    const consoleErrors = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
    const url = new URL("/?home=v2", baseUrl);
    url.searchParams.set("theme", entry.theme);
    const response = await page.goto(url.href, { waitUntil: "domcontentloaded" });

    const deck = page.locator('[data-testid="operation-command-deck"]');
    await deck.waitFor({ state: "visible" });
    const firstCard = deck.locator("article[data-operation-id]").first();
    const routes = firstCard.locator('input[type="radio"]');
    const routeCount = await routes.count();
    if (routeCount > 1) await routes.nth(1).check();
    const selectedRoute = await firstCard.locator('input[type="radio"]:checked').getAttribute("value");
    const start = firstCard.getByRole("button", { name: /start operation/i });
    const startBox = await start.boundingBox();
    const deckFile = `operation-deck--${entry.theme}--${entry.width}.png`;
    await (entry.width <= 430 ? firstCard : deck).screenshot({ path: path.join(outputDir, deckFile) });

    await start.click();
    const skipDraft = page.getByRole("button", { name: /skip.*go in clean/i });
    if (await skipDraft.waitFor({ state: "visible", timeout: 10000 }).then(() => true).catch(() => false)) {
      await skipDraft.click();
    }
    const overlay = page.locator('[data-testid="operation-arena-overlay"]');
    try {
      await overlay.waitFor({ state: "visible", timeout: 30000 });
    } catch (error) {
      const diagnosticFile = `operation-start-failure--${entry.theme}--${entry.width}.png`;
      await page.screenshot({ path: path.join(outputDir, diagnosticFile), fullPage: false });
      const diagnostic = await page.evaluate(() => ({
        url: location.href,
        canvasCount: document.querySelectorAll("canvas").length,
        dialogCount: document.querySelectorAll('[role="dialog"]').length,
        text: document.body.innerText.slice(0, 1200),
      }));
      throw new Error(`Operation did not enter the arena: ${JSON.stringify({ diagnostic, pageErrors, consoleErrors, diagnosticFile })}`, { cause: error });
    }
    const interaction = overlay.locator('[data-testid="operation-interact"]');
    const proximity = overlay.locator('[data-testid="operation-proximity-status"]');
    await page.locator("#game-canvas").waitFor({ state: "visible", timeout: 30000 });
    await page.getByRole("status", { name: /loading game panel/i }).waitFor({ state: "hidden", timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(500);
    const interactionBox = await interaction.boundingBox();
    const lockedInitially = await interaction.isDisabled();
    const initialGuidance = await proximity.innerText();
    const overlayFile = `operation-arena--${entry.theme}--${entry.width}.png`;
    await page.screenshot({ path: path.join(outputDir, overlayFile), fullPage: false });

    const movementResult = await moveIntoInteractionRange(page, interaction, proximity);
    const reachable = movementResult.exists && !movementResult.disabled;
    const inRangeFile = `operation-arena-in-range--${entry.theme}--${entry.width}.png`;
    await page.screenshot({ path: path.join(outputDir, inRangeFile), fullPage: false });
    if (!reachable) throw new Error(`Operation target could not be reached by player movement: ${JSON.stringify(movementResult)}`);
    await interaction.click();
    const completedFile = `operation-arena-complete--${entry.theme}--${entry.width}.png`;
    await page.screenshot({ path: path.join(outputDir, completedFile), fullPage: false });

    const dimensions = await page.evaluate(() => ({
      viewport: innerWidth,
      scroll: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
      theme: document.documentElement.dataset.codTheme,
    }));
    const checks = [
      { id: "http-ok", ok: Boolean(response?.ok()), actual: response?.status() ?? null },
      { id: "theme-applied", ok: dimensions.theme === entry.theme, actual: dimensions.theme },
      { id: "two-authored-routes", ok: routeCount === 2, actual: routeCount },
      { id: "route-selectable", ok: Boolean(selectedRoute), actual: selectedRoute },
      { id: "start-touch-target", ok: (startBox?.height || 0) >= 48, actual: startBox?.height || 0 },
      { id: "interaction-touch-target", ok: (interactionBox?.height || 0) >= 48, actual: interactionBox?.height || 0 },
      { id: "spatial-lock-rendered", ok: lockedInitially, actual: { lockedInitially, initialGuidance } },
      { id: "proximity-guidance-rendered", ok: /(?:PX TO RANGE|IN RANGE)/.test(initialGuidance), actual: initialGuidance },
      { id: "interaction-reachable-by-movement", ok: reachable, actual: movementResult },
      { id: "no-horizontal-overflow", ok: dimensions.scroll <= dimensions.viewport + 1, actual: `${dimensions.scroll}/${dimensions.viewport}` },
      { id: "no-page-errors", ok: pageErrors.length === 0, actual: pageErrors },
      { id: "no-console-errors", ok: consoleErrors.length === 0, actual: consoleErrors },
    ];
    for (const check of checks) {
      receipt.summary.checks += 1;
      if (check.ok) receipt.summary.passed += 1;
      else {
        receipt.summary.pass = false;
        receipt.summary.failures.push({ theme: entry.theme, width: entry.width, ...check });
      }
    }
    receipt.captures.push({
      ...entry,
      selectedRoute,
      screenshots: [deckFile, overlayFile, inRangeFile, completedFile].map((file) => ({ file, sha256: hash(path.join(outputDir, file)) })),
      checks,
    });
    await context.close();
  }
} finally {
  await browser.close();
}

fs.writeFileSync(path.join(outputDir, "operation-visual-receipt.json"), `${JSON.stringify(receipt, null, 2)}\n`);
console.log(`Operation visual QA: ${receipt.summary.pass ? "PASS" : "FAIL"} · ${receipt.summary.passed}/${receipt.summary.checks}`);
for (const failure of receipt.summary.failures) console.error(`- ${failure.theme}/${failure.width} · ${failure.id}: ${JSON.stringify(failure.actual)}`);
process.exitCode = receipt.summary.pass ? 0 : 1;
