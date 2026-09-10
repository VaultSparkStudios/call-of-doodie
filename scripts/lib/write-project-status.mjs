#!/usr/bin/env node
/**
 * write-project-status.mjs — shared write-path for context/PROJECT_STATUS.json
 * (S154 audit #10 · root-fixes the silScore/sum drift class S143 kept catching).
 *
 * INVARIANTS enforced at write time (CANON-031 — observability must not lie):
 *   1. Every silCategoriesV3 value is clamped/validated to 0..100.
 *   2. silScore := sum(silCategoriesV3) — always recomputed, never trusted.
 *   3. silMax := 1000 when categories present (SIL v3.0 rubric, CANON-009).
 *   4. lastUpdated := today (ISO date) unless explicitly suppressed.
 *
 * Usage (lib):
 *   import { enforceSilInvariant, writeProjectStatus } from './lib/write-project-status.mjs';
 *   writeProjectStatus(repoRoot, status);            // validates + writes
 *   const fixed = enforceSilInvariant(status);       // pure — returns {status, violations}
 *
 * Usage (CLI — safe to propagate to sibling repos via protocol-scripts lane):
 *   node scripts/lib/write-project-status.mjs --check          # validate only, exit 1 on violation
 *   node scripts/lib/write-project-status.mjs --fix            # rewrite in place with invariants applied
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// S156 #21: canonical list lives in lib/sil-categories.mjs (policy-drift extraction)
import { V3_CATS as CATS } from './sil-categories.mjs';
import { parseSilHistory } from './sil-history.mjs';
import { describeBound } from './test-signal.mjs';
// S196: SIL v6 dual-axis. Single write path — the Impact-axis invariant runs here
// too (non-breaking: fires only when silImpactCategories is present), so there is
// never a second divergent write path for the new fields.
import { enforceSilV6Invariant } from './sil-v6.mjs';
import { validateProjectStatusShape } from './project-status-contract.mjs';

/**
 * The append-only SIL ledger for a GIVEN repo root, or '' when unreadable (never throws).
 *
 * The root matters: `updateProjectStatusFile` writes status files belonging to other
 * projects and to temp fixtures, and deriving their averages from THIS repo's ledger
 * would import one project's history into another's status. Caught live by
 * tests/doctor-score-sync.test.js while this derivation was being added.
 *
 * Read defensively — an unreadable ledger must degrade to "leave the averages alone",
 * never to a crash.
 */
function readSilLedger(repoRoot) {
  if (!repoRoot) return '';
  try {
    return fs.readFileSync(path.join(repoRoot, 'context', 'SELF_IMPROVEMENT_LOOP.md'), 'utf8');
  } catch {
    return '';
  }
}

/**
 * Mean total of the newest `window` SCORED sessions in the ledger, to one decimal.
 *
 * Returns null — meaning "leave the existing value alone" — when the ledger cannot
 * supply a full window. A 3-session average computed from two sessions is a
 * different statistic wearing the same field name, and publishing it would be the
 * lie this invariant exists to prevent.
 */
export function deriveSilAverage(silText, window) {
  const scored = parseSilHistory(silText, Number.POSITIVE_INFINITY)
    .filter((entry) => Number.isFinite(entry.total));
  if (scored.length < window) return null;
  const mean = scored.slice(0, window).reduce((sum, entry) => sum + entry.total, 0) / window;
  return Math.round(mean * 10) / 10;
}

/**
 * Pure invariant pass. Returns { status, violations } — status is a new object
 * with invariants applied; violations lists what was wrong (empty = clean).
 *
 * `repoRoot` selects whose SIL ledger the averages derive from; `silText` overrides it
 * outright (tests, imported project paths). With neither, the averages are left alone.
 */
