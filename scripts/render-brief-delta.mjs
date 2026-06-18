#!/usr/bin/env node
/**
 * render-brief-delta.mjs — token-lean delta brief for warm /start sessions.
 *
 * Reads docs/STARTUP_BRIEF.md (current) + .cache/startup-brief.prev.md (snapshot)
 * and emits a compact delta brief at docs/STARTUP_BRIEF_DELTA.md.
 *
 * Output is bounded to ≤30 lines — score Δ, new genius items, freshly stale
 * signals, new founder unlocks. Used by /start when the previous snapshot is
 * fresh (≤24h) and most state is unchanged. Cuts /start tokens ~60%.
 *
 * If no snapshot or current brief is missing, exits 1 with a hint to run
 * `ops startup-brief` first.
 *
 * Usage:
 *   node scripts/render-brief-delta.mjs
 *   node scripts/render-brief-delta.mjs --json
 *   node scripts/render-brief-delta.mjs --stdout
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const CURRENT = path.join(ROOT, 'docs/STARTUP_BRIEF.md');
const SNAPSHOT = path.join(ROOT, '.cache/startup-brief.prev.md');
const OUTPUT = path.join(ROOT, 'docs/STARTUP_BRIEF_DELTA.md');

const args = new Set(process.argv.slice(2));
const asJson = args.has('--json');
const stdoutOnly = args.has('--stdout');

function readSafe(p) { try { return fs.readFileSync(p, 'utf8'); } catch { return null; } }

function extractBlocks(text) {
  const re = /╔══\s*([A-Z][A-Z 0-9·]+?)\s*═+╗\s*\n([\s\S]*?)╚═+╝/g;
  const blocks = {};
  for (const m of text.matchAll(re)) blocks[m[1].trim()] = m[2];
  return blocks;
}

function extractSilScore(text) {
  const m = text.match(/(\d{3,4})\/1000\s+[█░]+\s+(\d+)%/);
  return m ? { score: parseInt(m[1], 10), pct: parseInt(m[2], 10) } : null;
}

function extractSession(text) {
  const m = text.match(/Session\s+(\d+)\s+·\s+([0-9-]+)/);
  return m ? { session: parseInt(m[1], 10), date: m[2] } : null;
}

function extractRows(block) {
  return (block || '')
    .split(/\r?\n/)
    .map(l => l.replace(/^║/, '').replace(/║$/, '').trim())
    .filter(Boolean);
}

function extractGeniusItems(block) {
  // Lines like "🔥  1  [SIL]  Title..." — extract title text after the tier number
  return extractRows(block)
    .filter(l => /^\W?[🔥⚡💡]\s+\d+\s+/.test(l))
    .map(l => l.replace(/^\W?[🔥⚡💡]\s+\d+\s+/, '').slice(0, 80));
}

function extractWarnings(signalsBlock) {
  return extractRows(signalsBlock).filter(l => l.startsWith('⚠'));
}

// S154 audit #5 — criticals can NEVER be hidden by the delta path (CANON-031).
// Every ⛔ line anywhere in the brief is always rendered, changed or not.
function extractCriticals(text) {
  return text.split(/\r?\n/)
    .filter(l => l.includes('⛔'))
    .map(l => l.replace(/^║/, '').replace(/║$/, '').trim())
    .slice(0, 10);
}

const current = readSafe(CURRENT);
if (!current) {
  console.error('✗ docs/STARTUP_BRIEF.md missing — run `node scripts/ops.mjs startup-brief` first');
  process.exit(1);
}
const prev = readSafe(SNAPSHOT);
if (!prev) {
  console.error('brief-delta: no previous snapshot — first session in cycle. Read full brief at docs/STARTUP_BRIEF.md.');
  process.exit(1);
}

const cur = { blocks: extractBlocks(current), score: extractSilScore(current), session: extractSession(current) };
const old = { blocks: extractBlocks(prev), score: extractSilScore(prev), session: extractSession(prev) };

const scoreDelta = (cur.score && old.score) ? cur.score.score - old.score.score : null;
const arrow = scoreDelta == null ? '·' : (scoreDelta > 0 ? '↑' : scoreDelta < 0 ? '↓' : '→');

const curGenius = extractGeniusItems(cur.blocks['GENIUS HIT LIST'] || '');
const oldGenius = extractGeniusItems(old.blocks['GENIUS HIT LIST'] || '');
const newGenius = curGenius.filter(g => !oldGenius.includes(g)).slice(0, 5);

const curWarns = extractWarnings(cur.blocks['SIGNALS'] || '');
const oldWarns = extractWarnings(old.blocks['SIGNALS'] || '');
const newWarns = curWarns.filter(w => !oldWarns.includes(w)).slice(0, 5);

const curUnlocks = extractRows(cur.blocks['FOUNDER UNLOCKS'] || '').slice(2);
const oldUnlocks = extractRows(old.blocks['FOUNDER UNLOCKS'] || '').slice(2);
const newUnlocks = curUnlocks.filter(u => !oldUnlocks.includes(u)).slice(0, 3);

const curHumanPressure = (cur.blocks['HUMAN PRESSURE'] || '').match(/Top item:\s*(.+)/)?.[1]?.trim() || '';
const oldHumanPressure = (old.blocks['HUMAN PRESSURE'] || '').match(/Top item:\s*(.+)/)?.[1]?.trim() || '';
const pressureChanged = curHumanPressure && curHumanPressure !== oldHumanPressure;

const materialChanges = scoreDelta !== 0 || newGenius.length > 0 || newWarns.length > 0 || newUnlocks.length > 0 || pressureChanged;

const sessionLabel = cur.session ? `Session ${cur.session.session} · ${cur.session.date}` : '';
const prevLabel = old.session ? `vs Session ${old.session.session}` : 'vs prev';

const lines = [];
lines.push(`# Startup Brief — Delta`);
lines.push('');
lines.push(`> ${sessionLabel} · ${prevLabel} · token-lean delta (full: \`docs/STARTUP_BRIEF.md\`)`);
lines.push('');

if (cur.score && old.score) {
  lines.push(`**SIL:** ${old.score.score} → ${cur.score.score} ${arrow} (${scoreDelta >= 0 ? '+' : ''}${scoreDelta})`);
  lines.push('');
}

// SEVERE block — always present when any ⛔ exists, regardless of change state.
const criticals = extractCriticals(current);
if (criticals.length) {
  lines.push(`## ⛔ SEVERE (always shown — never suppressed by delta)`);
  for (const c of criticals) lines.push(`- ${c.slice(0, 110)}`);
  lines.push('');
}

if (!materialChanges) {
  lines.push(`*No material changes since previous snapshot. Read full brief only if needed.*`);
} else {
  if (newWarns.length) {
    lines.push(`## New warnings`);
    for (const w of newWarns) lines.push(`- ${w.slice(0, 100)}`);
    lines.push('');
  }
  if (newGenius.length) {
    lines.push(`## New genius items`);
    for (const g of newGenius) lines.push(`- ${g}`);
    lines.push('');
  }
  if (newUnlocks.length) {
    lines.push(`## New founder unlocks`);
    for (const u of newUnlocks) lines.push(`- ${u.slice(0, 100)}`);
    lines.push('');
  }
  if (pressureChanged) {
    lines.push(`**Top human-pressure shifted:** ${curHumanPressure}`);
    lines.push('');
  }
}

lines.push(`---`);
lines.push(`*Run \`node scripts/render-brief-delta.mjs\` after each closeout snapshot.*`);

const out = lines.join('\n');

if (asJson) {
  console.log(JSON.stringify({
    ok: true,
    materialChanges,
    sessionDelta: { from: old.session?.session, to: cur.session?.session },
    silDelta: scoreDelta,
    newGenius,
    newWarns,
    newUnlocks,
    pressureChanged,
    pressureNow: curHumanPressure,
    output: path.relative(ROOT, OUTPUT).replace(/\\/g, '/'),
    lines: lines.length,
  }, null, 2));
} else if (stdoutOnly) {
  console.log(out);
} else {
  fs.writeFileSync(OUTPUT, out, 'utf8');
  console.log(`✓ Brief delta → docs/STARTUP_BRIEF_DELTA.md  (${lines.length} lines · ${materialChanges ? 'material change' : 'no change'})`);
  if (scoreDelta != null) console.log(`  SIL ${old.score.score} → ${cur.score.score} ${arrow} (${scoreDelta >= 0 ? '+' : ''}${scoreDelta}) · +${newGenius.length} genius · +${newWarns.length} warn · +${newUnlocks.length} unlock`);
}

process.exit(0);
