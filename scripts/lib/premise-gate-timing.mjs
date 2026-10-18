// premise-gate-timing.mjs — S385 [audit #1] · closes [SIL:2⛔][S382 #1].
//
// The strict premise gate (check-audit-premises --strict) is required BEFORE the first
// implementation edit (SESSION_PROTOCOL §2C 2.5). At S382 it ran after the edits, and
// nothing mechanical could tell: the gate printed a verdict and kept no record of WHEN.
// `--record` now writes a `premiseGate` block into the sidecar; this module judges that
// record against the session's start_head. Pure: the caller gathers git facts.
import crypto from 'node:crypto';

export const PREMISE_GATE_SCHEMA = 'premise-gate/v1';

/**
 * Paths a session writes as RECORD, not implementation: startup/closeout surfaces, the
 * audit itself, ledgers. Everything else is implementation — unknown paths count, so a
 * new directory can never slip a pre-gate edit past the check (fail closed).
 */
const SESSION_RECORD_PATHS = [
  /^context\//,
  /^logs\/WORK_LOG\.md$/,
  /^\.cache\//,
  /^docs\/AUDIT_[^/]+\.(?:json|md)$/,
  /^docs\/IMPLEMENT_PLAN\.md$/,
  /^docs\/STARTUP_BRIEF(?:_V5)?\.md$/,
  /^docs\/FRONTIER_CAPABILITY_RADAR\.md$/,
  /^docs\/CLOSEOUT_[^/]+\.md$/,
];
// Review S385 #6 — `portfolio/` and `logs/` are ledgers ONLY in the control plane. This
// module propagates: Obelisk tracks portfolio/RELYING_PARTIES.json and VEILOS
// logs/transparency.jsonl as real state, so a recipient gets the narrow set.
const CONTROL_PLANE_RECORD_PATHS = [/^portfolio\//, /^logs\//];

export const RECORD_PATH_POLICIES = Object.freeze(['control-plane', 'project']);

export function isImplementationPath(p, policy = 'project') {
  const rel = String(p || '').replace(/\\/g, '/').replace(/^"|"$/g, '');
  if (!rel) return false;
  if (SESSION_RECORD_PATHS.some((re) => re.test(rel))) return false;
  return !(policy === 'control-plane' && CONTROL_PLANE_RECORD_PATHS.some((re) => re.test(rel)));
}

/** Digest of what the gate verified: each item's id and typed premises, nothing else. */
export function premiseDigest(items = []) {
  const shape = (items || []).map((item) => ({ id: item.id ?? null, premises: item.premises ?? [] }));
  return crypto.createHash('sha256').update(JSON.stringify(shape)).digest('hex');
}

/** porcelain -z-free text → implementation paths that were dirty (tracked or untracked). */
export function implementationDirtyPaths(porcelain = '', policy = 'project') {
  const out = [];
  for (const raw of String(porcelain).split(/\r?\n/)) {
    if (!raw.trim()) continue;
    // Both sides of a rename (review S385 #9): moving an implementation file into a record
    // directory still changed implementation.
    for (const p of raw.slice(3).trim().split(' -> ')) {
      if (isImplementationPath(p, policy)) out.push(p.replace(/\\/g, '/'));
    }
  }
  return out;
}

// S386 [audit #1] · [SIL][S385 #1] — routine Actions commit to main during every session,
// so start_head..gate.head holds other writers' commits. The session lock records a digest
// of the opening identity (never the address itself, CANON-028); a commit counts as another
// writer's only when BOTH digests are well-formed and differ. Anything unreadable counts.
const DIGEST_RE = /^[0-9a-f]{64}$/;

/** sha256 of a normalised author email; null for an empty or missing address. */
export function authorDigest(email) {
  const norm = String(email ?? '').trim().toLowerCase();
  return norm ? crypto.createHash('sha256').update(norm).digest('hex') : null;
}

/**
 * @param {object} a
 * @param {object|null} a.gate              sidecar.premiseGate
 * @param {string} a.currentDigest          premiseDigest(sidecar.items) now
 * @param {string|null} a.startHead         the session lock's start_head
 * @param {boolean|null} a.gateDescendsFromStart  start_head is an ancestor of (or equal to) gate.head
 * @param {{sha:string, paths:string[], authorDigest?:string|null}[]} a.commitsBeforeGate  commits in start_head..gate.head
 * @param {string|null} a.sessionAuthorDigest  the session lock's author_digest
 * @returns {{state:string, ok:boolean, detail:string, offending?:string[], otherWriters?:string[]}}
 */
export function assessPremiseGateTiming({ gate, currentDigest, startHead, gateDescendsFromStart, commitsBeforeGate = [], auditName = null, sessionAuthorDigest = null }) {
  if (!gate) return { state: 'missing', ok: false, detail: 'no premiseGate record — run check-audit-premises --strict --record BEFORE the first implementation edit' };
  if (gate.schema !== PREMISE_GATE_SCHEMA) return { state: 'invalid', ok: false, detail: `premiseGate schema ${gate.schema ?? '(none)'} is not ${PREMISE_GATE_SCHEMA}` };
  const recorded = String(gate.sidecar || '').split('/').pop();
  if (auditName && !recorded) return { state: 'invalid', ok: false, detail: 'the record names no sidecar (written before records carried one) — re-record with --audit' };
  if (auditName && recorded !== auditName) return { state: 'foreign', ok: false, detail: `the record names ${recorded || '(no sidecar)'}, not ${auditName} — copied or misattributed` };
  if (!gate.strict) return { state: 'invalid', ok: false, detail: 'premiseGate was recorded without --strict; an advisory run is not the gate' };
  if (gate.exit !== 0) return { state: 'failed', ok: false, detail: `the recorded gate exited ${gate.exit} (${gate.verified} verified · ${gate.contradicted} contradicted · ${gate.unverified} unverified)` };
  if (gate.premiseDigest !== currentDigest) return { state: 'stale', ok: false, detail: 'premises changed after the gate ran — the record verifies a different plan; re-run the gate' };
  if (!startHead) return { state: 'unknown', ok: false, detail: 'no session start_head to judge timing against (session lock missing or unlabelled)' };
  if (gateDescendsFromStart === null || gateDescendsFromStart === undefined) return { state: 'unknown', ok: false, detail: `could not establish whether ${String(gate.head).slice(0, 9)} descends from start_head ${startHead.slice(0, 9)}` };
  if (!gateDescendsFromStart) return { state: 'foreign', ok: false, detail: `gate head ${String(gate.head).slice(0, 9)} does not descend from this session's start_head ${startHead.slice(0, 9)} — a record from another session` };
  // An unrecognised or absent policy is judged by the narrow project set (fail closed).
  const policy = gate.recordPathPolicy === 'control-plane' ? 'control-plane' : 'project';
  const dirty = (gate.implementationDirty || []).filter((p) => isImplementationPath(p, policy));
  const knownSession = DIGEST_RE.test(String(sessionAuthorDigest ?? ''));
  const isOtherWriter = (c) => knownSession && DIGEST_RE.test(String(c.authorDigest ?? '')) && c.authorDigest !== sessionAuthorDigest;
  const implPaths = (c) => (c.paths || []).filter((p) => isImplementationPath(p, policy)).map((p) => `${c.sha.slice(0, 9)}:${p}`);
  const otherWriters = commitsBeforeGate.filter(isOtherWriter).flatMap(implPaths);
  const committed = commitsBeforeGate.filter((c) => !isOtherWriter(c)).flatMap(implPaths);
  const others = otherWriters.length ? { otherWriters } : {};
  const othersNote = otherWriters.length ? ` · ${otherWriters.length} implementation path(s) from other writers' commits excluded` : '';
  if (dirty.length || committed.length) {
    return {
      state: 'after-implementation',
      ok: false,
      offending: [...committed, ...dirty.map((p) => `dirty:${p}`)],
      ...others,
      detail: `the gate ran after implementation began: ${committed.length} committed and ${dirty.length} uncommitted implementation path(s) precede it`
        + (knownSession ? '' : ' (no session author_digest in the lock — every commit counts as this session\'s)')
        + othersNote
        + ' — a late gate is not the gate; record the deviation (replay against start_head if the plan must be re-proven)',
    };
  }
  return { state: 'pre-implementation', ok: true, ...others, detail: `gate passed at ${gate.at} on ${String(gate.head).slice(0, 9)} before any implementation path changed (${gate.verified} verified)${othersNote}` };
}
