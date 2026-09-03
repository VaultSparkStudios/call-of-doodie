// smoke-new-modes.mjs — real-browser proof that the S163 modes are selectable
// from the front door, deploy into a run, and render their HUD (S163).
//
// Usage: node scripts/smoke-new-modes.mjs [--url http://127.0.0.1:4173/]
// Starts `vite preview` on the built dist when no --url is given. Writes
// screenshots to docs/visual-qa/new-modes/ and exits non-zero on any failure.

import { chromium } from "playwright";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const urlArg = args.includes("--url") ? args[args.indexOf("--url") + 1] : null;
const OUT = path.resolve("docs/visual-qa/new-modes");
fs.mkdirSync(OUT, { recursive: true });

async function startPreview() {
  const child = spawn(process.platform === "win32" ? "npx.cmd" : "npx", ["vite", "preview", "--port", "4173", "--strictPort"], { stdio: ["ignore", "pipe", "pipe"], shell: process.platform === "win32" });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("preview did not start")), 30000);
    child.stdout.on("data", (d) => { if (String(d).includes("4173")) { clearTimeout(timer); resolve(); } });
    child.stderr.on("data", (d) => { if (String(d).includes("4173")) { clearTimeout(timer); resolve(); } });
  });
  return child;
}

async function deployMode(page, label, expectBanner) {
  await page.goto(URL, { waitUntil: "domcontentloaded" });
  const guest = page.getByRole("button", { name: /continue as guest/i });
  if (await guest.count()) await guest.first().click();
  const toggle = page.getByRole("button", { name: /change mode or difficulty/i }).first();
  await toggle.waitFor({ state: "visible", timeout: 20000 });
  await toggle.click();
  await page.waitForTimeout(400);
  const cell = page.getByRole("button", { name: new RegExp(label, "i") }).first();
  await cell.waitFor({ state: "visible", timeout: 15000 });
  await cell.click();
  await page.waitForTimeout(400);
  await page.getByTestId("front-door-deploy").click();
  const skip = page.getByRole("button", { name: /GO IN CLEAN/i }).first();
  try { await skip.waitFor({ state: "visible", timeout: 15000 }); await skip.click(); } catch { /* no draft */ }
  await page.locator("[data-hud-surface]").first().waitFor({ state: "attached", timeout: 20000 });
  await page.waitForTimeout(4000);
  const banner = page.getByTestId("hud-mode-banner").first();
  await banner.waitFor({ state: "attached", timeout: 15000 });
  const text = (await banner.innerText()).trim();
  if (!expectBanner.test(text)) throw new Error(`${label}: banner "${text}" did not match ${expectBanner}`);
  const shot = path.join(OUT, `${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.png`);
  await page.screenshot({ path: shot });
  return { label, banner: text, screenshot: shot };
}

const preview = urlArg ? null : await startPreview();
const URL = urlArg || "http://127.0.0.1:4173/";
const browser = await chromium.launch();
const results = [];
let failed = false;
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on("pageerror", (err) => { console.error("PAGE ERROR:", err.message); failed = true; });
  page.on("console", (m) => { if (m.type() === "error" && !/404/.test(m.text())) console.error("CONSOLE:", m.text().slice(0, 300)); });
  results.push(await deployMode(page, "BOSS GAUNTLET", /DOWN · NEXT/));
  results.push(await deployMode(page, "HOLD THE THRONE", /THRONES/));
  if (!(await page.getByTestId("hud-squad").count())) throw new Error("HOLD THE THRONE: squad strip missing");
  results.push({ label: "squad-strip", present: true });
  results.push(await deployMode(page, "SEWER EXTRACTION", /LOOT/));
  results.push(await deployMode(page, "BOT ROYALE", /BOTS LEFT/));
  // Profile hash route opens the panel.
  await page.goto(new globalThis.URL("?smoke=profile#profile", URL).href, { waitUntil: "domcontentloaded" });
  await page.getByTestId("profile-panel").waitFor({ state: "visible", timeout: 20000 });
  results.push({ label: "profile-hash-route", present: true });
  // Operation: the first encounter verb (BREACH) must start its behavioral handler.
  await page.goto(URL, { waitUntil: "domcontentloaded" });
  const opBtn = page.getByRole("button", { name: /Start operation BLACKSITE FLUSH/i }).first();
  await opBtn.waitFor({ state: "visible", timeout: 20000 });
  await opBtn.click();
  const opSkip = page.getByRole("button", { name: /GO IN CLEAN/i }).first();
  try { await opSkip.waitFor({ state: "visible", timeout: 15000 }); await opSkip.click(); } catch { /* no draft */ }
  await page.locator("[data-hud-surface]").first().waitFor({ state: "attached", timeout: 20000 });
  await page.waitForTimeout(4000);
  const verb = page.getByTestId("hud-verb-objective").first();
  await verb.waitFor({ state: "attached", timeout: 15000 });
  const verbText = (await verb.innerText()).trim();
  if (!/BREACH/.test(verbText)) throw new Error(`operation verb HUD "${verbText}" did not show BREACH`);
  await page.screenshot({ path: path.join(OUT, "operation-breach.png") });
  results.push({ label: "operation-verb", banner: verbText });
} catch (error) {
  failed = true;
  console.error("SMOKE FAIL:", error.message);
  try { const pages = browser.contexts().flatMap((c) => c.pages()); if (pages[0]) await pages[0].screenshot({ path: path.join(OUT, "fail.png") }); } catch { /* ignore */ }
} finally {
  await browser.close();
  preview?.kill();
}
fs.writeFileSync(path.join(OUT, "receipt.json"), JSON.stringify({ at: new Date().toISOString(), url: URL, ok: !failed, results }, null, 2));
console.log(JSON.stringify({ ok: !failed, results }, null, 2));
process.exit(failed ? 1 : 0);
