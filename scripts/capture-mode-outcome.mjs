// capture-mode-outcome.mjs — real-browser proof that a mode run ends on a
// debrief carrying the S167 mode-outcome receipt (`data-testid="mode-outcome"`).
//
// Usage: node scripts/capture-mode-outcome.mjs --url <origin> [--mode "BOT ROYALE"] [--difficulty INSANE] [--seed 123456] [--timeout 150000]
// Deploys into the mode as a guest, lets the run end naturally (the player
// does not move or fire), then reads the outcome receipt and writes a capture
// to docs/visual-qa/new-modes/<mode>-outcome.png. Exits non-zero when the run
// does not end inside the timeout or the receipt is missing. This is a
// rendered-state proof of the receipt wiring, not gameplay or balance evidence.

import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const args = process.argv.slice(2);
const readArg = (name, fallback) => (args.includes(name) ? args[args.indexOf(name) + 1] : fallback);
const URL = readArg("--url", "http://127.0.0.1:4173/");
const MODE = readArg("--mode", "BOT ROYALE");
const DIFFICULTY = readArg("--difficulty", "INSANE");
const SEED = readArg("--seed", null);
const TIMEOUT = Number(readArg("--timeout", "150000"));
const OUT = path.resolve("docs/visual-qa/new-modes");
fs.mkdirSync(OUT, { recursive: true });

const RECEIPT_CONTRACTS = Object.freeze({
  "BOT ROYALE": [/FLUSHED #\d+ OF 17|LAST ONE FLUSHING/i, /bot(?:s)? flushed/i, /flood phase \d+/i],
  "SEWER EXTRACTION": [/\d+ LOOT (?:DOWN THE DRAIN|BANKED)/i, /\d+ crates? (?:grabbed|carried out)/i, /alarm \d+\/100/i],
  "HOLD THE THRONE": [/\d+\/3 THRONES HELD|ALL THREE THRONES HELD/i, /\d+ lost/i],
  "BOSS GAUNTLET": [/\d+\/4 BOSSES DOWN|ALL 4 BOSSES DOWN/i, /(?:stopped by|par)/i],
});

async function verifyVisualCapture(buffer) {
  const { data, info } = await sharp(buffer).raw().toBuffer({ resolveWithObject: true });
  let titleRed = 0, actionOrange = 0, verdictWhite = 0, receiptGold = 0;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const offset = (y * info.width + x) * info.channels;
      const r = data[offset], g = data[offset + 1], b = data[offset + 2];
      if (y < 160 && r > 180 && g < 90 && b < 90) titleRed++;
      if (y > 260 && y < 650 && x > 380 && x < 900 && r > 190 && g > 45 && g < 160 && b < 80) actionOrange++;
      if (y > 170 && y < 620 && x > 380 && x < 900 && r > 180 && g > 180 && b > 180) verdictWhite++;
      if (y > 130 && y < 250 && x > 380 && x < 900 && r > 170 && g > 120 && b < 100) receiptGold++;
    }
  }
  const canaries = { titleRed, actionOrange, verdictWhite, receiptGold };
  if (titleRed < 2000 || actionOrange < 12000 || verdictWhite < 3500 || receiptGold < 300) {
    throw new Error(`Debrief pixel canaries failed for ${MODE}: ${JSON.stringify(canaries)}`);
  }
  return canaries;
}
function verifyReceipt(mode, text) {
  const contract = RECEIPT_CONTRACTS[mode.toUpperCase()];
  if (!contract) throw new Error(`No outcome receipt contract is registered for mode: ${mode}`);
  const missing = contract.filter((pattern) => !pattern.test(text));
  if (missing.length) throw new Error(`Outcome receipt for ${mode} missed ${missing.length}/${contract.length} mode-specific evidence fields: ${text}`);
}

