#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const origin = String(process.argv[2] || "http://127.0.0.1:4173").replace(/\/$/, "");
const outputDir = path.resolve("output/playwright/home-navigation");
fs.mkdirSync(outputDir, { recursive: true });

const profiles = [
  { name: "sewer-night--390", theme: "sewer-night", width: 390, height: 1000 },
  { name: "porcelain-day--390", theme: "porcelain-day", width: 390, height: 1000 },
  { name: "sewer-night--1440", theme: "sewer-night", width: 1440, height: 1000 },
  { name: "porcelain-day--1440", theme: "porcelain-day", width: 1440, height: 1000 },
];

const browser = await chromium.launch({ headless: true });
const receipt = { origin, capturedAt: new Date().toISOString(), checks: [], captures: [] };

try {
  for (const profile of profiles) {
    const context = await browser.newContext({ viewport: { width: profile.width, height: profile.height }, colorScheme: profile.theme === "porcelain-day" ? "light" : "dark", serviceWorkers: "block" });
    const page = await context.newPage();
    await page.addInitScript((theme) => localStorage.setItem("cod-theme", theme), profile.theme);
    await page.goto(`${origin}/?theme=${profile.theme}&audit=home-navigation`, { waitUntil: "domcontentloaded", timeout: 30000 });
    const shellFile = path.join(outputDir, `front-door--${profile.name}.png`);
    await page.screenshot({ path: shellFile, fullPage: true });
    await page.getByTestId("runtime-enter").click();
    await page.getByTestId("home-v2-shell").waitFor({ state: "visible", timeout: 30000 });
    await page.waitForTimeout(700);

    const audit = await page.evaluate((profileTheme) => {
      const visible = (element) => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
      };
      const essential = [...document.querySelectorAll("a,button,input,select,summary")].filter(visible);
      const undersizedText = essential.filter((element) => parseFloat(getComputedStyle(element).fontSize) < 11).map((element) => ({ text: (element.textContent || element.getAttribute("aria-label") || "").trim().slice(0, 80), size: getComputedStyle(element).fontSize }));
      const undersizedTargets = essential.filter((element) => {
        if (element.matches('footer a:not([role="button"])')) return false;
        const rect = element.getBoundingClientRect();
        return rect.width < 44 || rect.height < 44;
      }).map((element) => ({ text: (element.textContent || element.getAttribute("aria-label") || "").trim().slice(0, 80), width: Math.round(element.getBoundingClientRect().width), height: Math.round(element.getBoundingClientRect().height) }));
      const stats = document.querySelector("#live-stats");
      const contrastFailures = [...document.querySelectorAll(".home-nav a,.home-nav button,.home-mobile-nav a,.home-mobile-nav button,.home-more-menu a,.home-more-menu button,.community-stats__header,.community-stats__full-link,.community-stats__stat-label,.community-stats__stat-value")].filter(visible).filter((element) => {
        const text = (element.textContent || "").trim();
        if (!text || element.children.length > 0) return false;
        const style = getComputedStyle(element);
        const color = style.color.match(/[\d.]+/g)?.map(Number);
        if (!color || color.length < 3) return false;
        const background = (() => {
          let node = element;
          const layers = [];
          while (node) {
            if (node.classList?.contains("arcade-home")) break;
            const match = getComputedStyle(node).backgroundColor.match(/[\d.]+/g)?.map(Number);
            if (match) layers.push(match.length === 3 ? [...match, 1] : match);
            node = node.parentElement;
          }
          let resolved = profileTheme === "porcelain-day" ? [246, 240, 231, 1] : [7, 11, 16, 1];
          for (const [r, g, b, a] of layers.reverse()) {
            resolved = [r * a + resolved[0] * (1 - a), g * a + resolved[1] * (1 - a), b * a + resolved[2] * (1 - a), 1];
          }
          return resolved;
        })();
        const lum = ([r, g, b]) => [r, g, b].map((value) => { const c = value / 255; return c <= .03928 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4; }).reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0);
        const ratio = (Math.max(lum(color), lum(background)) + .05) / (Math.min(lum(color), lum(background)) + .05);
        return ratio < 4.5;
      }).map((element) => ({ text: (element.textContent || "").trim().slice(0, 80), color: getComputedStyle(element).color, background: getComputedStyle(element).backgroundColor }));
      return {
        horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
        statsVisible: Boolean(stats && visible(stats)),
        statsLink: stats?.querySelector('a[href$="stats/"]')?.textContent?.trim() || null,
        primaryNavigation: Boolean(document.querySelector('[data-testid="primary-navigation"]')),
        mobileNavigation: Boolean([...document.querySelectorAll('[aria-label="Game navigation"]')].find(visible)),
        undersizedText,
        undersizedTargets,
        contrastFailures,
      };
    }, profile.theme);

    const homeFile = path.join(outputDir, `home--${profile.name}.png`);
    await page.screenshot({ path: homeFile, fullPage: true });
    await page.getByRole("button", { name: "More", exact: true }).last().click();
    const menuFile = path.join(outputDir, `menu--${profile.name}.png`);
    await page.screenshot({ path: menuFile, fullPage: true });
    receipt.checks.push({ profile: profile.name, ...audit });
    receipt.captures.push(shellFile, homeFile, menuFile);
    await context.close();
  }
} finally {
  await browser.close();
}

const failed = receipt.checks.filter((check) => check.horizontalOverflow || !check.statsVisible || !check.statsLink || !check.primaryNavigation || check.undersizedText.length || check.undersizedTargets.length || check.contrastFailures.length);
receipt.pass = failed.length === 0;
receipt.failedProfiles = failed.map((check) => check.profile);
fs.writeFileSync(path.join(outputDir, "receipt.json"), `${JSON.stringify(receipt, null, 2)}\n`);
console.log(JSON.stringify(receipt, null, 2));
process.exit(receipt.pass ? 0 : 1);
