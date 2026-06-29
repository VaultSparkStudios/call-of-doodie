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

async function capture() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const server = startServer();
  let serverReady = false;
  try {
    serverReady = await waitForServer();
    if (!serverReady) throw new Error(`Vite server did not become ready at ${ORIGIN}.`);

    const browser = await chromium.launch();
    try {
      const desktop = await browser.newPage();
      await primeGamePage(desktop, { width: 1280, height: 720 });
      await clickFirstDeploy(desktop);
      await desktop.waitForSelector("#game-canvas", { timeout: 15000 });
      await desktop.waitForTimeout(1800);
      await desktop.screenshot({ path: path.join(OUT_DIR, "real-combat.png"), fullPage: false });
      await desktop.close();

      const mobile = await browser.newPage();
      await primeGamePage(mobile, { width: 390, height: 844 });
      await clickFirstDeploy(mobile);
      await mobile.waitForSelector("#game-canvas", { timeout: 15000 });
      await mobile.waitForTimeout(1800);
      await mobile.screenshot({ path: path.join(OUT_DIR, "real-mobile-controls.png"), fullPage: false });
      await mobile.close();
    } finally {
      await browser.close();
    }

    console.log("Captured public/launch-captures/real-combat.png");
    console.log("Captured public/launch-captures/real-mobile-controls.png");
  } finally {
    stopServer(server);
  }
}

capture().catch((error) => {
  console.error(`Launch screenshot capture failed: ${error.message}`);
  process.exit(1);
});
