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
  console.error("Usage: node scripts/capture-hazard-case-files.mjs --url <staging-url> [--output <dir>]");
  process.exit(2);
}
const outputDir = path.resolve(valueAfter("--output", "output/playwright/session-169-hazards"));
const profiles = [
  { theme: "sewer-night", width: 390, height: 844, colorScheme: "dark" },
  { theme: "sewer-night", width: 1440, height: 1000, colorScheme: "dark" },
  { theme: "porcelain-day", width: 390, height: 844, colorScheme: "light" },
  { theme: "porcelain-day", width: 1440, height: 1000, colorScheme: "light" },
];
const digest = (buffer) => crypto.createHash("sha256").update(buffer).digest("hex");
fs.mkdirSync(outputDir, { recursive: true });

async function capture(browser, profile) {
  const context = await browser.newContext({
    viewport: { width: profile.width, height: profile.height },
    colorScheme: profile.colorScheme,
    reducedMotion: "reduce",
  });
  await context.addInitScript(({ theme }) => {
    localStorage.setItem("cod-theme", theme);
    localStorage.setItem("cod-callsign-v1", "HAZARD-WITNESS");
    localStorage.setItem("cod-home-v2", "1");
    localStorage.setItem("cod-onboarding-complete", "1");
    localStorage.setItem("cod-music-muted", "1");
    localStorage.setItem("cod-career-v1", JSON.stringify({
      hazardChronicle: {
        sewer_flood: { deaths: 4, encounters: 0 },
        proximity_mine: { deaths: 2, encounters: 0 },
        extraction_lockdown: { deaths: 0, encounters: 3 },
      },
    }));
  }, { theme: profile.theme });
  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  const url = new URL("/?home=v2", baseUrl);
  url.searchParams.set("theme", profile.theme);
  const response = await page.goto(url.href, { waitUntil: "domcontentloaded" });
  await page.getByTestId("front-door-deploy").waitFor({ state: "visible", timeout: 20000 });
  const commandCenter = page.getByRole("button", { name: /all player tools/i });
  if ((await commandCenter.getAttribute("aria-expanded")) !== "true") await commandCenter.click();
  await page.getByRole("button", { name: /most wanted/i }).click();
  const section = page.getByTestId("most-wanted-hazards");
  await section.waitFor({ state: "visible", timeout: 20000 });
  await section.scrollIntoViewIfNeeded();
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const text = (await section.innerText()).replace(/\s+/g, " ").trim();
  const dimensions = await page.evaluate(() => ({
    theme: document.documentElement.dataset.codTheme,
    viewportWidth: innerWidth,
    scrollWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
  }));
  const file = `hazard-case-files--${profile.theme}--${profile.width}.png`;
  const buffer = await page.screenshot({ animations: "disabled" });
  fs.writeFileSync(path.join(outputDir, file), buffer);
  const checks = [
    { id: "http-ok", ok: Boolean(response?.ok()), actual: response?.status() ?? null },
    { id: "theme-applied", ok: dimensions.theme === profile.theme, actual: dimensions.theme },
    { id: "flood-death-metric", ok: /SEWER FLOOD.*killed you 4×/i.test(text), actual: text },
    { id: "lockdown-encounter-metric", ok: /EXTRACTION LOCKDOWN.*sealed the exit 3×/i.test(text), actual: text },
    { id: "mine-countermeasure", ok: /PROXIMITY MINE.*trigger radius/i.test(text), actual: text },
    { id: "no-horizontal-overflow", ok: dimensions.scrollWidth <= dimensions.viewportWidth + 1, actual: `${dimensions.scrollWidth}/${dimensions.viewportWidth}` },
    { id: "no-page-errors", ok: pageErrors.length === 0, actual: pageErrors },
  ];
  await context.close();
  return { ...profile, text, screenshot: { file, sha256: digest(buffer) }, checks, pass: checks.every((check) => check.ok) };
}

const browser = await chromium.launch({ headless: true });
let captures;
try {
  captures = [];
  for (const profile of profiles) captures.push(await capture(browser, profile));
} finally {
  await browser.close();
}
const checks = captures.flatMap((capture) => capture.checks);
const receipt = {
  schemaVersion: "hazard-case-files-browser-proof-v1",
  generatedAt: new Date().toISOString(),
  baseUrl,
  captures,
  summary: {
    pass: captures.every((capture) => capture.pass),
    passed: checks.filter((check) => check.ok).length,
    checks: checks.length,
    failures: captures.flatMap((capture) => capture.checks.filter((check) => !check.ok).map((check) => ({ theme: capture.theme, width: capture.width, ...check }))),
  },
};
fs.writeFileSync(path.join(outputDir, "hazard-case-files-receipt.json"), `${JSON.stringify(receipt, null, 2)}\n`);
console.log(`Hazard case-file visual QA: ${receipt.summary.pass ? "PASS" : "FAIL"} · ${receipt.summary.passed}/${receipt.summary.checks}`);
if (!receipt.summary.pass) process.exitCode = 1;
