import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const arg = (key, fallback) => process.argv.includes(key) ? process.argv[process.argv.indexOf(key)+1] : fallback;
const base = arg('--url', 'http://127.0.0.1:4174');
const phase = arg('--phase', 'after');
const out = path.resolve(`output/playwright/s182-${phase}`);
fs.mkdirSync(out, { recursive:true });
const browser = await chromium.launch({ headless:true });
const receipt = { phase, baseUrl:base, capturedAt:new Date().toISOString(), captures:[], failures:[] };
try {
  for (const width of [390,1440]) for (const theme of ['sewer-night','porcelain-day']) for (const mode of ['standard','zombies','operation']) {
    const context = await browser.newContext({ viewport:{width,height:900}, reducedMotion:'reduce' });
    await context.addInitScript(({theme}) => {
      localStorage.setItem('cod-theme',theme);
      localStorage.setItem('cod-callsign-v1','FIELD-QA');
      localStorage.setItem('cod-onboarding-complete','1');
      localStorage.setItem('cod-last-difficulty','easy');
    }, {theme});
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror',e=>errors.push(e.message));
    const query = mode === 'operation' ? '?operation=blacksite-flush' : `?mode=${mode}`;
    await page.goto(base+query, {waitUntil:'domcontentloaded'});
    await page.getByTestId('front-door-deploy').waitFor({state:'visible',timeout:30000});
    await page.getByTestId('front-door-deploy').click();
    const clean = page.getByRole('button',{name:/GO IN CLEAN/i});
    if (phase === 'before') {
      await clean.waitFor({state:'visible',timeout:5000}).catch(()=>{});
      if (await clean.isVisible()) await clean.click();
    }
    await page.locator('[data-hud-surface]').first().waitFor({state:'attached',timeout:30000});
    if (phase !== 'before' && await clean.isVisible()) throw new Error(`${mode}: unwanted deployment draft`);
    await page.mouse.move(width*.72,410);
    await page.mouse.down();
    await page.waitForTimeout(mode === 'zombies' ? 8500 : 3500);
    await page.mouse.up();
    const name = `${mode}-${theme}-${width}.png`;
    await page.screenshot({path:path.join(out,name)});
    receipt.captures.push({mode,theme,width,height:900,file:name,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(out,name))).digest('hex'),errors});
    if (errors.length) receipt.failures.push(...errors.map(e=>`${mode}/${theme}/${width}: ${e}`));
    console.log(`${phase} ${mode}/${theme}/${width}: captured, ${errors.length} errors`);
    await context.close();
  }
} finally { await browser.close(); fs.writeFileSync(path.join(out,'receipt.json'),JSON.stringify(receipt,null,2)+'\n'); }
if(receipt.failures.length) process.exitCode=1;
