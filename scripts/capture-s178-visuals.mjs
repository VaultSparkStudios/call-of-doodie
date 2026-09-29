#!/usr/bin/env node
// Rendered-pixel checks for the S178 perk picker and Developer obstacle state.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";

const arg = (flag, fallback) => {
  const index = process.argv.indexOf(flag);
  return index < 0 ? fallback : process.argv[index + 1];
};
const baseUrl = arg("--url");
if (!baseUrl || !/^https?:\/\//.test(baseUrl)) {
  console.error("Usage: node scripts/capture-s178-visuals.mjs --url <visual-harness-url> [--output <dir>]");
  process.exit(2);
}
const outputDir = path.resolve(arg("--output", "docs/visual-qa/session-178"));
fs.mkdirSync(outputDir, { recursive: true });
const sha256 = file => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const sourceFiles = ["src/config/perkFacts.js", "src/constants.js", "src/systems/enemyFrame.js", "src/systems/backgroundLayer.js", "visual-harness/operation.jsx"];
const sourceHash = crypto.createHash("sha256").update(sourceFiles.map(file => `${file}:${sha256(file)}`).join("\n")).digest("hex");
const profiles = [
  { theme: "sewer-night", width: 390, height: 844, colorScheme: "dark" },
  { theme: "sewer-night", width: 1440, height: 1000, colorScheme: "dark" },
  { theme: "porcelain-day", width: 390, height: 844, colorScheme: "light" },
  { theme: "porcelain-day", width: 1440, height: 1000, colorScheme: "light" },
];
const receipt = { schemaVersion: "s178-rendered-pixel-v1", generatedAt: new Date().toISOString(), baseUrl, sourceHash, sourceFiles, captures: [], summary: { pass: true, checks: 0, passed: 0, failures: [] } };
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  for (const profile of profiles) {
    const context = await browser.newContext({ viewport: { width: profile.width, height: profile.height }, colorScheme: profile.colorScheme, reducedMotion: "reduce" });
    await context.addInitScript(({ theme }) => localStorage.setItem("cod-theme", theme), { theme: profile.theme });
    for (const surface of ["perk-facts", "developer-obstacle"]) {
      const page = await context.newPage();
      const pageErrors = [];
      page.on("pageerror", error => pageErrors.push(error.message));
      const url = new URL(baseUrl);
      url.searchParams.set("theme", profile.theme);
      url.searchParams.set("surface", surface);
      const response = await page.goto(url.href, { waitUntil: "domcontentloaded" });
      if (surface === "developer-obstacle") await page.getByTestId("developer-obstacle-stage").waitFor();
      else await page.getByText("Overclocked", { exact: true }).waitFor();
      const state = await page.evaluate(() => ({
        theme: document.documentElement.dataset.codTheme,
        viewportWidth: innerWidth,
        scrollWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
        text: document.body.innerText,
        visualChecks: document.querySelector('[data-testid="developer-obstacle-stage"]')?.dataset.visualChecks || null,
      }));
      const checks = [
        ["http-ok", Boolean(response?.ok()), response?.status() ?? null],
        ["theme-applied", state.theme === profile.theme, state.theme],
        ["no-horizontal-overflow", state.scrollWidth <= state.viewportWidth + 1, `${state.scrollWidth}/${state.viewportWidth}`],
        ["no-page-errors", pageErrors.length === 0, pageErrors],
      ];
      if (surface === "perk-facts") {
        checks.push(["exact-shot-claims", state.text.includes("+35% fire rate") && state.text.includes("+40% fire rate"), state.text.slice(0, 1000)]);
        checks.push(["chain-lightning-claim", state.text.includes("20% chance to arc to 1 nearby enemy for 50% damage"), state.text.slice(0, 1000)]);
      } else {
        const states = JSON.parse(state.visualChecks || "[]");
        checks.push(["simulated-geometry", states.length === 3 && states.map(entry => entry.width).join(",") === "90,0,90", states]);
        checks.push(["cache-repaint", states.length === 3 && states.map(entry => entry.epoch).join(",") === "0,1,2" && states[0].rgba.join(",") === states[2].rgba.join(",") && states[0].rgba.join(",") !== states[1].rgba.join(","), states]);
      }
      const file = `${surface}--${profile.theme}--${profile.width}.png`;
      const fullPath = path.join(outputDir, file);
      await page.screenshot({ path: fullPath, fullPage: true });
      for (const [id, ok, actual] of checks) {
        receipt.summary.checks++;
        if (ok) receipt.summary.passed++;
        else { receipt.summary.pass = false; receipt.summary.failures.push({ surface, theme: profile.theme, width: profile.width, id, actual }); }
      }
      receipt.captures.push({ surface, ...profile, screenshot: { file, sha256: sha256(fullPath) }, checks: checks.map(([id, ok]) => ({ id, ok })) });
      await page.close();
    }
    await context.close();
  }
} finally {
  await browser.close();
}
fs.writeFileSync(path.join(outputDir, "receipt.json"), `${JSON.stringify(receipt, null, 2)}\n`);
console.log(`S178 rendered-pixel QA: ${receipt.summary.pass ? "PASS" : "FAIL"} · ${receipt.summary.passed}/${receipt.summary.checks}`);
for (const failure of receipt.summary.failures) console.error(`${failure.surface}/${failure.theme}/${failure.width}: ${failure.id} = ${JSON.stringify(failure.actual)}`);
process.exitCode = receipt.summary.pass ? 0 : 1;
