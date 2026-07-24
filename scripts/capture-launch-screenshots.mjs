#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { spawn } from "./lib/safe-spawn.mjs";
import { execFileSync } from "./lib/safe-spawn.mjs";
import { chromium } from "@playwright/test";

const ROOT = process.cwd();
const PORT = Number(process.env.COD_SCREENSHOT_PORT || 53173);
const ORIGIN = `http://127.0.0.1:${PORT}`;
const OUT_DIR = path.join(ROOT, "public", "launch-captures");

const SCENES = [
  "real-combat.png",
  "real-boss-rush.png",
  "real-loadout-builder.png",
  "real-leaderboard.png",
  "real-mobile-controls.png",
];

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
  return spawn(isWindows ? "cmd" : "npm", isWindows
    ? ["/c", "npm", "run", "dev", "--", "--host", "127.0.0.1", "--port", String(PORT), "--strictPort"]
    : ["run", "dev", "--", "--host", "127.0.0.1", "--port", String(PORT), "--strictPort"], {
    cwd: ROOT,
    stdio: "ignore",
    env: { ...process.env, BROWSER: "none" },
  });
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

async function primeGamePage(page, viewport) {
  await page.setViewportSize(viewport);
  await page.addInitScript(() => {
    localStorage.setItem("cod-callsign-v1", "LaunchTester");
    localStorage.setItem("cod-home-v2", "1");
    localStorage.setItem("cod-music-muted", "1");
    localStorage.setItem("cod-career-v2", JSON.stringify({
      totalKills: 2600,
      totalRuns: 42,
      bestScore: 4200,
      bestWave: 18,
      totalBossKills: 8,
      weaponKills: [520, 410, 390, 260, 210, 180, 150, 120, 100, 80, 55, 45],
      enemyKillBests: {
        0: { careerKills: 400, waveMax: 18, killedByCount: 2 },
        1: { careerKills: 180, waveMax: 15, killedByCount: 4 },
      },
    }));
    localStorage.setItem("cod-meta-v2", JSON.stringify({
      careerPoints: 32,
      unlocked: ["damage_1", "health_1", "speed_1"],
      prestige: 1,
    }));
    localStorage.setItem("cod-loadouts-v1", JSON.stringify([
      { name: "Boss Mop", weaponIdx: 3, starterLoadout: "tank" },
      { name: "Speed Clean", weaponIdx: 6, starterLoadout: "speedster" },
      null,
    ]));
    localStorage.setItem("cod-lb-v5", JSON.stringify([
      { name: "LaunchRival", score: 8420, wave: 18, kills: 312, difficulty: "normal", mode: "boss_rush", accountLevel: 21, inputDevice: "controller", starterLoadout: "tank", supporter: true },
      { name: "PorcelainAce", score: 7310, wave: 16, kills: 290, difficulty: "normal", mode: "normal", accountLevel: 17, inputDevice: "mouse", starterLoadout: "standard" },
      { name: "PlungerPilot", score: 6880, wave: 15, kills: 251, difficulty: "hard", mode: "daily_challenge", accountLevel: 14, inputDevice: "mobile", starterLoadout: "cannon" },
      { name: "WiFiWarrior", score: 5400, wave: 12, kills: 218, difficulty: "normal", mode: "gauntlet", accountLevel: 9, inputDevice: "xbox", starterLoadout: "speedster" },
    ]));
    localStorage.setItem("cod-top-ghosts-v1-standard-normal", JSON.stringify([
      { name: "LaunchRival", score: 4200, wave: 7, mode: "standard", difficulty: "normal" },
      { name: "PorcelainAce", score: 3100, wave: 6, mode: "standard", difficulty: "normal" },
    ]));
  });
  await page.goto(`${ORIGIN}/?home=v2`, { waitUntil: "networkidle" });
}

async function clickFirstDeploy(page) {
  const deploy = page.getByRole("button", { name: /deploy|start|play/i }).first();
  await deploy.click({ timeout: 10000 });
  await page.waitForTimeout(600);
  const maybeDraft = page.getByRole("button", { name: /draft|skip|confirm|deploy|start|play/i }).first();
  try {
    await maybeDraft.click({ timeout: 2000 });
  } catch {}
}

async function clickByText(page, pattern, timeout = 10000) {
  try {
    await page.getByRole("button", { name: pattern }).first().click({ timeout });
    return;
  } catch {}
  const clicked = await page.evaluate((source) => {
    const re = new RegExp(source, "i");
    const button = [...document.querySelectorAll("button")].find((node) => re.test(node.textContent || ""));
    if (!button) return false;
    button.scrollIntoView({ block: "center", inline: "center" });
    button.click();
    return true;
  }, pattern.source);
  if (!clicked) throw new Error(`No clickable button text matched ${pattern}`);
}

async function capturePage(page, name) {
  await page.screenshot({ path: path.join(OUT_DIR, name), fullPage: false });
  console.log(`Captured public/launch-captures/${name}`);
}

async function capture() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const server = startServer();
  let serverReady = false;
  try {
    serverReady = await waitForServer();
    if (!serverReady) throw new Error(`Vite server did not become ready at ${ORIGIN}.`);

    const browser = await chromium.launch();
    try {
      const combat = await browser.newPage();
      await primeGamePage(combat, { width: 1280, height: 720 });
      await clickFirstDeploy(combat);
      await combat.waitForSelector("#game-canvas", { timeout: 15000 });
      await combat.waitForTimeout(1800);
      await capturePage(combat, "real-combat.png");
      await combat.close();

      const boss = await browser.newPage();
      await primeGamePage(boss, { width: 1280, height: 720 });
      await boss.getByRole("button", { name: /change mode or difficulty/i }).click({ timeout: 10000 });
      await clickByText(boss, /BOSS RUSH/i);
      await clickFirstDeploy(boss);
      await boss.waitForSelector("#game-canvas", { timeout: 15000 });
      await boss.waitForTimeout(4200);
      await capturePage(boss, "real-boss-rush.png");
      await boss.close();

      const loadout = await browser.newPage();
      await primeGamePage(loadout, { width: 1280, height: 720 });
      const playerHub = loadout.getByRole("button", { name: /PLAYER HUB/i }).first();
      if (await playerHub.getAttribute("aria-expanded") !== "true") await playerHub.click();
      await clickByText(loadout, /LOADOUTS/i);
      await loadout.waitForSelector("text=CUSTOM LOADOUTS", { timeout: 15000 });
      await loadout.waitForTimeout(600);
      await capturePage(loadout, "real-loadout-builder.png");
      await loadout.close();

      const leaderboard = await browser.newPage();
      await primeGamePage(leaderboard, { width: 1280, height: 720 });
      await clickByText(leaderboard, /LEADERBOARD/i);
      await leaderboard.waitForSelector("text=GLOBAL LEADERBOARD", { timeout: 15000 });
      await leaderboard.waitForTimeout(900);
      await capturePage(leaderboard, "real-leaderboard.png");
      await leaderboard.close();

      const mobile = await browser.newPage();
      await primeGamePage(mobile, { width: 390, height: 844 });
      await clickFirstDeploy(mobile);
      await mobile.waitForSelector("#game-canvas", { timeout: 15000 });
      await mobile.waitForTimeout(1800);
      await capturePage(mobile, "real-mobile-controls.png");
      await mobile.close();
    } finally {
      await browser.close();
    }

    console.log(`Launch screenshot capture complete: ${SCENES.length} scene(s).`);
  } finally {
    stopServer(server);
  }
}

capture().catch((error) => {
  console.error(`Launch screenshot capture failed: ${error.message}`);
  process.exit(1);
});
