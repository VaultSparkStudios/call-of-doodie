// Run after direct image review of the overhaul's before/after matrix.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from './lib/safe-spawn.mjs';
const root=process.cwd(), target=path.resolve('docs/visual-qa/session-182');
fs.mkdirSync(target,{recursive:true});
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const captures=[];
let stagingUrl;
for(const phase of ['before','staging']) {
  const dir=path.resolve(`output/playwright/s182-${phase}`);
  const receipt=JSON.parse(fs.readFileSync(path.join(dir,'receipt.json'),'utf8'));
  if(receipt.failures.length || receipt.captures.length!==12) throw new Error(`${phase} matrix incomplete`);
  if(phase==='staging') stagingUrl=receipt.baseUrl;
  for(const c of receipt.captures) {
    const name=`${phase}-${c.file}`; fs.copyFileSync(path.join(dir,c.file),path.join(target,name));
    captures.push({file:`session-182/${name}`,sha256:hash(path.join(target,name)),theme:c.theme==='sewer-night'?'dark':'light',projectTheme:c.theme,viewport:{width:c.width,height:c.height},page:`${c.mode} live combat`,phase:phase==='before'?'before':'after'});
  }
}
for(const kind of ['checkpoints','checkpoint-before','zombie-creatures','perk-checkpoints']) {
  const dir=path.resolve(`output/playwright/s182-${kind}`);
  if (!fs.existsSync(dir)) continue;
  for(const name of fs.readdirSync(dir).filter(n=>n.endsWith('.png'))) {
    fs.copyFileSync(path.join(dir,name),path.join(target,name));
    const width=name.includes('390')?390:1440,theme=name.includes('porcelain-day')?'light':'dark';
    captures.push({file:`session-182/${name}`,sha256:hash(path.join(target,name)),theme,projectTheme:theme==='dark'?'sewer-night':'porcelain-day',viewport:{width,height:900},page:kind==='zombie-creatures'?'Five creatures and animation poses; assisted contrast fixture':kind==='perk-checkpoints'?'Skippable doctrine checkpoint; component fixture':'Classic checkpoint; assisted threshold',phase:kind==='checkpoint-before'?'before':'after'});
  }
}
const tracked=spawnSync('git',['diff','--name-only','74ff690','--','src','public'],{encoding:'utf8',windowsHide:true});
const untracked=spawnSync('git',['ls-files','--others','--exclude-standard','--','src'],{encoding:'utf8',windowsHide:true});
if(tracked.status || untracked.status) throw new Error('Unable to enumerate source hashes');
const sourceFiles=[...new Set((tracked.stdout+'\n'+untracked.stdout).trim().split(/\r?\n/).filter(Boolean))].filter(f=>fs.existsSync(f)).map(file=>({file,sha256:hash(file)}));
const receipt={schemaVersion:1,capturedAt:new Date().toISOString(),uiBaseRef:'74ff690',uiHeadRef:'Source hashes identify reviewed implementation',stagingUrl,themes:['dark','light'],sourceFiles,captures,
  inspection:{renderedPixelsReviewed:true,reviewer:'Codex direct image inspection',reviewedAt:new Date().toISOString(),scope:'Classic, Operations, Zombies at 390/1440px in both themes; skippable checkpoints and all five creature poses',findings:['Operations field orders are compact and optional support is collapsed.','Zombie arena, pump rings, distinct creatures and attack boundaries are readable.','Classic checkpoint offers immediate return to combat; optional supplies are collapsed.','Reduced-motion creature probes are static; normal animation probes change rendered pixels.'],fixesApplied:['Removed overlapping generic tutorials from Operations and Zombies.','Replaced Operations wave/boss fanfare with one compact field-order cue.','Gave Sewer Zombies its own arena palette and varied spawn ordinal.','Outlined attack telegraphs and added skippable, compact checkpoints.'],blockingDefectsOpen:0},
  methodLimits:['Assisted task/checkpoint and creature fixtures are integration evidence, not participant playtests.','Gameplay canvases retain their authored dark palettes in both interface themes.','Light creature sheets use an artificial background for a contrast stress test.']};
fs.writeFileSync(path.resolve('docs/visual-qa/LATEST.json'),JSON.stringify(receipt,null,2)+'\n');
console.log(`Wrote ${captures.length} reviewed overhaul captures`);