export function enforceSilInvariant(status, { silText = null, repoRoot = null } = {}) {
  const violations = [];
  const out = { ...status };
  const cats = out.silCategoriesV3;
  if (cats && typeof cats === 'object') {
    const fixed = {};
    for (const key of CATS) {
      let v = cats[key];
      if (typeof v !== 'number' || Number.isNaN(v)) {
        violations.push({ field: `silCategoriesV3.${key}`, value: v, fix: 'set 0 (was missing/non-numeric)' });
        v = 0;
      } else if (v < 0 || v > 100) {
        violations.push({ field: `silCategoriesV3.${key}`, value: v, fix: `clamped to ${Math.min(100, Math.max(0, v))}` });
        v = Math.min(100, Math.max(0, v));
      }
      fixed[key] = v;
    }
    // preserve any extra keys verbatim (forward-compat) but never let them
    // contribute to the score sum
    for (const [k, v] of Object.entries(cats)) if (!(k in fixed)) fixed[k] = v;
    out.silCategoriesV3 = fixed;
    const sum = CATS.reduce((s, k) => s + fixed[k], 0);
    if (out.silScore !== sum) {
      violations.push({ field: 'silScore', value: out.silScore, fix: `recomputed to ${sum} (= sum of categories)` });
      out.silScore = sum;
    }
    if (out.silMax !== 1000) {
      violations.push({ field: 'silMax', value: out.silMax, fix: 'set 1000 (SIL v3.0)' });
      out.silMax = 1000;
    }
  }
  // ── S174 [audit #3] · the averages were trusted, not derived ────────────────
  // silScore has been recomputed-never-trusted since S154, but silAvg3/silAvg5 sat
  // beside it as hand-entered numbers with no authority behind them. Measured live at
  // S174: PROJECT_STATUS said silAvg3 995 while STATE_VECTOR said 997.7, and neither
  // was compared to the ledger. The visible symptom was a churn loop in git history —
  // a closeout hand-writes `995.0`, JSON.stringify below cannot preserve a trailing
  // `.0`, and the next script write reverts it, forever.
  //
  // Both averages are a pure function of the append-only SIL ledger, so derive them
  // from it under the same rule as silScore. Deliberately a no-op when the ledger is
  // unreadable or too short: an average over fewer sessions than it claims to cover
  // would be exactly the invented measurement CANON-031 forbids.
  const ledgerText = silText ?? readSilLedger(repoRoot);
  for (const [field, window] of [['silAvg3', 3], ['silAvg5', 5]]) {
    // Correct an average the status already publishes; never introduce one. A status
    // that does not track this field is not lying about it, and adding it here would
    // make the writer a schema author instead of an invariant.
    if (!(field in out)) continue;
    const derived = deriveSilAverage(ledgerText, window);
    if (derived == null) continue;
    if (out[field] !== derived) {
      violations.push({ field, value: out[field], fix: `recomputed to ${derived} (mean of the last ${window} scored SIL sessions)` });
      out[field] = derived;
    }
  }

  // SIL v6 Impact-axis invariant (non-breaking — no-op unless silImpactCategories present).
  const v6 = enforceSilV6Invariant(out);
  for (const v of v6.violations) violations.push(v);

  // ── S283 [audit #2] · structured-vs-prose test deferral ────────────────────
  // testsDeferredNote and testsLastRunMode are hand-authored at closeout;
  // testsDeferred is machine-owned. When the prose says "30 files remained
  // budget-deferred and are not counted green" and the array beside it is [],
  // every consumer reads zero deferrals and renders a checkmark — the S283
  // unfalsifiable green. This is a WRITER defect, so it is reported here, at the
  // write path, and NOT auto-"fixed": the honest file list is knowable only to
  // the run that deferred them, and fabricating placeholder entries to clear a
  // violation would be exactly the invented measurement CANON-031 forbids.
  const bound = describeBound(v6.status);
  if (bound.writerDefect) {
    violations.push({
      field: 'testsDeferred',
      value: v6.status.testsDeferred,
      fix: `NOT auto-fixed — record the ${bound.claimedDeferred ?? 'deferred'} file(s) the run actually skipped (${bound.reason}). An empty array beside a deferral note makes the green unfalsifiable; never fabricate entries to clear this.`,
      unfixable: true,
    });
  }

  return { status: v6.status, violations };
}

