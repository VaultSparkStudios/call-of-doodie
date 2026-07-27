#!/usr/bin/env node

// Usage: node scripts/audit-staging-visuals.mjs --url <isolated-preview> [--output <dir>]
// Captures the full route × theme × viewport matrix and validates human-readable contrast.

import fs from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";
import { getVisualAuditRoutes } from "./lib/public-route-registry.mjs";
import { compositeColor, contrastRatio, defaultVisualAuditStorage, parseCssColor, summarizeVisualChecks } from "./lib/visual-audit.mjs";

const ROOT = process.cwd();
if (process.argv.includes("--help")) {
  console.log("Usage: node scripts/audit-staging-visuals.mjs --url <isolated-preview> [--output <dir>]");
  process.exit(0);
}
const valueAfter = (name) => {
  const inline = process.argv.find((arg) => arg.startsWith(`${name}=`));
  if (inline) return inline.slice(name.length + 1);
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
};
const baseUrl = valueAfter("--url");
if (!baseUrl || !/^https?:\/\//.test(baseUrl)) {
  console.error("Usage: npm run visual:audit -- --url https://isolated-preview.example");
  process.exit(2);
}

const outputDir = path.resolve(ROOT, valueAfter("--output") || "output/playwright/staging-visuals");
const widths = [390, 768, 1440];
const themes = ["sewer-night", "porcelain-day"];
const routes = getVisualAuditRoutes();
const localTarget = /^(localhost|127\.0\.0\.1)$/i.test(new URL(baseUrl).hostname);

async function ensurePrimaryAuditSurface(page, storage) {
  const action = page.locator('[data-testid="front-door-deploy"]');
  if (!await action.isVisible().catch(() => false)) {
    // Some hosted browsers restore a persisted blank profile after the context
    // init script. Reassert the explicit QA profile and reload; never click
    // through onboarding, which would audit the game instead of the front door.
    await page.evaluate((entries) => {
      for (const [key, value] of Object.entries(entries)) localStorage.setItem(key, value);
    }, storage);
    await page.reload({ waitUntil: "networkidle" });
  }
  await action.waitFor({ state: "visible" });
}

fs.mkdirSync(outputDir, { recursive: true });
const receipt = {
  schemaVersion: "1.0",
  generatedAt: new Date().toISOString(),
  baseUrl,
  matrix: { widths, themes, routes: routes.map(({ id, path: routePath }) => ({ id, path: routePath })) },
  captures: [],
  defaultThemeChecks: [],
};

