#!/usr/bin/env node
// Hosted S178 smoke and rendered-pixel captures for the built public shell.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";

const argIndex = process.argv.indexOf("--url");
const baseUrl = argIndex >= 0 ? process.argv[argIndex + 1] : "";
if (!/^https:\/\//.test(baseUrl)) throw new Error("Usage: node scripts/capture-s178-staging.mjs --url <https-preview-origin>");
const dir = path.resolve("docs/visual-qa/session-178/staging");
fs.mkdirSync(dir, { recursive: true });
const hash = file => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const browser = await chromium.launch({ channel: "chrome", headless: true });
const receipt = { baseUrl, capturedAt: new Date().toISOString(), captures: [], summary: { pass: true, checks: 0, passed: 0, failures: [] } };
try {
  for (const width of [390, 1440]) {
    for (const theme of ["sewer-night", "porcelain-day"]) {
      for (const surface of theme === "sewer-night" ? ["home", "status"] : ["home"]) {
        const context = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: theme === "sewer-night" ? "dark" : "light", reducedMotion: "reduce" });
        await context.addInitScript(({ selected }) => {
          localStorage.setItem("cod-theme", selected);
          localStorage.setItem("cod-callsign-v1", "S178Reviewer");
          localStorage.setItem("cod-home-v2", "1");
          localStorage.setItem("cod-music-muted", "1");
        }, { selected: theme });
        const page = await context.newPage();
        const errors = [];
        page.on("pageerror", error => errors.push(error.message));
        const url = new URL(surface === "status" ? "/status/" : "/?home=v2", baseUrl);
        if (surface === "home") url.searchParams.set("theme", theme);
        const response = await page.goto(url.href, { waitUntil: "domcontentloaded" });
        if (surface === "home") {
          await page.getByTestId("runtime-shell").waitFor({ state: "hidden", timeout: 20000 });
          await page.getByRole("button", { name: /play classic/i }).waitFor({ timeout: 20000 });
          await page.waitForLoadState("networkidle", { timeout: 15000 });
        }
        const state = await page.evaluate(() => ({
          title: document.title,
          theme: document.documentElement.dataset.codTheme,
          text: document.body.innerText,
          scrollWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
          innerWidth,
        }));
        const checks = [
          ["http-ok", Boolean(response?.ok()), response?.status()],
          ["no-browser-errors", errors.length === 0, errors],
          ["no-horizontal-overflow", state.scrollWidth <= state.innerWidth + 1, `${state.scrollWidth}/${state.innerWidth}`],
          ["correct-content", surface === "home" ? state.title.includes("Call of Doodie") && state.text.includes("Classic Survival") && state.text.includes("PLAY CLASSIC") : state.text.includes("Public availability and known limitations"), state.title],
        ];
        if (surface === "home") checks.push(["theme-applied", state.theme === theme, state.theme]);
        const file = `${surface}--${theme}--${width}.png`;
        await page.screenshot({ path: path.join(dir, file), fullPage: true });
        receipt.captures.push({ surface, theme, width, height: 900, screenshot: { file, sha256: hash(path.join(dir, file)) }, checks: checks.map(([id, ok]) => ({ id, ok })) });
        for (const [id, ok, actual] of checks) {
          receipt.summary.checks++;
          if (ok) receipt.summary.passed++;
          else { receipt.summary.pass = false; receipt.summary.failures.push({ surface, theme, width, id, actual }); }
        }
        await context.close();
      }
    }
  }
} finally {
  await browser.close();
}
fs.writeFileSync(path.join(dir, "receipt.json"), `${JSON.stringify(receipt, null, 2)}\n`);
console.log(`S178 hosted staging: ${receipt.summary.pass ? "PASS" : "FAIL"} · ${receipt.summary.passed}/${receipt.summary.checks}`);
for (const failure of receipt.summary.failures) console.error(JSON.stringify(failure));
process.exitCode = receipt.summary.pass ? 0 : 1;
