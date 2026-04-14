#!/usr/bin/env node
/**
 * detect-session-mode.mjs — Builder↔Founder session-mode classifier (v3.1)
 *
 * Heuristic classifier: inspects Session Intent + TASK_BOARD scope + recent
 * user messages (if passed via --messages) and classifies the current session
 * as BUILDER (this-project work) or FOUNDER (cross-project / portfolio).
 *
 * Writes the classification to `context/PROJECT_STATUS.json` → `sessionMode`.
 * Emits a one-line explanation when the classification would FLIP the current mode.
 *
 * Start.md / closeout.md run this after logging Session Intent; mid-session
 * invocations re-check when the user gives a new directive.
 *
 * Usage:
 *   node scripts/detect-session-mode.mjs
 *   node scripts/detect-session-mode.mjs --json
 *   node scripts/detect-session-mode.mjs --explain
 *   node scripts/detect-session-mode.mjs --messages "give me a portfolio review"
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const STATUS = path.join(ROOT, 'context', 'PROJECT_STATUS.json');
const HANDOFF = path.join(ROOT, 'context', 'LATEST_HANDOFF.md');
const TASKBOARD = path.join(ROOT, 'context', 'TASK_BOARD.md');

const args = process.argv.slice(2);
const jsonMode = args.includes('--json');
const explain = args.includes('--explain');
const msgIdx = args.indexOf('--messages');
const userMessages = msgIdx >= 0 ? args.slice(msgIdx + 1).join(' ') : '';

function readText(p) { try { return fs.readFileSync(p, 'utf8'); } catch { return ''; } }
function readJson(p, fb) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return fb; } }

// Founder-mode signals
const FOUNDER_PHRASES = [
  /\bportfolio\b/i, /\ball\s+(projects|25)\b/i, /\bstudio[- ]wide\b/i, /\bstudio[- ]hub\b/i,
  /\bacross\s+projects\b/i, /\bcross[- ]project\b/i, /\bevery\s+project\b/i,
  /\bfounder mode\b/i, /\bfounder[- ]level\b/i, /\bstudio[- ]owner\b/i,
  /\bstrategic\b/i, /\bstrategy\b/i, /\broadmap\b/i, /\bportfolio review\b/i,
  /\bstudio[- ]ops\s+itself\b/i, /\bstudio[- ]review\b/i,
];

// Builder-mode signals (this-project focus)
const BUILDER_PHRASES = [
  /\bimplement\b/i, /\bfix\s+bug\b/i, /\badd\s+feature\b/i, /\brefactor\b/i,
  /\bship\s+this\b/i, /\bcomplete\s+task\b/i,
];

const status = readJson(STATUS, {});
const handoff = readText(HANDOFF);
const taskboard = readText(TASKBOARD);
const currentMode = status.sessionMode || 'builder';

// Collect text to analyze
const text = [
  userMessages,
  handoff.slice(0, 3000),
  taskboard.slice(0, 6000),
].join('\n');

// Count signals
let founderHits = 0;
let builderHits = 0;
const matchedFounder = [];
const matchedBuilder = [];
for (const p of FOUNDER_PHRASES) {
  const m = text.match(p);
  if (m) { founderHits++; matchedFounder.push(m[0]); }
}
for (const p of BUILDER_PHRASES) {
  const m = text.match(p);
  if (m) { builderHits++; matchedBuilder.push(m[0]); }
}

// Cross-project references in TASK_BOARD = Founder signal
const crossProjectRefs = (taskboard.match(/\b(mindframe|velaxis|call-of-doodie|football-gm|vaultfront|voidfall|promogrind|vorn|ideaforge|scriptorium|social-dashboard|spark-funnel)\b/gi) || []).length;

// Portfolio-wide commands in recent intent = Founder
const portfolioCommands = (userMessages + handoff.slice(0, 2000)).match(/\b(studio[- ]review|portfolio[- ]ignis|propagate[- ]templates|studio[- ]brain|weekly[- ]digest|pulse|founder[- ]queue)\b/gi)?.length || 0;

const founderScore = founderHits * 2 + Math.min(crossProjectRefs, 6) + portfolioCommands * 2;
const builderScore = builderHits * 2 + (crossProjectRefs === 0 ? 3 : 0);

const recommended = founderScore > builderScore + 2 ? 'founder' : 'builder';
const shouldFlip = recommended !== currentMode;

const result = {
  currentMode,
  recommended,
  shouldFlip,
  founderScore,
  builderScore,
  matchedFounder: [...new Set(matchedFounder)].slice(0, 8),
  matchedBuilder: [...new Set(matchedBuilder)].slice(0, 8),
  crossProjectRefs,
  portfolioCommands,
};

if (jsonMode) {
  console.log(JSON.stringify(result, null, 2));
  process.exit(0);
}

if (shouldFlip) {
  console.log(`⚡ Mode shift detected: ${currentMode.toUpperCase()} → ${recommended.toUpperCase()}`);
  console.log(`   Founder score: ${founderScore}  ·  Builder score: ${builderScore}`);
  if (matchedFounder.length) console.log(`   Founder signals: ${matchedFounder.slice(0, 4).join(', ')}`);
  // Persist the flip
  status.sessionMode = recommended;
  status.sessionModeAutoShiftedAt = new Date().toISOString();
  fs.writeFileSync(STATUS, JSON.stringify(status, null, 2) + '\n');
  console.log(`   PROJECT_STATUS.json updated.`);
} else {
  console.log(`= Mode stable: ${currentMode.toUpperCase()}  (founder ${founderScore} / builder ${builderScore})`);
}

if (explain) {
  console.log('\nExplanation:');
  console.log(`  • Founder phrases matched: ${matchedFounder.join(', ') || '(none)'}`);
  console.log(`  • Builder phrases matched: ${matchedBuilder.join(', ') || '(none)'}`);
  console.log(`  • Cross-project refs: ${crossProjectRefs}`);
  console.log(`  • Portfolio commands: ${portfolioCommands}`);
}