async function waitForNaturalEnd(page, title, timeout) {
  const deadline = Date.now() + timeout;
  const intermissionPrompts = [/PERK SELECT/i, /WAVE \d+ CLEAR!/i, /CHOOSE YOUR PATH/i];
  while (Date.now() < deadline) {
    if (await title.isVisible()) return;
    for (const pattern of intermissionPrompts) {
      const prompt = page.getByText(pattern).first();
      if (!(await prompt.isVisible().catch(() => false))) continue;
      const choice = prompt.locator("xpath=..").getByRole("button").first();
      if (await choice.isVisible().catch(() => false)) {
        await choice.click();
        break;
      }
    }
    await page.waitForTimeout(500);
  }
  throw new Error(`Natural ${MODE} run did not reach a debrief within ${timeout}ms`);
}

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
  if (SEED != null) await page.getByPlaceholder("optional").first().fill(String(SEED));
  await page.getByRole("button", { name: new RegExp(DIFFICULTY, "i") }).first().click();
  await page.waitForTimeout(200);
  await page.waitForTimeout(400);
  await page.getByTestId("front-door-deploy").click();
  const skip = page.getByRole("button", { name: /GO IN CLEAN/i }).first();
  try { await skip.waitFor({ state: "visible", timeout: 15000 }); await skip.click(); } catch { /* no draft */ }
  await page.locator("[data-hud-surface]").first().waitFor({ state: "attached", timeout: 20000 });
  const started = Date.now();
  const title = page.getByTestId("death-title");
  await waitForNaturalEnd(page, title, TIMEOUT);
  const seconds = Math.round((Date.now() - started) / 1000);
  const receipt = page.getByTestId("mode-outcome");
  await receipt.waitFor({ state: "visible", timeout: 10000 });
  const text = (await receipt.innerText()).replace(/\s+/g, " ").trim();
  verifyReceipt(MODE, text);
  // The debrief replaces a live canvas and may become queryable one paint before
  // Chromium has fully composited it. Settle fonts, scroll, and two frames before
  // capturing so the receipt proves the final rendered state instead of a torn
  // transition frame.
  await page.evaluate(async () => {
    await document.fonts?.ready;
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
  await title.evaluate((node) => {
    for (let current = node; current; current = current.parentElement) {
      if (current.scrollHeight > current.clientHeight) current.scrollTop = 0;
    }
  });
  await page.waitForTimeout(2500);
  // Rebuild the capture viewport after App unmounts the live canvas, then
  // require decoded pixel canaries so stale, blank, or incomplete evidence fails closed.
  const viewport = page.viewportSize();
  if (viewport && viewport.width > 1) {
    await page.setViewportSize({ width: viewport.width - 1, height: viewport.height });
    await page.setViewportSize(viewport);
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  }
  const shot = path.join(OUT, `${MODE.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-outcome.png`);

  let previousFrame = null;
  let stableFrame = null;
  for (let attempt = 0; attempt < 12; attempt++) {
    const frame = await page.screenshot({ animations: "disabled" });
    if (previousFrame?.equals(frame)) {
      stableFrame = frame;
      break;
    }
    previousFrame = frame;
    await page.waitForTimeout(400);
  }

  if (!stableFrame || stableFrame.length < 15000) throw new Error(`Debrief did not reach two nonblank byte-identical rendered frames for ${MODE}`);
  const visualCanaries = await verifyVisualCapture(stableFrame);
  fs.writeFileSync(shot, stableFrame);
  const result = {
    contract: "mode-outcome-browser-proof-v1",
    capturedAt: new Date().toISOString(),
    url: URL,
    mode: MODE,
    difficulty: DIFFICULTY,
    seed: SEED == null ? null : Number(SEED),
    title: (await title.innerText()).trim(),
    outcome: text,
    runEndedAfterSeconds: seconds,
    screenshot: path.relative(process.cwd(), shot).split(path.sep).join("/"),
    visualCanaries,
    claim: "rendered-receipt-proof-not-gameplay-evidence",
  };
  const receiptPath = shot.replace(/[.]png$/i, ".json");
  fs.writeFileSync(receiptPath, JSON.stringify(result, null, 2) + String.fromCharCode(10));  console.log(JSON.stringify({ ...result, receipt: path.relative(process.cwd(), receiptPath).split(path.sep).join("/") }, null, 2));
  if (!text) failed = true;
} catch (error) {
  console.error("FAILED:", error.message);
  failed = true;
} finally {
  await browser.close();
}
process.exit(failed ? 1 : 0);
