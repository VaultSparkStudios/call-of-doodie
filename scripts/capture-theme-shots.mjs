// capture-theme-shots.mjs — S163 brand-unity proof: home, modes, roadmap, login, privacy, changelog in both schemes + mobile.
// Usage: node scripts/capture-theme-shots.mjs http://localhost:4781
import { chromium } from "playwright";
import fs from "node:fs";
const base = process.argv[2] || "http://localhost:4781";
fs.mkdirSync("docs/visual-qa/s163-theme", { recursive: true });
const b = await chromium.launch();
const pages = [["home", "/"], ["modes", "/modes/"], ["roadmap", "/roadmap/"], ["login", "/login"], ["privacy", "/privacy/"], ["changelog", "/changelog/"]];
for (const theme of ["sewer-night", "porcelain-day"]) {
  for (const [name, path] of pages) {
    const page = await b.newPage({ viewport: { width: 1280, height: 900 } });
    await page.goto(`${base}${path}?theme=${theme}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(name === "home" ? 5000 : 1200);
    await page.screenshot({ path: `docs/visual-qa/s163-theme/${name}-${theme}.png` });
    await page.close();
  }
}
const m = await b.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
await m.goto(`${base}/`, { waitUntil: "domcontentloaded" }); await m.waitForTimeout(5000);
await m.screenshot({ path: "docs/visual-qa/s163-theme/home-mobile.png" });
const s = await b.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
await s.goto(`${base}/modes/`, { waitUntil: "domcontentloaded" }); await s.waitForTimeout(1200);
await s.screenshot({ path: "docs/visual-qa/s163-theme/modes-mobile.png" });
await b.close();
console.log("shots done");
