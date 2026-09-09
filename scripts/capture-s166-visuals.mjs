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
  console.error("Usage: node scripts/capture-s166-visuals.mjs --url <staging-url> [--output <dir>]");
  process.exit(2);
}
const outputDir = path.resolve(valueAfter("--output", "output/playwright/session-166-touched-states"));
const allProfiles = [
  { theme: "sewer-night", width: 390, height: 844, colorScheme: "dark" },
  { theme: "sewer-night", width: 1440, height: 1000, colorScheme: "dark" },
  { theme: "porcelain-day", width: 390, height: 844, colorScheme: "light" },
  { theme: "porcelain-day", width: 1440, height: 1000, colorScheme: "light" },
];
const profileFilter = valueAfter("--profile");
const profiles = profileFilter
  ? allProfiles.filter((profile) => `${profile.theme}-${profile.width}` === profileFilter)
  : allProfiles;
const sha256 = (file) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
fs.mkdirSync(outputDir, { recursive: true });

async function captureProfile(browser, profile) {
  const context = await browser.newContext({
    viewport: { width: profile.width, height: profile.height },
    colorScheme: profile.colorScheme,
    reducedMotion: "reduce",
  });
  await context.addInitScript(({ theme }) => {
    localStorage.setItem("cod-theme", theme);
    localStorage.setItem("cod-callsign-v1", "S166-PIXEL-QA");
    localStorage.setItem("cod-home-v2", "1");
    localStorage.setItem("cod-onboarding-complete", "1");
    localStorage.setItem("cod-music-muted", "1");
    localStorage.setItem("cod-tutorial-v2", "1");
  }, { theme: profile.theme });
  const page = await context.newPage();
  const pageErrors = [];
  const consoleErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  const url = new URL("/?home=v2", baseUrl);
  url.searchParams.set("theme", profile.theme);
  const response = await page.goto(url.href, { waitUntil: "domcontentloaded" });
  await page.getByTestId("front-door-deploy").waitFor({ state: "visible", timeout: 20000 });

  const mobileConfig = page.getByTestId("mobile-deploy-config");
  if (await mobileConfig.isVisible().catch(() => false)) {
    await mobileConfig.locator('[data-mode-id="sewer_extraction"]').click();
    await mobileConfig.locator('[data-difficulty-id="insane"]').click();
    await mobileConfig.getByRole("status").filter({ hasText: /Sewer Extraction.*INSANE/i }).waitFor({ state: "visible" });
  } else {
    await page.getByRole("button", { name: /change mode or difficulty/i }).click();
    await page.getByRole("button", { name: /SEWER EXTRACTION/i }).click();
    await page.getByRole("button", { name: /INSANE/i }).click();
  }
  await page.getByTestId("front-door-deploy").click();
  const skip = page.getByRole("button", { name: /skip.*go in clean/i });
  if (await skip.waitFor({ state: "visible", timeout: 15000 }).then(() => true).catch(() => false)) await skip.click();
  await page.locator("#game-canvas").waitFor({ state: "visible", timeout: 20000 });
  const banner = page.getByTestId("hud-mode-banner").first();
  await banner.waitFor({ state: "visible", timeout: 20000 });
  await page.waitForTimeout(3500);
  const extractionFile = `extraction-radar--${profile.theme}--${profile.width}.png`;
  await page.screenshot({ path: path.join(outputDir, extractionFile), fullPage: false });
  const bannerText = (await banner.innerText()).trim();
  // Advance only the live mode state to its documented alarm threshold so the
  // hosted renderer paints the otherwise time-delayed evacuation marker. This
  // is visual-state injection, not a claim that the QA run earned extraction.
  const evacStateInjected = await page.evaluate(() => {
    const root = document.getElementById("root");
    const containerKey = root && Object.keys(root).find((key) => key.startsWith("__reactContainer$"));
    const stack = containerKey ? [root[containerKey]] : [];
    const seen = new Set();
    while (stack.length) {
      const fiber = stack.pop();
      if (!fiber || seen.has(fiber)) continue;
      seen.add(fiber);
      let hook = fiber.memoizedState;
      const seenHooks = new Set();
      while (hook && !seenHooks.has(hook)) {
        seenHooks.add(hook);
        const candidate = hook.memoizedState?.current;
        if (candidate?.player && Array.isArray(candidate.pickups) && Number.isFinite(candidate.currentWave)) {
          candidate.alarm = 60;
          return true;
        }
        hook = hook.next;
      }
      if (fiber.child) stack.push(fiber.child);
      if (fiber.sibling) stack.push(fiber.sibling);
    }
    return false;
  });
  await banner.filter({ hasText: /EVAC OPEN/i }).waitFor({ state: "visible", timeout: 10000 });
  await page.waitForTimeout(500);
  const evacBannerText = (await banner.innerText()).trim();
  const evacFile = `extraction-evac-radar--${profile.theme}--${profile.width}.png`;
  await page.screenshot({ path: path.join(outputDir, evacFile), fullPage: false });

  const secondaryBefore = await page.evaluate(() => performance.getEntriesByType("resource")
    .some((entry) => entry.name.includes("DeathScreenSecondaryAnalysis")));
  await page.getByTestId("death-title").waitFor({ state: "visible", timeout: 150000 });
  const analysis = page.getByTestId("secondary-run-analysis");
  await analysis.waitFor({ state: "visible" });
  const initiallyOpen = await analysis.evaluate((element) => element.open);
  await analysis.locator("summary").click();
  try {
    await analysis.getByText("BUILD GRADE", { exact: true }).waitFor({ state: "visible", timeout: 20000 });
  } catch (error) {
    const diagnosticFile = `secondary-analysis-failure--${profile.theme}--${profile.width}.png`;
    await page.screenshot({ path: path.join(outputDir, diagnosticFile), fullPage: false });
    const diagnostic = await page.evaluate(() => ({
      body: document.body.innerText.slice(0, 1800),
      analysis: document.querySelector('[data-testid="secondary-run-analysis"]')?.innerText || "",
    }));
    throw new Error(`Secondary analysis did not render: ${JSON.stringify({ diagnostic, pageErrors, consoleErrors, diagnosticFile })}`, { cause: error });
  }
  const secondaryAfter = await page.evaluate(() => performance.getEntriesByType("resource")
    .some((entry) => entry.name.includes("DeathScreenSecondaryAnalysis")));
  const analysisFile = `secondary-analysis--${profile.theme}--${profile.width}.png`;
  await analysis.scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(outputDir, analysisFile), fullPage: false });
  const dimensions = await page.evaluate(() => ({
    theme: document.documentElement.dataset.codTheme,
    viewportWidth: innerWidth,
    scrollWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
  }));
  const checks = [
    { id: "http-ok", ok: Boolean(response?.ok()), actual: response?.status() ?? null },
    { id: "theme-applied", ok: dimensions.theme === profile.theme, actual: dimensions.theme },
    { id: "extraction-banner", ok: /LOOT/i.test(bannerText), actual: bannerText },
    { id: "evac-state-injected", ok: evacStateInjected, actual: evacStateInjected },
    { id: "evac-open-banner", ok: /EVAC OPEN/i.test(evacBannerText), actual: evacBannerText },
    { id: "secondary-not-eagerly-loaded", ok: secondaryBefore === false, actual: secondaryBefore },
    { id: "secondary-closed-initially", ok: initiallyOpen === false, actual: initiallyOpen },
    { id: "secondary-loaded-after-open", ok: secondaryAfter === true, actual: secondaryAfter },
    { id: "no-horizontal-overflow", ok: dimensions.scrollWidth <= dimensions.viewportWidth + 1, actual: `${dimensions.scrollWidth}/${dimensions.viewportWidth}` },
    { id: "no-page-errors", ok: pageErrors.length === 0, actual: pageErrors },
  ];
  await context.close();
  return {
    ...profile,
    banner: bannerText,
    stateInjection: "Alarm advanced to its documented 60 threshold on the live runtime ref solely to render the deterministic evac-open state.",
    screenshots: [extractionFile, evacFile, analysisFile].map((file) => ({ file, sha256: sha256(path.join(outputDir, file)) })),
    checks,
    consoleErrors,
    pass: checks.every((check) => check.ok),
  };
}

const browser = await chromium.launch({ headless: true });
let captures;
try {
  captures = await Promise.all(profiles.map((profile) => captureProfile(browser, profile)));
} finally {
  await browser.close();
}
const allChecks = captures.flatMap((capture) => capture.checks);
const receipt = {
  schemaVersion: "s166-touched-states-v1",
  generatedAt: new Date().toISOString(),
  baseUrl,
  captures,
  summary: {
    pass: captures.every((capture) => capture.pass),
    checks: allChecks.length,
    passed: allChecks.filter((check) => check.ok).length,
    failures: captures.flatMap((capture) => capture.checks.filter((check) => !check.ok).map((check) => ({ theme: capture.theme, width: capture.width, ...check }))),
  },
};
fs.writeFileSync(path.join(outputDir, "s166-visual-receipt.json"), `${JSON.stringify(receipt, null, 2)}\n`);
console.log(`S166 touched-state visual QA: ${receipt.summary.pass ? "PASS" : "FAIL"} · ${receipt.summary.passed}/${receipt.summary.checks}`);
for (const failure of receipt.summary.failures) console.error(`- ${failure.theme}/${failure.width} · ${failure.id}: ${JSON.stringify(failure.actual)}`);
if (!receipt.summary.pass) process.exitCode = 1;
