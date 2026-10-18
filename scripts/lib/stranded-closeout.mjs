// stranded-closeout.mjs — S365 [audit #2]. What an ABORTED closeout left in the tree,
// recorded by the run that left it and recognised later by content hash.
//
// THE DEFECT
//
// S364's closeout autopilot aborted three times (exit 3, 4, 1). Each run regenerated
// the brief, the IGNIS outputs, the rolling SIL header, the handoff archive and ~120
// other surfaces before a gate refused, and a scoped manual recovery then committed
// only the session's own hunks. The receipt ledger recorded WHICH STEPS ran — never
// WHAT THE RUN WROTE. So S365's /start stopped on 130+ "substantive" residue paths and
// the provenance had to be reconstructed by hand from mtimes, commit stats and handoff
// prose (~20 minutes on a saturated host). Every one of those paths was the closeout's
// own output; nothing distinguished it from founder work in progress.
//
// THE CONTRACT
//
//   1. At autopilot start, snapshot every dirty path → git blob id.
//   2. On a non-dry ABORT, record `stranded`: each dirty path whose blob differs from
//      the start snapshot. The window is the run's, so a concurrent writer inside it is
//      included — the basis field says so instead of claiming authorship.
//   3. At the next /start, a substantive residue path is PROVEN prior-closeout output
//      only when its CURRENT blob equals the blob an aborted run of the newest recorded
//      session stranded. A path edited since (one byte) is no longer proven and still
//      stops the session. Path names alone prove nothing.
//
// Hard-killed runs (no exit handler) record nothing; their residue stays unproven,
// which is the honest default.

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync as nodeSpawnSync } from './safe-spawn.mjs';

export const STRANDED_CAP = 500;
export const DELETED = 'deleted';
export const STRANDED_BASIS = 'dirty paths whose content changed during this aborted run window (concurrent writers inside the window are included)';

function normalizePath(p) { return String(p || '').replace(/\\/g, '/'); }

