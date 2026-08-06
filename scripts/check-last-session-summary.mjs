#!/usr/bin/env node
// check-last-session-summary.mjs — ensure cached last-session prose names the latest completed session.
//
// Usage:
//   node scripts/check-last-session-summary.mjs [--json]
//   node scripts/check-last-session-summary.mjs --fix   # self-heal from currentFocus when coherent
//
// Exit: 0 = coherent (or healed) · 1 = stale/missing/unparseable (and not healable).
//
// WHY --fix exists (S210): lastSessionSummary was a required-fresh field with a detector
// but NO writer — so it silently went stale (S208 prose survived the S209 closeout). The
// agent-maintained `currentFocus` always names the session just completed, so when it
// already names the expected (latest SIL) session we can mirror it into lastSessionSummary.
// Wired into closeout → coherent-by-construction, can't drift again.

import fs from 'node:fs';
import path from 'node:path';
import { latestSilSession as latestLedgerSession } from './lib/sil-ledger.mjs';
import { extractSessionId } from './lib/session-reference.mjs';
import { updateProjectStatus } from './lib/write-project-status.mjs';

export { extractSessionId } from './lib/session-reference.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const JSON_OUT = process.argv.includes('--json');
const FIX = process.argv.includes('--fix');

function readJson(file, fallback = null) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}

function readText(file) {
  try { return fs.readFileSync(file, 'utf8'); } catch { return ''; }
}

export function latestSilSession(silText) {
  return latestLedgerSession(silText);
}

export function evaluateLastSessionSummary({ status = {}, silText = '' } = {}) {
  const expected = latestSilSession(silText) ?? extractSessionId(status.currentSession);
  const actual = extractSessionId(status.lastSessionSummary);
  if (!expected) return { ok: false, expected, actual, reason: 'latest SIL session unavailable' };
  if (!actual) return { ok: false, expected, actual, reason: 'lastSessionSummary has no session marker' };
  if (actual !== expected) return { ok: false, expected, actual, reason: `expected S${expected}, summary says S${actual}` };
  return { ok: true, expected, actual, reason: `lastSessionSummary coherent at S${actual}` };
}

export function run(root = ROOT) {
  const status = readJson(path.join(root, 'context', 'PROJECT_STATUS.json'), {});
  const silText = readText(path.join(root, 'context', 'SELF_IMPROVEMENT_LOOP.md'));
  return evaluateLastSessionSummary({ status, silText });
}

// Self-heal: mirror currentFocus → lastSessionSummary ONLY when currentFocus already
// names the expected (latest-completed) session. Never fabricates a summary; if
// currentFocus is also stale/missing the right session, we leave the field untouched
// and report unhealable so the agent fixes it consciously at closeout.
export function fix(root = ROOT) {
  const statusPath = path.join(root, 'context', 'PROJECT_STATUS.json');
  const status = readJson(statusPath, {});
  const silText = readText(path.join(root, 'context', 'SELF_IMPROVEMENT_LOOP.md'));
  const verdict = evaluateLastSessionSummary({ status, silText });
  if (verdict.ok) return { ...verdict, healed: false };
  const focusSession = extractSessionId(status.currentFocus);
  if (!focusSession || focusSession !== verdict.expected) {
    return { ...verdict, healed: false, healable: false,
      reason: `${verdict.reason}; currentFocus names S${focusSession ?? '?'} (not S${verdict.expected}) — cannot auto-heal` };
  }
  const written = updateProjectStatus(root, (current) => ({ ...current, lastSessionSummary: String(status.currentFocus) }));
  const after = evaluateLastSessionSummary({ status: written.status, silText });
  return { ...after, healed: true, reason: `healed from currentFocus → S${after.actual}` };
}

if (process.argv[1] && path.resolve(process.argv[1]) === import.meta.filename) {
  const result = FIX ? fix() : run();
  if (JSON_OUT) console.log(JSON.stringify(result));
  else console.log(`${result.ok ? '✓' : '⚠'} last-session-summary: ${result.reason}`);
  process.exit(result.ok ? 0 : 1);
}