const LOCK_NAME = '.project-status.lock';
const waitBuffer = new Int32Array(new SharedArrayBuffer(4));

function pause(ms) {
  Atomics.wait(waitBuffer, 0, 0, Math.max(1, ms));
}

/** Serialize every status mutation behind one bounded, stale-recovering lock. */
export function withProjectStatusLock(repoRoot, work, { timeoutMs = 2500, staleMs = 30_000, pollMs = 20 } = {}) {
  const contextDir = path.join(repoRoot, 'context');
  const lockPath = path.join(contextDir, LOCK_NAME);
  fs.mkdirSync(contextDir, { recursive: true });
  const started = Date.now();
  const lockOwnerId = `${process.pid}:${started}:${Math.random().toString(36).slice(2)}`;
  let handle = null;
  while (handle == null) {
    try {
      handle = fs.openSync(lockPath, 'wx');
      fs.writeFileSync(handle, lockOwnerId, 'utf8');
    } catch (error) {
      if (error?.code !== 'EEXIST') throw error;
      try {
        if (Date.now() - fs.statSync(lockPath).mtimeMs > staleMs) {
          fs.unlinkSync(lockPath);
          continue;
        }
      } catch (statError) {
        if (statError?.code === 'ENOENT') continue;
        throw statError;
      }
      if (Date.now() - started >= timeoutMs) {
        throw new Error(`PROJECT_STATUS write lock timed out after ${timeoutMs}ms: ${lockPath}`);
      }
      pause(pollMs);
    }
  }
  try {
    return work();
  } finally {
    try { fs.closeSync(handle); } catch { /* already closed */ }
    try {
      if (fs.readFileSync(lockPath, 'utf8') === lockOwnerId) fs.unlinkSync(lockPath);
    } catch { /* lock cleanup is best-effort */ }
  }
}

function validateStatusShape(status, repoRoot, { requireSchema = true } = {}) {
  const shape = validateProjectStatusShape(status, repoRoot);
  if (shape.schemaMissing && !requireSchema) return;
  if (!shape.ok) {
    throw new Error(`PROJECT_STATUS contract invalid:\n${shape.errors.map((error) => `  - ${error}`).join('\n')}`);
  }
}

function writeProjectStatusUnlocked(repoRoot, status, {
  touchLastUpdated = true,
  statusPath = null,
  requireSchema = true,
} = {}) {
  const { status: fixed, violations } = enforceSilInvariant(status, { repoRoot });
  if (touchLastUpdated) fixed.lastUpdated = new Date().toISOString().slice(0, 10);
  validateStatusShape(fixed, repoRoot, { requireSchema });
  const p = statusPath || path.join(repoRoot, 'context', 'PROJECT_STATUS.json');
  fs.mkdirSync(path.dirname(p), { recursive: true });
  const temporary = path.join(path.dirname(p), `.PROJECT_STATUS.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`);
  try {
    fs.writeFileSync(temporary, JSON.stringify(fixed, null, 2) + '\n', 'utf8');
    fs.renameSync(temporary, p);
  } finally {
    try { if (fs.existsSync(temporary)) fs.unlinkSync(temporary); } catch { /* best-effort */ }
  }
  return { written: p, violations, status: fixed };
}

/**
 * Validate + write context/PROJECT_STATUS.json under the invariant.
 * Returns { written, violations }. Throws on schema-contract or I/O failure.
 */
export function writeProjectStatus(repoRoot, status, { touchLastUpdated = true } = {}) {
  return withProjectStatusLock(repoRoot, () => writeProjectStatusUnlocked(repoRoot, status, { touchLastUpdated }));
}

