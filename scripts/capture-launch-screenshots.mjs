#!/usr/bin/env node
/**
 * Captures 5 real Playwright screenshots for the PWA manifest and Itch.io listing.
 *
 * Scenes:
 *   1. real-combat.png      — desktop gameplay (1280×720)
 *   2. real-draft.png       — pre-deployment perk draft screen (1280×720)
 *   3. real-deploy.png      — deploy dropdown showing all 7 modes + 4 difficulties (1280×720)
 *   4. real-achievements.png — career achievements panel with injected demo data (1280×720)
 *   5. real-mobile.png      — mobile gameplay (390×844)
 *
 * Usage:
 *   npm run launch:screenshots
 *   COD_SCREENSHOT_PORT=53173 node scripts/capture-launch-screenshots.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { execFileSync } from "node:child_process";
import { chromium } from "@playwright/test";

const ROOT = process.cwd();
const PORT = Number(process.env.COD_SCREENSHOT_PORT || 53173);
const ORIGIN = `http://127.0.0.1:${PORT}`;
const OUT_DIR = path.join(ROOT, "public", "launch-captures");

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer(timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(ORIGIN);
      if (res.ok) return true;
    } catch {}
    await wait(500);
  }
  return false;
}

function startServer() {
  const isWindows = process.platform === "win32";
  return spawn(
    isWindows ? "cmd" : "npm",
    isWindows
      ? ["/c", "npm", "run", "dev", "--", "--host", "127.0.0.1", "--port", String(PORT), "--strictPort"]
      : ["run", "dev", "--", "--host", "127.0.0.1", "--port", String(PORT), "--strictPort"],
    {
      cwd: ROOT,
      stdio: "ignore",
      env: { ...process.env, BROWSER: "none" },
    },
  );
}

function stopServer(server) {
  if (!server || server.killed) return;
  if (process.platform === "win32") {
    try {
      execFileSync("taskkill", ["/PID", String(server.pid), "/T", "/F"], { stdio: "ignore" });
      return;
    } catch {}
  }
  server.kill("SIGTERM");
}

// Demo data injected into localStorage so the achievements panel looks populated.
const DEMO_ACHIEVEMENT_IDS = [
  "first_blood", "combo_5", "combo_10", "combo_20",
  "wave_5", "wave_10", "wave_15", "wave_20",
  "kills_50", "kills_100", "kills_200",
  "streak_10", "streak_25",
  "karen_boss", "karen_boss_5",
  "score_10k", "score_50k", "score_100k",
  "first_perk", "perk_5", "perk_10",
  "first_upgrade", "boss_wave_clear", "boss_wave_5",
  "synergy_first", "nemesis_slain",
  "cursed_run_w5", "speedrun_w5", "gauntlet_w5",
];

const DEMO_CAREER = {
  totalKills: 8420,
  totalDeaths: 84,
  bestScore: 38200,
  bestWave: 22,
  totalRuns: 84,
  playTime: 28800,
  achievementsEver: DEMO_ACHIEVEMENT_IDS,
  bestStreak: 27,
  totalDamage: 312000,
  bossKills: 18,
};

async function primeGamePage(page, viewport) {
  await page.setViewportSize(viewport);
  await page.addInitScript((careerData) => {
    localStorage.setItem("cod-callsign-v1", "LaunchTester");
    localStorage.setItem("cod-home-v2", "1");
    localStorage.setItem("cod-music-muted", "1");
    localStorage.setItem("cod-career-v1", JSON.stringify(careerData));
    localStorage.setItem(
      "cod-top-ghosts-v1-standard-normal",
      JSON.stringify([
        { name: "LaunchRival", score: 4200, wave: 7, mode: "standard", difficulty: "normal" },
        { name: "PorcelainAce", score: 3100, wave: 6, mode: "standard", difficulty: "normal" },
      ]),
    );
  }, DEMO_CAREER);
  await page.goto(`${ORIGIN}/?home=v2`, { waitUntil: "networkidle" });
}

// Click DEPLOY (main button) then skip through the draft screen to reach gameplay.
async function clickDeployAndSkipDraft(page) {
  const deployBtn = page.getByRole("button", { name: /deploy/i }).first();
  await deployBtn.click({ timeout: 10000 });
  await wait(700);
  // Try clicking SKIP if the DraftScreen is showing, otherwise re-click DEPLOY
  // (second click proceeds past draft since draftShownRef is now true)
  const skipBtn = page.getByRole("button", { name: /skip/i });
  try {
    await skipBtn.click({ timeout: 2000 });
  } catch {
    const deployBtn2 = page.getByRole("button", { name: /deploy/i }).first();
    try {
      await deployBtn2.click({ timeout: 1500 });
    } catch {}
  }
}

async function capture() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  // Use pre-installed Chromium if available (remote cloud environment).
  const chromiumPath = "/opt/pw-browsers/chromium";
  const launchOpts = fs.existsSync(chromiumPath)
    ? { executablePath: chromiumPath }
    : {};

  const server = startServer();
  let serverReady = false;
  try {
    serverReady = await waitForServer();
    if (!serverReady) throw new Error(`Vite server did not become ready at ${ORIGIN}.`);

    const browser = await chromium.launch(launchOpts);
    try {
      // ── Scene 1: In-game combat (desktop) ────────────────────────────────────
      {
        const page = await browser.newPage();
        await primeGamePage(page, { width: 1280, height: 720 });
        await clickDeployAndSkipDraft(page);
        await page.waitForSelector("#game-canvas", { timeout: 15000 });
        await wait(8000); // Wait for waves of enemies to fill the screen
        await page.screenshot({ path: path.join(OUT_DIR, "real-combat.png"), fullPage: false });
        await page.close();
        console.log("✓ Captured real-combat.png");
      }

      // ── Scene 2: Pre-deployment perk draft screen ─────────────────────────────
      {
        const page = await browser.newPage();
        await primeGamePage(page, { width: 1280, height: 720 });
        // Clicking main DEPLOY triggers startGame → DraftScreen on the first call
        const deployBtn = page.getByRole("button", { name: /deploy/i }).first();
        await deployBtn.click({ timeout: 10000 });
        // Wait for DraftScreen heading
        await page.waitForSelector("text=CHOOSE YOUR EDGE", { timeout: 8000 });
        await wait(500);
        await page.screenshot({ path: path.join(OUT_DIR, "real-draft.png"), fullPage: false });
        await page.close();
        console.log("✓ Captured real-draft.png");
      }

      // ── Scene 3: Deploy dropdown (7 modes × 4 difficulties) ──────────────────
      {
        const page = await browser.newPage();
        await primeGamePage(page, { width: 1280, height: 720 });
        // The dropdown toggle is separate from the main DEPLOY button
        const dropdownBtn = page.getByRole("button", { name: /change mode/i });
        await dropdownBtn.click({ timeout: 10000 });
        await wait(700);
        await page.screenshot({ path: path.join(OUT_DIR, "real-deploy.png"), fullPage: false });
        await page.close();
        console.log("✓ Captured real-deploy.png");
      }

      // ── Scene 4: Career achievements panel ───────────────────────────────────
      {
        const page = await browser.newPage();
        await primeGamePage(page, { width: 1280, height: 720 });
        await wait(800); // Let career stats hydrate from localStorage
        // Click the ACHIEVEMENTS quick chip
        const achievBtn = page.getByRole("button", { name: /achievements/i });
        await achievBtn.click({ timeout: 8000 });
        await wait(800); // Let the lazy-loaded panel mount
        await page.screenshot({ path: path.join(OUT_DIR, "real-achievements.png"), fullPage: false });
        await page.close();
        console.log("✓ Captured real-achievements.png");
      }

      // ── Scene 5: Mobile gameplay ──────────────────────────────────────────────
      {
        const page = await browser.newPage();
        await primeGamePage(page, { width: 390, height: 844 });
        await clickDeployAndSkipDraft(page);
        await page.waitForSelector("#game-canvas", { timeout: 15000 });
        await wait(8000); // Wait for action on mobile
        await page.screenshot({ path: path.join(OUT_DIR, "real-mobile.png"), fullPage: false });
        await page.close();
        console.log("✓ Captured real-mobile.png");
      }
    } finally {
      await browser.close();
    }

    console.log(`\nAll 5 captures saved to ${OUT_DIR}`);
  } finally {
    stopServer(server);
  }
}

capture().catch((error) => {
  console.error(`Launch screenshot capture failed: ${error.message}`);
  process.exit(1);
});
