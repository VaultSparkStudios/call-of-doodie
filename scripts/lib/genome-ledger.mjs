/**
 * genome-ledger.mjs — is context/GENOME_HISTORY.json a clean ledger? (S175)
 *
 * THE GAP THIS CLOSES.
 *
 * S174 shipped `closeout-artifact-currency.mjs`, which asks whether the genome
 * ledger records the CURRENT session. It answers that by taking the maximum
 * session label in the file, so it cannot be fooled into calling a stale
 * ledger fresh — but by the same token it is blind to everything behind that
 * maximum. Its own S174 brainstorm said so: "the history itself is not a clean
 * ledger and deserves a separate honesty pass." This is that pass.
 *
 * WHAT IS ACTUALLY WRONG, MEASURED (not inherited from the brainstorm).
 *
 *   1. DUPLICATE LABELS — two sessions appear twice (S123, S162). The writer
 *      (`append-genome-snapshot.mjs`, which this repo proxies to the control
 *      plane) upserts on the composite key `(date, session)`. Re-snapshotting
 *      the same session on a LATER DATE therefore appends a second row instead
 *      of updating the first. S162 has rows dated 2026-08-26 and 2026-09-03.
 *
 *   2. COVERAGE GAPS — S164, S165, S171 and S172 have no snapshot at all in
 *      the 160-174 window. This is the same defect class S174 closed for
 *      STATE_VECTOR: a mandatory §3.7 renderer silently not running, invisible
 *      because every surface that could have noticed only reads the maximum.
 *
 * WHAT THE S174 BRAINSTORM CLAIMED THAT THE DATA DOES NOT SUPPORT.
 *
 * That brainstorm recorded "duplicate and out-of-order session numbers". The
 * duplicates are real. "Out-of-order" is not: the labels are monotonically
 * non-decreasing across all 50 snapshots — there is no backwards label. It
 * also cited "a snapshot labelled 166 carrying S167 prose". S166's
 * `overallStatus` does match S167's, but `overallStatus` legitimately persists
 * unchanged across consecutive sessions — the same string is shared by 24 of
 * the 50 rows, including many that are certainly correct. It is therefore not
 * a mechanically provable defect, and this module deliberately does NOT gate
 * on it rather than manufacture a finding out of a heuristic that fires on
 * half the file. Monotonicity IS checked, so a genuine reversal would fail.
 *
 * WHY THE HISTORY IS NOT REWRITTEN.
 *
 * The ledger is append-only evidence. Deleting the duplicate rows or
 * back-filling the four missing snapshots would fabricate a record of
 * closeouts that did not happen — the precise failure this repo's canon
 * exists to prevent, and the opposite of S165's precedent, which recorded a
 * reused session number "rather than papering over it". So the known defects
 * are declared below as an explicit, dated baseline: visible in code, counted
 * in the report, and never silently forgiven. The gate fails on anything NEW.
 */

import fs from 'node:fs';
import path from 'node:path';

/**
 * Historical defects accepted as recorded debt, not force-greened.
 *
 * Every entry is a fact about the past that cannot be corrected without
 * inventing history. A NEW duplicate or a NEW gap is not covered here and
 * fails the gate. Shrink this list only by genuinely repairing the writer —
 * never by adding to it to quiet a fresh failure.
 */
export const ACCEPTED_HISTORICAL_DEFECTS = Object.freeze({
  recordedAt: 'S175 (2026-09-10)',
  duplicateSessions: Object.freeze([123, 162]),
  missingSessions: Object.freeze([164, 165, 171, 172]),
  reason:
    'Pre-existing rows written by the control-plane writer under a (date, session) upsert key, ' +
    'plus four closeouts that skipped the §3.7 genome renderer before S174 made that visible. ' +
    'Recorded rather than rewritten: back-filling would fabricate closeouts that never ran.',
});

/** Lowest session the coverage check considers. Earlier history predates the
 *  protocol requiring a snapshot every closeout, so gaps there are not defects. */
export const COVERAGE_FLOOR = 160;

