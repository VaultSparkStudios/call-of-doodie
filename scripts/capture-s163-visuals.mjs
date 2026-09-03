#!/usr/bin/env node
/**
 * S163 visual QA: DraftScreen archetype seed chips.
 * Captures draft-before (no archetype-seeding perks, no chips expected) and
 * draft-after (archetype-seeding perks, chips expected) at 390px and 1440px
 * in both project themes.
 *
 * Usage: node scripts/capture-s163-visuals.mjs --url <harness-url> [--output <dir>]
 */

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
  console.error("Usage: node scripts/capture-s163-visuals.mjs --url <harness-url> [--output <dir>]");
  process.exit(2);
}

const outputDir = path.resolve(process.cwd(), valueAfter("--output", "docs/visual-qa/session-163"));
fs.mkdirSync(outputDir, { recursive: true });

const hash = (file) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");

const profiles = [
  { theme: "sewer-night", width: 390, height: 844, colorScheme: "dark" },
  { theme: "sewer-night", width: 1440, height: 1000, colorScheme: "dark" },
  { theme: "porcelain-day", width: 390, height: 844, colorScheme: "light" },
  { theme: "porcelain-day", width: 1440, height: 1000, colorScheme: "light" },
];

const surfaces = [
  { id: "draft-before", expectChipContainers: 0 },
  { id: "draft-after", expectChipContainers: 2 }, // eagle_eye → Gunslinger; iron_gut → Vanguard; deep_pockets → none
];

const receipt = {
  schemaVersion: 1,
  session: 163,
  generatedAt: new Date().toISOString(),
  baseUrl,
  captures: [],
  summary: { pass: true, checks: 0, passed: 0, failures: [] },
};

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", headless: true });

try {
  for (const surface of surfaces) {
    for (const profile of profiles) {
      const context = await browser.newContext({
        viewport: { width: profile.width, height: profile.height },
        colorScheme: profile.colorScheme,
        reducedMotion: "reduce",
      });
      await context.addInitScript(({ theme }) => localStorage.setItem("cod-theme", theme), { theme: profile.theme });

      const page = await context.newPage();
      const pageErrors = [];
      const consoleErrors = [];
      page.on("pageerror", (err) => pageErrors.push(err.message));
      page.on("console", (msg) => {
        if (msg.type() === "error") {
          // Browsers auto-request /favicon.ico; the harness has no favicon — ignore that 404.
          const loc = msg.location?.()?.url ?? "";
          if (loc.endsWith("/favicon.ico")) return;
          consoleErrors.push(msg.text());
        }
      });

      const url = new URL("operation.html", baseUrl);
      url.searchParams.set("surface", surface.id);
      url.searchParams.set("theme", profile.theme);

      const response = await page.goto(url.href, { waitUntil: "domcontentloaded" });
      await page.locator("#root").waitFor({ state: "attached" });
      await page.waitForTimeout(200);

      const file = `${surface.id}--${profile.theme}--${profile.width}.png`;
      await page.screenshot({ path: path.join(outputDir, file), fullPage: false });

      const dims = await page.evaluate(() => ({
        viewportWidth: innerWidth,
        viewportHeight: innerHeight,
        scrollWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
        appliedTheme: document.documentElement.dataset.codTheme,
      }));

      const chipContainerCount = await page.locator("[data-testid='draft-archetype-seeds']").count();

      const checks = [
        { id: "http-ok", ok: Boolean(response?.ok()), actual: response?.status() ?? null },
        { id: "theme-applied", ok: dims.appliedTheme === profile.theme, actual: dims.appliedTheme },
        { id: "no-horizontal-overflow", ok: dims.scrollWidth <= dims.viewportWidth + 1, actual: `${dims.scrollWidth}/${dims.viewportWidth}` },
        { id: "no-page-errors", ok: pageErrors.length === 0, actual: pageErrors },
        { id: "no-console-errors", ok: consoleErrors.length === 0, actual: consoleErrors },
        { id: "archetype-chip-containers", ok: chipContainerCount === surface.expectChipContainers, actual: chipContainerCount },
      ];

      for (const check of checks) {
        receipt.summary.checks += 1;
        if (check.ok) {
          receipt.summary.passed += 1;
        } else {
          receipt.summary.pass = false;
          receipt.summary.failures.push({ surface: surface.id, theme: profile.theme, width: profile.width, ...check });
        }
      }

      receipt.captures.push({
        surface: surface.id,
        theme: profile.theme,
        width: profile.width,
        height: profile.height,
        colorScheme: profile.colorScheme,
        screenshot: { file, sha256: hash(path.join(outputDir, file)) },
        checks,
      });

      await context.close();
    }
  }
} finally {
  await browser.close();
}

fs.writeFileSync(path.join(outputDir, "receipt.json"), `${JSON.stringify(receipt, null, 2)}\n`);
console.log(`S163 visual QA: ${receipt.summary.pass ? "PASS" : "FAIL"} · ${receipt.summary.passed}/${receipt.summary.checks}`);
for (const failure of receipt.summary.failures) {
  console.error(`  FAIL ${failure.surface}/${failure.theme}/${failure.width} · ${failure.id}: ${JSON.stringify(failure.actual)}`);
}
process.exitCode = receipt.summary.pass ? 0 : 1;
