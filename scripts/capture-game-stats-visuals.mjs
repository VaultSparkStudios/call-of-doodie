#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";

const root = process.cwd();
const origin = process.argv[2] || "http://127.0.0.1:4173";
const outputDir = path.join(root, "output", "playwright", "session-2026-08-06-game-stats");
const matrix = [
  { theme: "sewer-night", width: 1440, height: 1000 },
  { theme: "porcelain-day", width: 1440, height: 1000 },
  { theme: "sewer-night", width: 390, height: 844 },
  { theme: "porcelain-day", width: 390, height: 844 },
];

fs.rmSync(outputDir, { recursive: true, force: true });
fs.mkdirSync(outputDir, { recursive: true });

async function prime(page, item, errors = []) {
  await page.route("**/*.supabase.co/**", route => route.abort("internetdisconnected"));
  await page.addInitScript(({ theme }) => {
    localStorage.setItem("cod-theme", theme);
    localStorage.setItem("cod-callsign-v1", "VISUAL-QA");
    localStorage.setItem("cod-home-v2", "1");
    localStorage.setItem("cod-music-muted", "1");
    localStorage.setItem("cod-tutorial-v2", "1");
    localStorage.setItem("cod-career-v1", JSON.stringify({
      totalRuns: 48, totalKills: 2634, totalDeaths: 48, totalScore: 884200,
      bestScore: 79398, bestKills: 133, bestWave: 18, totalPlayTime: 41820,
      totalDamage: 722400, totalShots: 19420, totalHits: 10380, totalCrits: 1440,
      totalBossKills: 31, achievementsEver: ["first_blood"],
    }));
    localStorage.setItem("cod-run-history-v1", JSON.stringify(Array.from({ length: 12 }, (_, index) => ({
      score: 22000 - index * 700, kills: 80 - index, wave: 9 - Math.floor(index / 3), time: 540,
      difficulty: index < 3 ? "hard" : "normal", mode: index === 0 ? "zombies" : "standard", ts: Date.now() - index * 60000,
    }))));
    localStorage.setItem("cod-lb-v5", JSON.stringify([
      { name: "7272uwhe", score: 22370, wave: 4, kills: 34, lastWords: "EASY WORLD", feedbackDifficulty: "too_easy", difficulty: "normal", mode: "normal", time: "3:20" },
      { name: "RottenRoyalty", score: 19840, wave: 9, kills: 96, lastWords: "THE SEWER REMEMBERS", feedbackDifficulty: "dialed_in", difficulty: "hard", mode: "zombies", time: "8:01" },
      { name: "PorcelainAce", score: 15110, wave: 7, kills: 70, lastWords: "I REGRET NOTHING", feedbackDifficulty: "brutal", difficulty: "insane", mode: "cursed", time: "5:45" },
    ]));
  }, { theme: item.theme });
  await page.goto(`${origin}/?home=v2&theme=${item.theme}`, { waitUntil: "networkidle" });
  try {
    await page.locator('[data-testid="front-door-deploy"]').waitFor({ state: "visible" });
  } catch (error) {
    const diagnostic = await page.evaluate(() => ({
      url: location.href,
      title: document.title,
      body: String(document.body?.innerText || "").slice(0, 1200),
    })).catch(() => ({ url: page.url(), title: "", body: "" }));
    throw new Error(`${error.message}\n${JSON.stringify({ ...diagnostic, errors }, null, 2)}`);
  }
  await page.waitForTimeout(500);
}

async function screenshot(page, file) {
  await page.screenshot({ path: path.join(outputDir, file), fullPage: true });
}