const browser = await chromium.launch({ headless: true });
try {
  const defaultContext = await browser.newContext({ viewport: { width: 390, height: 1000 }, colorScheme: "light" });
  await defaultContext.addInitScript((storage) => {
    for (const [key, value] of Object.entries(storage)) localStorage.setItem(key, value);
  }, defaultVisualAuditStorage());
  for (const route of routes) {
    const page = await defaultContext.newPage();
    const url = new URL(localTarget && route.localPath ? route.localPath : route.path, baseUrl);
    const response = await page.goto(url.href, { waitUntil: "networkidle" });
    if (route.primary) await ensurePrimaryAuditSurface(page, defaultVisualAuditStorage());
    else await page.locator("main h1").waitFor({ state: "visible" });
    const state = await page.evaluate(() => ({
      theme: document.documentElement.dataset.codTheme || document.querySelector("[data-theme]")?.getAttribute("data-theme") || null,
      colorScheme: getComputedStyle(document.documentElement).colorScheme,
    }));
    receipt.defaultThemeChecks.push({
      route: route.id,
      url: url.href,
      checks: [
        { id: "default-http-ok", ok: Boolean(response?.ok()), actual: response?.status() ?? null },
        { id: "default-sewer-night", ok: state.theme === "sewer-night", actual: state.theme },
        { id: "default-dark-color-scheme", ok: state.colorScheme === "dark", actual: state.colorScheme },
      ],
    });
    await page.close();
  }
  await defaultContext.close();

  for (const theme of themes) {
    for (const width of widths) {
      const context = await browser.newContext({ viewport: { width, height: 1000 }, colorScheme: theme === "porcelain-day" ? "light" : "dark" });
      await context.addInitScript(({ selectedTheme }) => {
        localStorage.setItem("cod-theme", selectedTheme);
        localStorage.setItem("cod-callsign-v1", "VISUAL-QA");
        localStorage.setItem("cod-home-v2", "1");
      }, { selectedTheme: theme });
      for (const route of routes) {
        const page = await context.newPage();
        const consoleErrors = [];
        const pageErrors = [];
        page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
        page.on("pageerror", (error) => pageErrors.push(error.message));
        const url = new URL(localTarget && route.localPath ? route.localPath : route.path, baseUrl);
        url.searchParams.set("theme", theme);
        const response = await page.goto(url.href, { waitUntil: "networkidle" });
        if (route.primary) await ensurePrimaryAuditSurface(page, {
          "cod-theme": theme,
          "cod-callsign-v1": "VISUAL-QA",
          "cod-home-v2": "1",
        });
        else await page.locator("main h1").waitFor({ state: "visible" });

        const state = await page.evaluate(({ primary }) => {
          const root = document.documentElement;
          const body = document.body;
          const toggle = document.querySelector("[data-theme-toggle]");
          const action = primary
            ? document.querySelector('[data-testid="front-door-deploy"]')
            : document.querySelector("main h1");
          const style = toggle ? getComputedStyle(toggle) : null;
          const rootStyle = getComputedStyle(root);
          const bodyStyle = getComputedStyle(body);
          return {
            theme: root.dataset.codTheme || document.querySelector("[data-theme]")?.getAttribute("data-theme") || null,
            viewportWidth: innerWidth,
            scrollWidth: Math.max(root.scrollWidth, body.scrollWidth),
            toggleVisible: Boolean(toggle && toggle.getBoundingClientRect().width > 0 && toggle.getBoundingClientRect().height > 0),
            actionVisible: Boolean(action && action.getBoundingClientRect().width > 0 && action.getBoundingClientRect().height > 0),
            colors: style ? {
              foreground: style.color,
              background: style.backgroundColor,
              rootBackground: rootStyle.backgroundColor,
              bodyBackground: bodyStyle.backgroundColor,
            } : null,
          };
        }, { primary: Boolean(route.primary) });

        let toggleContrast = null;
        if (state.colors) {
          const foreground = parseCssColor(state.colors.foreground);
          let rootBackground = route.primary
            ? parseCssColor(theme === "porcelain-day" ? "rgb(232,224,212)" : "rgb(5,5,5)")
            : parseCssColor(state.colors.bodyBackground) || parseCssColor(state.colors.rootBackground);
          if (!rootBackground || rootBackground.a === 0) {
            rootBackground = parseCssColor(theme === "porcelain-day" ? "rgb(232,224,212)" : "rgb(5,5,5)");
          }
          let background = parseCssColor(state.colors.background);
          if (background && background.a < 1 && rootBackground) background = compositeColor(background, rootBackground);
          if (foreground && background && background.a > 0) toggleContrast = Number(contrastRatio(foreground, background).toFixed(2));
        }

        const checks = [
          { id: "http-ok", ok: Boolean(response?.ok()), actual: response?.status() ?? null },
          { id: "theme-applied", ok: state.theme === theme, actual: state.theme },
          { id: "no-horizontal-overflow", ok: state.scrollWidth <= state.viewportWidth + 1, actual: `${state.scrollWidth}/${state.viewportWidth}` },
          { id: "theme-toggle-visible", ok: state.toggleVisible, actual: state.toggleVisible },
          { id: route.primary ? "deploy-visible" : "heading-visible", ok: state.actionVisible, actual: state.actionVisible },
          { id: "no-console-errors", ok: consoleErrors.length === 0, actual: consoleErrors },
          { id: "no-page-errors", ok: pageErrors.length === 0, actual: pageErrors },
          { id: "toggle-contrast-aa", ok: toggleContrast == null || toggleContrast >= 4.5, actual: toggleContrast, note: toggleContrast == null ? "No solid computed background; token contrast covered by unit tests." : undefined },
        ];
        const screenshot = `${route.id}--${theme}--${width}.png`;
        await page.screenshot({ path: path.join(outputDir, screenshot), fullPage: true });
        receipt.captures.push({ route: route.id, theme, width, url: url.href, screenshot, checks, summary: summarizeVisualChecks(checks) });
        await page.close();
      }
      await context.close();
    }
  }
} finally {
  await browser.close();
}

receipt.summary = summarizeVisualChecks([
  ...receipt.defaultThemeChecks.flatMap((entry) => entry.checks.map((check) => ({ ...check, capture: `${entry.route}/default/light-os` }))),
  ...receipt.captures.flatMap((capture) => capture.checks.map((check) => ({ ...check, capture: `${capture.route}/${capture.theme}/${capture.width}` }))),
]);
const receiptPath = path.join(outputDir, "visual-audit-receipt.json");
fs.writeFileSync(receiptPath, JSON.stringify(receipt, null, 2) + "\n");
console.log(`Visual audit: ${receipt.summary.pass ? "PASS" : "FAIL"} · ${receipt.summary.passed}/${receipt.summary.total} checks`);
console.log(`Receipt: ${path.relative(ROOT, receiptPath).replace(/\\/g, "/")}`);
for (const failure of receipt.summary.failures) console.error(`- ${failure.capture} · ${failure.id}: ${JSON.stringify(failure.actual)}`);
process.exitCode = receipt.summary.pass ? 0 : 1;
