import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
const base = process.argv[process.argv.indexOf('--url')+1] || 'http://127.0.0.1:4174';
const onlyClassic = process.argv.includes('--only-classic');
const out = path.resolve(`output/playwright/s182-${onlyClassic ? 'checkpoints' : 'runtime'}`);
fs.mkdirSync(out,{recursive:true});
const report = { url:base, generatedAt:new Date().toISOString(), evidence:'assisted integration fixtures, not participant playtests', cases:[] };
const browser = await chromium.launch({headless:true});
async function launch(query, width=1440, theme='sewer-night') {
  const page = await browser.newPage({viewport:{width,height:900}});
  const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{ localStorage.setItem('cod-callsign-v1','INTEGRATION-QA'); localStorage.setItem('cod-onboarding-complete','1'); });
  await page.addInitScript(theme=>localStorage.setItem('cod-theme',theme),theme);
  await page.goto(base+query,{waitUntil:'domcontentloaded'});
  await page.getByTestId('front-door-deploy').click();
  await page.locator('#game-canvas').waitFor();
  await page.evaluate(()=>{
    window.__qaGame = () => {
      const el=document.querySelector('#game-canvas');
      if (!el && window.__qaLastGame) return window.__qaLastGame;
      let f=el[Object.keys(el).find(k=>k.startsWith('__reactFiber'))];
      while(f) {
        let h=f.memoizedState;
        while(h) { const r=h.memoizedState?.current; if(r?.player && Array.isArray(r.enemies) && 'runSeed' in r) { window.__qaLastGame=r; return r; } h=h.next; }
        f=f.return;
      }
      throw new Error('game state unavailable');
    };
  });
  await page.waitForTimeout(400);
  return {page,errors};
}
try {
  if (onlyClassic) {
    for (const width of [390,1440]) for (const theme of ['sewer-night','porcelain-day']) {
      const {page,errors}=await launch('?mode=standard',width,theme);
      for (let wave=2;wave<=4;wave++) {
        await page.evaluate(()=>{const g=window.__qaGame();g.player.health=100000;g.player.maxHealth=100000;g.player.invincible=10000;g.enemies=[];g.enemiesThisWave=g.maxEnemiesThisWave;g._respiteLock=false;g._waveDeaths=1;});
        await page.waitForFunction(wave=>window.__qaGame().currentWave===wave,wave,{timeout:10000});
        if (wave<4 && await page.getByRole('button',{name:'KEEP GOING · NO UPGRADE'}).isVisible()) throw new Error('early checkpoint interruption');
      }
      const skip=page.getByRole('button',{name:'KEEP GOING · NO UPGRADE'});
      await skip.waitFor({timeout:10000});
      const screenshot=`checkpoint-${theme}-${width}.png`;
      await page.screenshot({path:path.join(out,screenshot)});
      const clock=await page.evaluate(()=>window.__qaGame().player.invincible);
      await skip.click();await page.waitForTimeout(500);
      if(await skip.isVisible()) throw new Error('checkpoint chained another choice');
      const resumed=await page.evaluate(clock=>window.__qaGame().player.invincible<clock,clock);
      if(!resumed) throw new Error('checkpoint did not resume combat');
      report.cases.push({id:'classic',width,theme,screenshot,wavesWithoutInterruption:[2,3],checkpointWave:4,skipResumed:resumed,errors});
      await page.close();console.log(`PASS Classic ${theme}/${width}: sparse skippable checkpoint`);
    }
  } else {
  // Each mission and both route maps reach an actual completion receipt.
  const routes={ 'blacksite-flush':['service-tunnel','executive-washroom'], 'porcelain-siege':['laundry-annex','boiler-room'], 'final-notice':['records-office','executive-penthouse'] };
  for(const [id,choices] of Object.entries(routes)) for(const route of choices) {
    const {page,errors}=await launch(`?operation=${id}&route=${route}`);
    const verbs=[];
    for(let index=0;index<7;index++) {
      await page.waitForFunction(index=>window.__qaGame().operationEncounterIndex===index,index,{timeout:10000});
      await page.waitForTimeout(200);
      const state=await page.evaluate(()=>{
        const g=window.__qaGame(); g.player.health=100000; g.player.maxHealth=100000; g.player.invincible=10000;
        const o=g.activeVerbObjective; if(!o) throw new Error('missing objective');
        const liveGuards=g.enemies.filter(e=>e.health>0&&!e.isBossEnemy).length;
        if(o.verb==='BREACH') g.structures.find(s=>s.id===o.doorId).hp=0;
        if(o.verb==='HOLD') { const z=g.zones.find(z=>z.id===o.zoneId); g.player.x=z.x; g.player.y=z.y; z.progress=z.captureFrames-1; g.enemies.forEach(e=>{e.x=10;e.y=10;}); }
        if(o.verb==='ESCORT') g.allies.find(a=>a.id===o.cartId).carryComplete=true;
        if(o.verb==='HUNT') { const e=g.enemies.find(e=>e._huntId===o.targetId); if(e) e._defeatResolved=true; }
        if(o.verb==='SABOTAGE') { const p=g.structures.find(s=>s.id===o.pumpId); g.player.x=p.x;g.player.y=p.y; p.channel=p.channelFrames-1;g._interactHeld=true; }
        if(o.verb==='ESCAPE') { const e=g.structures.find(s=>s.id===o.exitId);g.player.x=e.x;g.player.y=e.y; }
        if(o.verb==='BOSS') { o.engaged=true;g.enemies.filter(e=>e.isBossEnemy).forEach(e=>{e._defeatResolved=true;}); }
        return {verb:o.verb,liveGuards};
      });
      verbs.push(state);
      await page.waitForTimeout(500);
    }
    await page.locator('#operation-complete-title').waitFor({timeout:10000});
    report.cases.push({id,route,verbs,complete:true,errors});
    if(errors.length) throw new Error(errors.join('; '));
    await page.close();console.log(`PASS ${id}/${route}: seven task transitions`);
  }
  const {page,errors}=await launch('?mode=zombies',390);
  await page.waitForTimeout(2000);
  const initial=await page.evaluate(()=>{const g=window.__qaGame();return {zombies:g.enemies.every(e=>e.isZombie),count:g.enemies.length,phase:g.sewerRun.phase,variants:[...new Set(g.enemies.map(e=>e.zombieVariant))]};});
  if(!initial.zombies||initial.count<1) throw new Error('zombie spawning not integrated');
  for(let i=0;i<3;i++) {
    await page.evaluate(i=>{ const g=window.__qaGame();g.player.health=100000;g.player.maxHealth=100000;g.player.invincible=10000;g.enemies=[];const s=g.sewerRun;s.sludge=30;const p=s.pumps[i];g.player.x=p.x;g.player.y=p.y;p.charge=359;s.fuelTick=10; },i);
    await page.waitForTimeout(150);
  }
  await page.evaluate(()=>{ const g=window.__qaGame();g.enemies=[]; const h=g.sewerRun.hatch;g.player.x=h.x;g.player.y=h.y;h.charge=299; });
  await page.waitForTimeout(500);
  const end=await page.evaluate(()=>{const g=window.__qaGame();return {phase:g.sewerRun.phase,pumps:g.sewerRun.completedPumps,victory:g._victory,replayEligible:g.replayEligible};});
  if(end.phase!=='escaped'||end.pumps!==3||!end.victory||end.replayEligible!==false) throw new Error(`zombie ending failed ${JSON.stringify(end)}`);
  report.cases.push({id:'zombies',width:390,initial,end,errors});
  await page.close(); console.log('PASS Sewer Zombies: pump→hatch→victory, local scoring');
  }
} finally { await browser.close(); fs.writeFileSync(path.join(out,'receipt.json'),JSON.stringify(report,null,2)+'\n'); }
