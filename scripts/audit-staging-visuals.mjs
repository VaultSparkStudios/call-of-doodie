#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";
import { compositeColor, contrastRatio, parseCssColor, summarizeVisualChecks } from "./lib/visual-audit.mjs";

const ROOT = process.cwd();
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
const routes = [
  { id: "home", path: "/?home=v2", primary: true },
  { id: "privacy", path: "/privacy/", localPath: "/privacy/index.html" },
  { id: "terms", path: "/terms/", localPath: "/terms/index.html" },
  { id: "contact", path: "/contact/", localPath: "/contact/index.html" },
];
const localTarget = /^(localhost|127\.0\.0\.1)$/i.test(new URL(baseUrl).hostname);

fs.mkdirSync(outputDir, { recursive: true });
const receipt = {
  schemaVersion: "1.0",
  generatedAt: new Date().toISOString(),
  baseUrl,
  matrix: { widths, themes, routes: routes.map(({ id, path: routePath }) => ({ id, path: routePath })) },
  captures: [],
};

const browser = await chromium.launch({ headless: true });
try {
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
        if (route.primary) await page.locator("button").filter({ hasText: /DEPLOY/ }).first().waitFor({ state: "visible" });
        else await page.locator("main h1").waitFor({ state: "visible" });

        const state = await page.evaluate(({ primary }) => {
          const root = document.documentElement;
          const body = document.body;
          const toggle = document.querySelector("[data-theme-toggle]");
          const action = primary
            ? [...document.querySelectorAll("button")].find((button) => /DEPLOY/.test(button.textContent || ""))
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

receipt.summary = summarizeVisualChecks(receipt.captures.flatMap((capture) => capture.checks.map((check) => ({ ...check, capture: `${capture.route}/${capture.theme}/${capture.width}` }))));
const receiptPath = path.join(outputDir, "visual-audit-receipt.json");
fs.writeFileSync(receiptPath, JSON.stringify(receipt, null, 2) + "\n");
console.log(`Visual audit: ${receipt.summary.pass ? "PASS" : "FAIL"} · ${receipt.summary.passed}/${receipt.summary.total} checks`);
console.log(`Receipt: ${path.relative(ROOT, receiptPath).replace(/\\/g, "/")}`);
for (const failure of receipt.summary.failures) console.error(`- ${failure.capture} · ${failure.id}: ${JSON.stringify(failure.actual)}`);
process.exitCode = receipt.summary.pass ? 0 : 1;