function git(repoRoot, args, input, spawn) {
  const r = spawn('git', args, { cwd: repoRoot, encoding: 'utf8', windowsHide: true, input, maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0) throw new Error(`git ${args[0]} failed: ${(r.stderr || r.error?.message || r.status)}`.trim());
  return r.stdout || '';
}

/** `git status --porcelain -z` → normalized dirty paths (rename targets, untracked included). */
export function parseStatusZ(text) {
  const out = [];
  const parts = String(text || '').split('\0');
  for (let i = 0; i < parts.length; i++) {
    const entry = parts[i];
    if (!entry || entry.length < 4) continue;
    const code = entry.slice(0, 2);
    out.push(normalizePath(entry.slice(3)));
    if (code.includes('R') || code.includes('C')) i++;   // -z rename: the source path follows
  }
  return out;
}

/** Blob id per path, or DELETED when the path no longer exists in the working tree. */
export function blobsFor(repoRoot, paths, { spawn = nodeSpawnSync } = {}) {
  const result = new Map();
  const present = [];
  for (const p of paths) {
    if (fs.existsSync(path.join(repoRoot, p))) present.push(p);
    else result.set(p, DELETED);
  }
  if (present.length) {
    const ids = git(repoRoot, ['hash-object', '--stdin-paths'], present.join('\n') + '\n', spawn).trim().split(/\r?\n/);
    if (ids.length !== present.length) throw new Error(`hash-object returned ${ids.length} ids for ${present.length} paths`);
    present.forEach((p, i) => result.set(p, ids[i]));
  }
  return result;
}

/** Every dirty path, spelled exactly as the recorder spells it (`-z -uall`). Throws if git cannot answer. */
export function dirtyPathsZ(repoRoot, { spawn = nodeSpawnSync } = {}) {
  return parseStatusZ(git(repoRoot, ['status', '--porcelain', '-z', '--untracked-files=all'], undefined, spawn));
}

/** Map<path, blob|DELETED> of every dirty path, or null when git cannot answer. */
export function observeDirtyBlobs(repoRoot, { spawn = nodeSpawnSync } = {}) {
  try {
    return blobsFor(repoRoot, dirtyPathsZ(repoRoot, { spawn }), { spawn });
  } catch { return null; }
}

/**
 * Paths dirty after the run whose blob differs from (or was absent in) the start snapshot.
 * A missing snapshot on either side is UNMEASURED — never an empty, confident answer.
 */
export function strandedDelta(before, after, { cap = STRANDED_CAP, exclude = [] } = {}) {
  if (!(before instanceof Map) || !(after instanceof Map)) return { measured: false, basis: STRANDED_BASIS, reason: 'tree snapshot unavailable at run start or exit' };
  const skip = new Set(exclude.map(normalizePath));
  const changed = [];
  for (const [p, blob] of after) {
    if (skip.has(p)) continue;
    if (before.get(p) !== blob) changed.push({ path: p, blob });
  }
  changed.sort((a, b) => a.path.localeCompare(b.path));
  return {
    measured: true,
    basis: STRANDED_BASIS,
    count: changed.length,
    truncated: changed.length > cap,
    paths: changed.slice(0, cap),
  };
}

export const RECOVER_STRANDED_COMMAND = 'node scripts/start-sync.mjs --recover-stranded';

/**
 * S366 [audit #4] — what an ABORTED run tells the founder at the moment it strands output.
 * S365 recorded `stranded` in the receipt but printed nothing, so residue surfaced only at
 * the next /start. Pure: returns lines; the caller decides where they go.
 */
export function formatStrandedNotice(stranded, { show = 10 } = {}) {
  if (!stranded || stranded.measured !== true) {
    return [
      '⚠ closeout aborted — stranded output UNMEASURED (tree snapshot unavailable); inspect `git status` before the next /start.',
    ];
  }
  if (!stranded.count) return ['· closeout aborted — it left no changed paths in the tree.'];
  const paths = stranded.paths || [];
  const lines = [
    `⚠ closeout aborted — ${stranded.count} path(s) stranded in the tree${stranded.truncated ? ` (receipt holds the first ${paths.length})` : ''}:`,
    ...paths.slice(0, show).map((p) => `    ${p.blob === DELETED ? '−' : '·'} ${p.path}`),
  ];
  if (paths.length > show) lines.push(`    … ${paths.length - show} more in portfolio/CLOSEOUT_AUTOPILOT_RECEIPTS.ndjson`);
  lines.push(`  Recover exactly these (proven by blob id) at the next /start: ${RECOVER_STRANDED_COMMAND}`);
  return lines;
}

/**
 * Which residue paths are byte-identical to what the newest session's aborted runs stranded.
 *
 * @param {object} o
 * @param {string[]} o.paths         substantive residue paths
 * @param {object[]} o.rows          closeout autopilot receipt rows
 * @param {string}   o.slug          this project's slug
 * @param {(paths:string[])=>Map}    o.blobsOf  current blob per path (DELETED when absent)
 */
export function matchStrandedResidue({ paths = [], rows = [], slug, blobsOf }) {
  // ATTRIBUTED sessions only (review finding, S365). An out-of-band row carries its
  // number in `derivedSession`, which S330 defines as a forward GUESS that must never be
  // read as evidence about the session it names — so it neither picks "newest" nor proves.
  const own = rows.filter((r) => r && r.projectSlug === slug && r.dry !== true && Number.isFinite(r.session));
  const newest = own.length ? Math.max(...own.map((r) => r.session)) : null;
  const aborted = own.filter((r) => r.outcome === 'aborted' && r.stranded?.measured === true && r.session === newest);
  const strandedBlobs = new Map();   // path → Map(blob → receiptId)
  for (const r of aborted) {
    for (const s of r.stranded.paths || []) {
      const p = normalizePath(s.path);
      if (!strandedBlobs.has(p)) strandedBlobs.set(p, new Map());
      strandedBlobs.get(p).set(s.blob, r.receiptId);
    }
  }
  const wanted = paths.map(normalizePath).filter((p) => strandedBlobs.has(p));
  const current = wanted.length ? blobsOf(wanted) : new Map();
  const proven = [];
  const unproven = [];
  for (const raw of paths) {
    const p = normalizePath(raw);
    const blob = current.get(p);
    const receiptId = strandedBlobs.get(p)?.get(blob);
    if (receiptId) proven.push({ path: p, receiptId, blob });
    else unproven.push(p);
  }
  return {
    session: newest,
    receipts: [...new Set(proven.map((x) => x.receiptId))],
    abortedRunsWithRecord: aborted.length,
    proven,
    unproven,
  };
}

/**
 * Expand residue paths as plain `git status --porcelain` reports them into the exact
 * `-z -uall` paths the recorder used (review finding, S365): porcelain folds a wholly
 * untracked directory into `dir/` and quotes a path with spaces (`"a b.md"`), so neither
 * could ever match a record. Unmatched residue is kept verbatim — it stays unproven.
 */
export function expandResiduePaths(residuePaths, listing) {
  const out = [];
  const seen = new Set();
  const push = (p) => { if (!seen.has(p)) { seen.add(p); out.push(p); } };
  for (const raw of residuePaths.map(normalizePath)) {
    const unquoted = /^".*"$/.test(raw) ? raw.slice(1, -1) : raw;
    const hits = raw.endsWith('/') ? listing.filter((p) => p.startsWith(raw)) : listing.filter((p) => p === unquoted);
    if (hits.length) hits.forEach(push); else push(raw);
  }
  return out;
}

/** Read the receipt ledger rows; [] when absent or unreadable (unproven, never a pass). */
export function readReceiptRows(ledgerPath) {
  try {
    return fs.readFileSync(ledgerPath, 'utf8').split('\n').filter(Boolean)
      .map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  } catch { return []; }
}
