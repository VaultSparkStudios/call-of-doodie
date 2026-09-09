// capture-mode-outcome.mjs — real-browser proof that a mode run ends on a
// debrief carrying the S167 mode-outcome receipt (`data-testid="mode-outcome"`).
//
// Usage: node scripts/capture-mode-outcome.mjs --url <origin> [--mode "BOT ROYALE"] [--timeout 150000]
// Deploys into the mode as a guest, lets the run end naturally (the player
// does not move or fire), then reads the outcome receipt and writes a capture
// to docs/visual-qa/new-modes/<mode>-outcome.png. Exits non-zero when the run
// does not end inside the timeout or the receipt is missing. This is a
// rendered-state proof of the receipt wiring, not gameplay or balance evidence.

import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const readArg = (name, fallback) => (args.includes(name) ? args[args.indexOf(name) + 1] : fallback);
const URL = readArg("--url", "http://127.0.0.1:4173/");
const MODE = readArg("--mode", "BOT ROYALE");
const TIMEOUT = Number(readArg("--timeout", "150000"));
const OUT = path.resolve("docs/visual-qa/new-modes");
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
let failed = false;
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on("pageerror", (err) => { console.error("PAGE ERROR:", err.message); failed = true; });
  await page.goto(URL, { waitUntil: "domcontentloaded" });
  const guest = page.getByRole("button", { name: /continue as guest/i });
  if (await guest.count()) await guest.first().click();
  const toggle = page.getByRole("button", { name: /change mode or difficulty/i }).first();
  await toggle.waitFor({ state: "visible", timeout: 20000 });
  await toggle.click();
  await page.waitForTimeout(400);
  await page.getByRole("button", { name: new RegExp(MODE, "i") }).first().click();
  await page.waitForTimeout(400);
  await page.getByTestId("front-door-deploy").click();
  const skip = page.getByRole("button", { name: /GO IN CLEAN/i }).first();
  try { await skip.waitFor({ state: "visible", timeout: 15000 }); await skip.click(); } catch { /* no draft */ }
  await page.locator("[data-hud-surface]").first().waitFor({ state: "attached", timeout: 20000 });
  const started = Date.now();
  const title = page.getByTestId("death-title");
  await title.waitFor({ state: "visible", timeout: TIMEOUT });
  const seconds = Math.round((Date.now() - started) / 1000);
  const receipt = page.getByTestId("mode-outcome");
  await receipt.waitFor({ state: "visible", timeout: 10000 });
  const text = (await receipt.innerText()).replace(/\s+/g, " ").trim();
  const shot = path.join(OUT, `${MODE.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-outcome.png`);
  await page.screenshot({ path: shot });
  const result = {
    mode: MODE,
    title: (await title.innerText()).trim(),
    outcome: text,
    runEndedAfterSeconds: seconds,
    screenshot: path.relative(process.cwd(), shot).split(path.sep).join("/"),
    claim: "rendered-receipt-proof-not-gameplay-evidence",
  };
  console.log(JSON.stringify(result, null, 2));
  if (!text) failed = true;
} catch (error) {
  console.error("FAILED:", error.message);
  failed = true;
} finally {
  await browser.close();
}
process.exit(failed ? 1 : 0);
