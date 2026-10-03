// QA-only synthetic presentation fixture: imports shipped render functions.
// These captures are not natural spawning, gameplay balance, or participant evidence.
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const base = process.argv.includes('--url') ? process.argv[process.argv.indexOf('--url') + 1] : 'http://127.0.0.1:4174';
const out = path.resolve('output/playwright/s182-zombie-creatures');
fs.mkdirSync(out, { recursive: true });
const receipt = { generatedAt: new Date().toISOString(), baseUrl: base, evidence: 'Assisted presentation fixtures using actual zombieRenderer.js; not natural-spawn or participant-playtest evidence. Light fixture background is artificial: actual gameplay arena remains dark in both UI themes.', captures: [], failures: [] };
const browser = await chromium.launch({ headless: true });
try {
  for (const width of [390, 1440]) for (const theme of ['sewer-night', 'porcelain-day']) {
    const page = await browser.newPage({ viewport: { width, height: 900 }, deviceScaleFactor: 1 });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto(base, { waitUntil: 'domcontentloaded' });
    const result = await page.evaluate(async ({ width, theme }) => {
      const { drawZombieCreature } = await import('/src/systems/zombieRenderer.js');
      const { ZOMBIE_ROSTER } = await import('/src/systems/zombieMode.js');
      const states = ['stalk', 'windup', 'attack', 'death', 'reduced-motion'];
      const dark = theme === 'sewer-night', bg = dark ? '#11241d' : '#eee8d9', ink = dark ? '#f4ecd8' : '#203b31';
      document.body.innerHTML = ''; document.body.style.cssText = `margin:0;background:${bg};color:${ink};font:13px monospace;overflow:auto`;
      const heading = document.createElement('h1'); heading.textContent = 'SEWER CREATURES · RENDER FIXTURE'; heading.style.cssText = 'font:bold 16px monospace;padding:18px;margin:0'; document.body.append(heading);
      const note = document.createElement('p'); note.textContent = `${theme} · ${width}px · Assisted poses, not natural-spawn evidence. Five creatures × five presentations. Light background is an artificial contrast stress test; gameplay arena stays dark.`; note.style.cssText = 'padding:0 18px 12px;margin:0;font-size:12px'; document.body.append(note);
      const desktop = width >= 1000, cols = desktop ? 5 : 1, cw = width / cols, ch = 235;
      const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = ch * (desktop ? 5 : 25); canvas.style.cssText = 'display:block;width:100%;'; document.body.append(canvas);
      const ctx = canvas.getContext('2d'); ctx.fillStyle = bg; ctx.fillRect(0, 0, canvas.width, canvas.height);
      const poses = [];
      for (let ri = 0; ri < ZOMBIE_ROSTER.length; ri++) for (let si = 0; si < states.length; si++) {
        const spec = ZOMBIE_ROSTER[ri], state = states[si], col = desktop ? si : 0, row = desktop ? ri : ri * 5 + si;
        const x = col * cw, y = row * ch;
        ctx.fillStyle = dark ? (row % 2 ? '#172c24' : '#14271f') : (row % 2 ? '#e4ddcd' : '#eee8d9'); ctx.fillRect(x + 2, y + 2, cw - 4, ch - 4);
        ctx.strokeStyle = dark ? '#426451' : '#acb7a0'; ctx.lineWidth = 1; ctx.strokeRect(x + 2, y + 2, cw - 4, ch - 4);
        ctx.fillStyle = ink; ctx.textAlign = 'center'; ctx.font = 'bold 12px monospace'; ctx.fillText(spec.name, x + cw / 2, y + 23);
        ctx.font = '11px monospace'; ctx.fillText(state.toUpperCase(), x + cw / 2, y + 43);
        ctx.save(); ctx.translate(x + cw / 2 - (state === 'windup' && spec.id !== 'screecher' ? 20 : 0), y + 137);
        const enemy = { ...spec, zombieVariant: spec.id, size: 52, zombieState: state === 'reduced-motion' ? 'stalk' : state, zombieClock: 173, zombieTell: spec.tell, zombieTellProgress: 0.72, zombieAim: 0, health: 80, maxHealth: 100 };
        drawZombieCreature(ctx, enemy, { frame: 173, reducedMotion: state === 'reduced-motion', dying: state === 'death' }); ctx.restore();
        ctx.fillStyle = ink; ctx.font = '10px monospace'; ctx.fillText(state === 'windup' ? 'Locked aim · clear attack boundary' : state === 'death' ? 'Squash-fall body · no emoji fallback' : state === 'reduced-motion' ? 'Static cosmetic pose · signals retained' : state === 'attack' ? 'Attack pose / active animation' : 'Articulated idle / pursuit pose', x + cw / 2, y + 215);
        poses.push({ creature: spec.id, state, panel: { x, y, width: cw, height: ch } });
      }
      const animationProbes = ZOMBIE_ROSTER.map(spec => {
        const probe = document.createElement('canvas'); probe.width = 200; probe.height = 200; const pctx = probe.getContext('2d');
        function pixels(clock, reducedMotion) {
          pctx.clearRect(0, 0, 200, 200); pctx.save(); pctx.translate(100, 100);
          drawZombieCreature(pctx, { ...spec, zombieVariant: spec.id, size: 52, zombieState: 'stalk', zombieClock: clock, health: 100, maxHealth: 100 }, { frame: clock, reducedMotion }); pctx.restore();
          return pctx.getImageData(0, 0, 200, 200).data;
        }
        function diff(a, b) { let changed = 0; for (let i = 0; i < a.length; i += 4) if (a[i] !== b[i] || a[i + 1] !== b[i + 1] || a[i + 2] !== b[i + 2] || a[i + 3] !== b[i + 3]) changed++; return changed; }
        return { creature: spec.id, movingPixels: diff(pixels(173, false), pixels(185, false)), reducedMotionChangedPixels: diff(pixels(173, true), pixels(185, true)) };
      });
      return { poses, animationProbes, width: canvas.width, height: canvas.height, horizontalOverflow: document.documentElement.scrollWidth > innerWidth };
    }, { width, theme });
    const file = `creatures-${theme}-${width}.png`; await page.screenshot({ path: path.join(out, file), fullPage: true });
    const sha256 = crypto.createHash('sha256').update(fs.readFileSync(path.join(out, file))).digest('hex');
    receipt.captures.push({ file, sha256, theme, viewportWidth: width, result, errors });
    if (errors.length || result.horizontalOverflow || result.poses.length !== 25 || result.animationProbes.some(p => p.movingPixels === 0 || p.reducedMotionChangedPixels !== 0)) receipt.failures.push({ file, errors, horizontalOverflow: result.horizontalOverflow, poses: result.poses.length });
    console.log(`Captured ${file}: ${result.poses.length} poses, ${errors.length} runtime errors, overflow=${result.horizontalOverflow}`);
    await page.close();
  }
} finally { await browser.close(); fs.writeFileSync(path.join(out, 'receipt.json'), JSON.stringify(receipt, null, 2) + '\n'); }
if (receipt.failures.length) process.exitCode = 1;


