/**
 * closeout-artifact-currency.mjs — are the artifacts §3.7 renders actually current?
 *
 * THE GAP THIS CLOSES (S174, found live).
 *
 * `docs/SESSION_PROTOCOL.md` §3.7 requires three renderers every closeout
 * (render-state-vector · compute-entropy · append-genome-snapshot). Two probes
 * looked like they covered that and neither did:
 *
 *   · protocol-drift-check.mjs asserts each renderer FILE EXISTS. Presence is not
 *     currency — a renderer that is never invoked passes forever.
 *   · check-writeback-currency.mjs anchors on SELF_IMPROVEMENT_LOOP.md, so it
 *     answers "did a closeout run?", not "did the closeout render everything?".
 *
 * Result, measured at S174: STATE_VECTOR.json and GENOME_HISTORY.json had both been
 * stale since S170 — three consecutive closeouts skipped a mandatory step while every
 * gate stayed green. STATE_VECTOR was publishing session 170 / silTotal 997 while
 * PROJECT_STATUS said 173 / 995.
 *
 * SCOPE: only SESSION-KEYED artifacts belong in the table below. STUDIO_MANIFEST.json
 * and MEMORY_INDEX.md look stale by git date and are not — the manifest is regenerated
 * from PROJECT_STATUS and reproduces byte-identically, and MEMORY_INDEX is a static
 * navigation index with no writer at all. Adding either here would need a session
 * marker invented for it, which is the same fabrication this gate exists to prevent.
 *
 * So this probe measures each artifact's OWN recorded session against the SIL
 * ledger — the append-only closeout authority — and reports the lag.
 *
 * DECLARED-EXTRACTOR RULE. An artifact is only checkable if this module can say
 * where its session number lives. Anything whose currency cannot be read is
 * reported as `unmeasurable`, never silently treated as fresh: an artifact we
 * cannot measure is exactly the one that goes stale unnoticed.
 */

import fs from 'node:fs';
import path from 'node:path';

import { parseSilHistory } from './sil-history.mjs';

/**
 * Closeout-owned artifacts and how to read the session each one records.
 *
 * `session(text)` returns the session number the artifact claims, or null when
 * the artifact carries no readable session marker.
 */
export const CLOSEOUT_ARTIFACTS = [
  {
    file: 'context/STATE_VECTOR.json',
    renderer: 'scripts/render-state-vector.mjs',
    protocol: 'SESSION_PROTOCOL §3.7',
    session: (text) => JSON.parse(text)?.session ?? null,
  },
  {
    file: 'context/GENOME_HISTORY.json',
    renderer: 'scripts/append-genome-snapshot.mjs',
    protocol: 'SESSION_PROTOCOL §3.7',
    session: (text) => {
      const snapshots = JSON.parse(text)?.snapshots;
      if (!Array.isArray(snapshots) || snapshots.length === 0) return null;
      // Append-only, but historically not strictly ordered — take the maximum
      // rather than the last element so an out-of-order append cannot read as stale.
      const sessions = snapshots.map((s) => Number(s?.session)).filter(Number.isFinite);
      return sessions.length ? Math.max(...sessions) : null;
    },
  },
];

/** The newest session recorded in the append-only SIL ledger. */
export function ledgerSession(silText) {
  const [newest] = parseSilHistory(silText, 1);
  return newest?.session ?? null;
}

/**
 * Measure every declared artifact against the ledger.
 * Returns { authority, rows, stale, unmeasurable, ok }.
 */
export function measureCloseoutArtifacts(repoRoot, { artifacts = CLOSEOUT_ARTIFACTS } = {}) {
  const silPath = path.join(repoRoot, 'context', 'SELF_IMPROVEMENT_LOOP.md');
  const authority = fs.existsSync(silPath)
    ? ledgerSession(fs.readFileSync(silPath, 'utf8'))
    : null;

  const rows = artifacts.map((artifact) => {
    const absolute = path.join(repoRoot, artifact.file);
    if (!fs.existsSync(absolute)) {
      return { ...artifact, status: 'unmeasurable', reason: 'file missing', recorded: null, lag: null };
    }
    let recorded = null;
    try {
      recorded = artifact.session(fs.readFileSync(absolute, 'utf8'));
    } catch (error) {
      return {
        ...artifact,
        status: 'unmeasurable',
        reason: `unreadable (${error.message})`,
        recorded: null,
        lag: null,
      };
    }
    if (!Number.isFinite(recorded)) {
      return { ...artifact, status: 'unmeasurable', reason: 'no session marker', recorded: null, lag: null };
    }
    if (authority == null) {
      return { ...artifact, status: 'unmeasurable', reason: 'SIL ledger unreadable', recorded, lag: null };
    }
    const lag = authority - recorded;
    // Ahead-of-ledger is normal mid-session: a renderer can run before the SIL
    // entry is appended. Only lag behind the newest CLOSED-OUT session is debt.
    return { ...artifact, status: lag > 0 ? 'stale' : 'current', recorded, lag };
  });

  const stale = rows.filter((r) => r.status === 'stale');
  const unmeasurable = rows.filter((r) => r.status === 'unmeasurable');
  return { authority, rows, stale, unmeasurable, ok: stale.length === 0 && unmeasurable.length === 0 };
}

export default { CLOSEOUT_ARTIFACTS, ledgerSession, measureCloseoutArtifacts };