/** Read-modify-write helper: apply a mutator fn under the invariant. */
export function updateProjectStatus(repoRoot, mutate, opts = {}) {
  return withProjectStatusLock(repoRoot, () => {
    const p = path.join(repoRoot, 'context', 'PROJECT_STATUS.json');
    const current = JSON.parse(fs.readFileSync(p, 'utf8'));
    const next = mutate({ ...current }) || current;
    return writeProjectStatusUnlocked(repoRoot, next, opts);
  }, opts);
}

function repoRootForStatusPath(statusPath) {
  const absolute = path.resolve(statusPath);
  const parent = path.dirname(absolute);
  return path.basename(parent).toLowerCase() === 'context' ? path.dirname(parent) : parent;
}

/** Atomic read-modify-write for status fixtures or imported project paths. */
export function updateProjectStatusFile(statusPath, mutate, opts = {}) {
  const repoRoot = repoRootForStatusPath(statusPath);
  const schemaExists = fs.existsSync(path.join(repoRoot, 'context', 'PROJECT_STATUS.schema.json'));
  return withProjectStatusLock(repoRoot, () => {
    const current = JSON.parse(fs.readFileSync(statusPath, 'utf8'));
    const next = mutate({ ...current }) || current;
    return writeProjectStatusUnlocked(repoRoot, next, {
      ...opts,
      statusPath,
      requireSchema: opts.requireSchema ?? schemaExists,
    });
  }, opts);
}

// ── CLI ──────────────────────────────────────────────────────────────────────
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const args = process.argv.slice(2);
  const repoRoot = (() => {
    const i = args.indexOf('--repo-root');
    return i >= 0 ? path.resolve(args[i + 1]) : process.cwd();
  })();
  const p = path.join(repoRoot, 'context', 'PROJECT_STATUS.json');
  if (!fs.existsSync(p)) { console.error(`⛔ no PROJECT_STATUS.json at ${p}`); process.exit(2); }
  const current = JSON.parse(fs.readFileSync(p, 'utf8'));
  const { status: fixed, violations } = enforceSilInvariant(current, { repoRoot });
  const shape = validateProjectStatusShape(fixed, repoRoot);
  if (!shape.ok) {
    console.error(`⛔ PROJECT_STATUS contract invalid (${shape.errors.length}):`);
    for (const error of shape.errors) console.error(`  - ${error}`);
    process.exit(shape.schemaMissing ? 2 : 1);
  }
  // S283: some violations are deliberately NOT auto-fixable — the honest value
  // is knowable only to the run that produced it, and inventing one to clear the
  // check is the exact lie the check exists to catch. Counting those as "fixed"
  // would make --fix itself a dishonest heal, so they are reported separately and
  // still fail the exit code.
  const fixable = violations.filter(v => !v.unfixable);
  const unfixable = violations.filter(v => v.unfixable);
  if (args.includes('--fix')) {
    if (fixable.length) {
      writeProjectStatus(repoRoot, fixed, { touchLastUpdated: false });
      console.log(`✓ fixed ${fixable.length} violation(s):`);
      for (const v of fixable) console.log(`  - ${v.field}=${JSON.stringify(v.value)} → ${v.fix}`);
    } else if (!unfixable.length) {
      console.log('✓ invariant clean — no changes');
    }
    if (unfixable.length) {
      console.error(`⛔ ${unfixable.length} violation(s) --fix cannot honestly repair:`);
      for (const v of unfixable) console.error(`  - ${v.field}=${JSON.stringify(v.value)} → ${v.fix}`);
      process.exit(1);
    }
    process.exit(0);
  }
  // default: --check
  if (violations.length) {
    console.error(`⚠ ${violations.length} SIL invariant violation(s) in ${p}:`);
    for (const v of violations) console.error(`  - ${v.field}=${JSON.stringify(v.value)} → ${v.fix}`);
    process.exit(1);
  }
  console.log(`✓ SIL invariant clean (silScore=${current.silScore ?? '—'})`);
  process.exit(0);
}

export default { enforceSilInvariant, deriveSilAverage, withProjectStatusLock, writeProjectStatus, updateProjectStatus, updateProjectStatusFile };