async function captureItem(browser, item) {
  const context = await browser.newContext({ viewport: { width: item.width, height: item.height }, colorScheme: item.theme === "porcelain-day" ? "light" : "dark" });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(error.stack || error.message));
  await prime(page, item, errors);
  const suffix = `${item.theme}--${item.width}`;
  const modeButton = page.getByRole("button", { name: /Change mode or difficulty/i });
  const mobileMode = page.locator('select[aria-label="Mobile game mode"]');
  const deviceState = await page.evaluate(() => ({
    width: innerWidth,
    coarse: matchMedia("(pointer: coarse)").matches,
  }));
  console.log(`Command Deck device state · ${JSON.stringify({ ...item, ...deviceState, desktopControl: await modeButton.isVisible(), mobileControl: await mobileMode.isVisible() })}`);
  if (await modeButton.isVisible()) await modeButton.click();
  else await mobileMode.waitFor({ state: "visible" });
  await screenshot(page, `command-deck--${suffix}.png`);
  const homeState = await page.evaluate(() => ({
    terminal: Boolean(document.querySelector('[data-testid="sewer-network"]')),
    zombies: [...document.querySelectorAll("button, option")].some(node => /SEWER ZOMBIES/i.test(node.textContent || "")),
    overflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) > innerWidth + 1,
    cachedLeaderboard: JSON.parse(localStorage.getItem("cod-lb-v5") || "[]").length,
  }));

  const statsPage = await context.newPage();
  const statsErrors = [];
  statsPage.on("pageerror", error => statsErrors.push(error.stack || error.message));
  await statsPage.goto(`${origin}/stats/?theme=${item.theme}`, { waitUntil: "networkidle" });
  await statsPage.getByRole("heading", { name: "The sewer keeps receipts." }).waitFor({ state: "visible" });
  await screenshot(statsPage, `stats--${suffix}.png`);
  const statsState = await statsPage.evaluate(() => ({
    analyzedMetrics: document.querySelectorAll("main .card-grid .card").length,
    syntheticExclusionVisible: document.body.textContent.includes("28 automated health-check rows"),
    liveLinkVisible: [...document.querySelectorAll("a")].some(node => /OPEN THE LIVE SEWER NETWORK/i.test(node.textContent || "")),
    overflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) > innerWidth + 1,
  }));
  await statsPage.close();

  await page.getByRole("button", { name: /LEADERBOARD/i }).last().click();
  await page.getByRole("heading", { name: "GLOBAL LEADERBOARD" }).waitFor({ state: "visible" });
  await page.getByText("EASY WORLD", { exact: false }).first().waitFor({ state: "visible", timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(700);
  await screenshot(page, `leaderboard--${suffix}.png`);
  const leaderboardState = await page.evaluate(() => ({
    terminal: Boolean(document.querySelector('[data-testid="sewer-network"]')),
    lastWordsVisible: document.body.textContent.includes("EASY WORLD") || document.body.textContent.includes("THE SEWER REMEMBERS"),
    overflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) > innerWidth + 1,
  }));

  await page.getByRole("button", { name: "X", exact: true }).click();
  if (await mobileMode.isVisible().catch(() => false)) {
    await mobileMode.selectOption("zombies");
    await page.locator('select[aria-label="Mobile difficulty"]').selectOption("insane");
  } else {
    if (!await page.getByRole("button", { name: /SEWER ZOMBIES/i }).isVisible().catch(() => false)) {
      await page.getByRole("button", { name: /Change mode or difficulty/i }).click();
    }
    await page.getByRole("button", { name: /SEWER ZOMBIES/i }).click();
    await page.getByRole("button", { name: /INSANE/i }).click();
  }
  await page.locator('[data-testid="front-door-deploy"]').click();
  const skip = page.getByRole("button", { name: /SKIP.*GO IN CLEAN/i });
  await page.waitForTimeout(1200);
  if (await skip.isVisible().catch(() => false)) await skip.click();
  await page.locator("#game-canvas").waitFor({ state: "visible", timeout: 15000 });
  await page.getByText("YOU DIED", { exact: true }).waitFor({ state: "visible", timeout: 120000 });
  await page.waitForTimeout(800);
  await screenshot(page, `debrief--${suffix}.png`);
  const debriefState = await page.evaluate(() => ({
    terminal: Boolean(document.querySelector('[data-testid="sewer-network"]')),
    fieldReport: Boolean(document.querySelector('[data-testid="field-report"]')),
    zombies: document.body.textContent.includes("SEWER ZOMBIES"),
    overflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) > innerWidth + 1,
  }));
  await context.close();
  return { ...item, errors: [...errors, ...statsErrors], homeState, statsState, leaderboardState, debriefState };
}

const browser = await chromium.launch({ headless: true });
let results;
try {
  results = await Promise.all(matrix.map(item => captureItem(browser, item)));
} finally {
  await browser.close();
}
const checks = results.flatMap(result => [
  { id: "command-terminal", ok: result.homeState.terminal, capture: `${result.theme}/${result.width}/home` },
  { id: "zombies-option", ok: result.homeState.zombies, capture: `${result.theme}/${result.width}/home` },
  { id: "home-overflow", ok: !result.homeState.overflow, capture: `${result.theme}/${result.width}/home` },
  { id: "stats-analysis", ok: result.statsState.analyzedMetrics >= 4, capture: `${result.theme}/${result.width}/stats` },
  { id: "stats-synthetic-exclusion", ok: result.statsState.syntheticExclusionVisible, capture: `${result.theme}/${result.width}/stats` },
  { id: "stats-live-link", ok: result.statsState.liveLinkVisible, capture: `${result.theme}/${result.width}/stats` },
  { id: "stats-overflow", ok: !result.statsState.overflow, capture: `${result.theme}/${result.width}/stats` },
  { id: "leaderboard-terminal", ok: result.leaderboardState.terminal, capture: `${result.theme}/${result.width}/leaderboard` },
  { id: "visible-last-words", ok: result.leaderboardState.lastWordsVisible, capture: `${result.theme}/${result.width}/leaderboard` },
  { id: "leaderboard-overflow", ok: !result.leaderboardState.overflow, capture: `${result.theme}/${result.width}/leaderboard` },
  { id: "debrief-terminal", ok: result.debriefState.terminal, capture: `${result.theme}/${result.width}/debrief` },
  { id: "field-report", ok: result.debriefState.fieldReport, capture: `${result.theme}/${result.width}/debrief` },
  { id: "zombies-debrief", ok: result.debriefState.zombies, capture: `${result.theme}/${result.width}/debrief` },
  { id: "debrief-overflow", ok: !result.debriefState.overflow, capture: `${result.theme}/${result.width}/debrief` },
  { id: "page-errors", ok: result.errors.length === 0, actual: result.errors, capture: `${result.theme}/${result.width}` },
]);
const receipt = {
  schemaVersion: "game-stats-state-v1",
  generatedAt: new Date().toISOString(),
  baseUrl: origin,
  matrix,
  results,
  summary: {
    pass: checks.every(check => check.ok),
    checks: checks.length,
    passed: checks.filter(check => check.ok).length,
    failures: checks.filter(check => !check.ok),
  },
};
fs.writeFileSync(path.join(outputDir, "game-stats-visual-receipt.json"), `${JSON.stringify(receipt, null, 2)}\n`);
console.log(`Game stats visual state: ${receipt.summary.pass ? "PASS" : "FAIL"} · ${receipt.summary.passed}/${receipt.summary.checks}`);
if (!receipt.summary.pass) process.exitCode = 1;