export function readGenomeHistory(root) {
  const file = path.join(root, 'context', 'GENOME_HISTORY.json');
  if (!fs.existsSync(file)) return { ok: false, reason: 'context/GENOME_HISTORY.json not found', snapshots: null };
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    return { ok: false, reason: `context/GENOME_HISTORY.json does not parse: ${error.message}`, snapshots: null };
  }
  if (!Array.isArray(parsed?.snapshots)) {
    return { ok: false, reason: 'context/GENOME_HISTORY.json has no snapshots array', snapshots: null };
  }
  return { ok: true, reason: null, snapshots: parsed.snapshots };
}

/**
 * Analyse the ledger. Returns findings split into `accepted` (declared above)
 * and `regressions` (new, and therefore blocking).
 */
export function measureGenomeLedger(root) {
  const read = readGenomeHistory(root);
  if (!read.ok) {
    return {
      ok: false,
      unmeasurable: true,
      reason: read.reason,
      total: 0,
      duplicates: [],
      nonMonotonic: [],
      missing: [],
      regressions: [],
      accepted: [],
    };
  }

  const snapshots = read.snapshots;
  // `Number(null)` is 0, not NaN — a snapshot with `"session": null` (the shape
  // the writer emits when PROJECT_STATUS has no currentSession) would otherwise
  // be read as "session 0" and reported as a backwards label instead of as the
  // unlabelled row it actually is. Reject non-numbers before coercing.
  const sessionLabel = (value) =>
    typeof value === 'number' && Number.isFinite(value)
      ? value
      : typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))
        ? Number(value)
        : null;

  const labelled = snapshots
    .map((snapshot, index) => ({ index, session: sessionLabel(snapshot?.session), date: snapshot?.date ?? null }))
    .filter((row) => row.session !== null);

  const unlabelled = snapshots.length - labelled.length;

  // 1. duplicates
  const firstSeen = new Map();
  const duplicates = [];
  for (const row of labelled) {
    if (firstSeen.has(row.session)) {
      duplicates.push({ session: row.session, index: row.index, firstIndex: firstSeen.get(row.session), date: row.date });
    } else {
      firstSeen.set(row.session, row.index);
    }
  }

  // 2. monotonicity — a label that goes backwards is always a defect
  const nonMonotonic = [];
  let highest = -Infinity;
  for (const row of labelled) {
    if (row.session < highest) nonMonotonic.push({ session: row.session, index: row.index, after: highest });
    highest = Math.max(highest, row.session);
  }

  // 3. coverage gaps at or above the floor
  const present = new Set(labelled.map((row) => row.session));
  const ceiling = labelled.length ? Math.max(...present) : COVERAGE_FLOOR;
  const missing = [];
  for (let session = COVERAGE_FLOOR; session <= ceiling; session += 1) {
    if (!present.has(session)) missing.push(session);
  }

  const acceptedDupes = new Set(ACCEPTED_HISTORICAL_DEFECTS.duplicateSessions);
  const acceptedMissing = new Set(ACCEPTED_HISTORICAL_DEFECTS.missingSessions);

  const regressions = [];
  const accepted = [];
  for (const dupe of duplicates) {
    const row = { kind: 'duplicate-session', session: dupe.session, detail: `appears at index ${dupe.firstIndex} and ${dupe.index} (second dated ${dupe.date})` };
    (acceptedDupes.has(dupe.session) ? accepted : regressions).push(row);
  }
  for (const session of missing) {
    const row = { kind: 'missing-snapshot', session, detail: 'no genome snapshot — the §3.7 renderer did not run for this closeout' };
    (acceptedMissing.has(session) ? accepted : regressions).push(row);
  }
  for (const row of nonMonotonic) {
    // Never acceptable: a reversed label corrupts the ledger's ordering.
    regressions.push({ kind: 'non-monotonic-session', session: row.session, detail: `label goes backwards after S${row.after} (index ${row.index})` });
  }
  if (unlabelled > 0) {
    regressions.push({ kind: 'unlabelled-snapshot', session: null, detail: `${unlabelled} snapshot(s) carry no numeric session label` });
  }

  return {
    ok: regressions.length === 0,
    unmeasurable: false,
    reason: null,
    total: snapshots.length,
    coverageFloor: COVERAGE_FLOOR,
    coverageCeiling: ceiling,
    duplicates,
    nonMonotonic,
    missing,
    regressions,
    accepted,
  };
}
