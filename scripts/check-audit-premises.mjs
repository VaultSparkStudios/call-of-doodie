#!/usr/bin/env node
// check-audit-premises.mjs — S239 audit #8 · verify an audit's typed claims
//
// Gathers live evidence and evaluates every `premises[]` entry attached to the
// audit sidecar's items, labelling each verified / contradicted / unverified.
//
// Exit codes:
//   0  no contradictions (unverified claims are reported, not fatal)
//   1  at least one premise is DISPROVEN by live evidence -- the audit is stale
//
// Usage:
//   node scripts/check-audit-premises.mjs [--audit docs/AUDIT_<date>.json] [--json]
//   node scripts/check-audit-premises.mjs --evidence <file.json>   # offline fixture
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from './lib/safe-spawn.mjs';
import { evaluateAuditPremises, summarize, STATUS, FILE_CONTENT_ADAPTERS, unresolvedCause } from './lib/audit-premises.mjs';
import { parseWorkflowTriggers } from './lib/github-workflow-triggers.mjs';
import { validateAuditContract, validateAuditPremiseContract } from './lib/audit-sidecar.mjs';
import { selectSessionAudit } from './lib/audit-selector.mjs';
import { latestSilSession } from './lib/sil-ledger.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const flag = (name) => {
  const i = argv.indexOf(name);
  return i >= 0 ? (argv[i + 1] ?? true) : null;
};
const JSON_OUT = argv.includes('--json');
// S289 [audit item 2] — EXIT CONTRACT.
//
// S284 taught this script to SAY that nothing could be resolved ("⛔ NOTHING in this audit
// was verifiable"), but the exit code kept keying solely on open contradictions, so the
// strongest sentence the tool can print still returned success. An honest probe that can
// never act is a finished-looking failure: it was structurally impossible to wire this in
// as a gate, and the S288 sidecar — 16 prose premises, 0 resolvable — sailed through.
//
// Default stays ADVISORY on purpose: brief-preflight parses the JSON and ignores the exit,
// and flipping the default would turn every existing caller into a hard failure. `--strict`
// is the gate mode: a run that resolved nothing is a non-measurement, and a non-measurement
// must not be able to report success.
const STRICT = argv.includes('--strict');

// S319 [audit #3] — the caller's remaining time budget, passed in rather than
// assumed. brief-preflight spawns this with a 30s cap; without knowing that, the
// checker would happily start a full doctor run it can never finish and be killed
// with nothing to show. A budget it is told about is a budget it can bound itself
// against. Absent the flag, assume the generous interactive default.
const BUDGET_MS = (() => {
  const raw = flag('--budget-ms');
  const n = typeof raw === 'string' ? Number(raw) : NaN;
  return Number.isFinite(n) && n > 0 ? n : 600_000;
})();

/**
 * The session currently in play. SIL is written at closeout, so the newest ledger
 * entry names the last CLOSED session and this session is one past it.
 */
function resolveCurrentSession() {
  const explicit = flag('--session');
  if (explicit && explicit !== true) return Number(explicit);
  try {
    const sil = fs.readFileSync(path.join(ROOT, 'context', 'SELF_IMPROVEMENT_LOOP.md'), 'utf8');
    const last = latestSilSession(sil);
    return last == null ? null : Number(last) + 1;
  } catch { return null; }
}

/**
 * Resolve the audit whose premises are actually in play — S312 audit #1.
 *
 * This used to be a private `readdir` filtered by `/^AUDIT_\d{4}-\d{2}-\d{2}\.json$/`,
 * i.e. bare-date filenames ONLY. That regex cannot match `AUDIT_<date>-S311.json` or
 * `AUDIT_<date>-routine.json`, so with both present in docs/ the resolver silently fell
 * back to the newest BARE-DATE file — measured live at S312, `AUDIT_2026-08-30.json`,
 * whose `session` field is 309. Three sessions stale, reported through brief-preflight
 * as a founder-facing premise-decay row about a plan nobody was executing (CANON-031).
 * It also made the `isRoutine` branch below unreachable: the S303 remediation taught this
 * script two contracts, but never gave the resolver a way to return the routine sidecar
 * it was taught to read, so 29 typed premises a night went to no reader at all.
 *
 * `lib/audit-selector.mjs` was built for exactly this in S240 and scans every variant.
 * Route through it rather than re-deriving selection here: exact-session, then
 * handoff-linked, and only then the newest sidecar of any variant — labelled, so the
 * caller can say WHICH artifact it graded and why.
 */
function resolveAuditSelection() {
  const explicit = flag('--audit');
  if (typeof explicit === 'string') {
    return { file: path.resolve(ROOT, explicit), mode: 'explicit', reason: `--audit ${explicit}` };
  }
  const session = resolveCurrentSession();
  const sel = selectSessionAudit({ repoRoot: ROOT, session });
  const pick = sel.selected ?? sel.newest;
  if (!pick) return { file: null, mode: sel.mode, reason: sel.reason };
  return {
    file: path.join(ROOT, pick.relPath),
    // A `no-current-audit` verdict is not a failure to report — it is the honest
    // statement that nothing belongs to this session. Grade the newest sidecar anyway
    // (decay in yesterday's plan is still worth surfacing) but never let the mode be
    // mistaken for "this session's audit".
    mode: sel.selected ? sel.mode : 'newest-fallback',
    reason: sel.selected ? sel.reason : `${sel.reason}; grading newest sidecar ${pick.file} as historical context`,
    session,
  };
}

/** Count workflow files carrying a top-level schedule trigger (shared parser). */
function gatherWorkflowEvidence() {
  const dir = path.join(ROOT, '.github', 'workflows');
  if (!fs.existsSync(dir)) return null;
  let scheduledCount = 0;
  let total = 0;
  for (const f of fs.readdirSync(dir).filter((f) => /\.ya?ml$/.test(f))) {
    total++;
    // parseWorkflowTriggers returns a Set -- .has(), never .includes()
    // (an .includes() call is silently always falsy and would fake a green check).
    const triggers = parseWorkflowTriggers(fs.readFileSync(path.join(dir, f), 'utf8'));
    if (triggers.has('schedule')) scheduledCount++;
  }
  return { scheduledCount, total };
}

function gatherTestEvidence() {
  const p = path.join(ROOT, '.cache', 'test-count.json');
  if (!fs.existsSync(p)) return null;
  try {
    const t = JSON.parse(fs.readFileSync(p, 'utf8'));
    return { failures: t.failed ?? null, total: t.total ?? null, passed: t.passed ?? null };
  } catch { return null; }
}

// S311 [audit #2] — REUSE the doctor's persisted snapshot before re-running it.
//
// The caller already gates this on a doctor-adapter premise actually being present, so
// "only run it if some premise needs it" was honoured. The cost was the other half:
// when a premise DID need it, this re-derived from scratch a result run-doctor had
// already written to disk. Measured at S311 that made the whole checker take 4m30s —
// against the 30 000ms timeout that scripts/lib/brief-preflight.mjs spawns it with.
// Nine times over the cap, so it could never once complete, and every startup brief
// since S289 has honestly printed "check did not complete (ETIMEDOUT) — audit premises
// UNVERIFIED this session". S289 fixed the reporting of the non-measurement and left
// the reason for it. Run to completion the checker works and had 3 OPEN contradicted
// premises to report that nobody had seen.
//
// Freshness threshold matches the doctor-snapshot staleness window used by
// check-unmapped-warnings (6h): recent enough that probe verdicts have not meaningfully
// moved, old enough that the common case is a hit. Provenance travels with the result —
// a premise verified against a cached doctor must be able to say so rather than implying
// a run that did not happen (CANON-031).
export const DOCTOR_SNAPSHOT_MAX_AGE_MS = 6 * 60 * 60 * 1000;

export function readDoctorSnapshot(repoRoot = ROOT, now = Date.now(), maxAgeMs = DOCTOR_SNAPSHOT_MAX_AGE_MS) {
  try {
    const snap = JSON.parse(fs.readFileSync(path.join(repoRoot, '.cache', 'doctor-last.json'), 'utf8'));
    if (!Array.isArray(snap?.checks)) return null;
    const stamp = snap.generatedAt || snap.ranAt || null;
    if (!stamp || Number.isNaN(Date.parse(stamp))) return null;   // undated cannot be shown fresh
    const ageMs = now - Date.parse(stamp);
    if (ageMs < 0 || ageMs > maxAgeMs) return null;
    // Snapshots written before S311 carry no blockingFailing/advisoryFailing. Derive
    // them from the checks with run-doctor's own definitions rather than handing back
    // evidence that answers fewer questions than a live run would — an incomplete
    // cache turns a `doctor-blocking` premise into a phantom UNVERIFIED.
    const derived = {
      blockingFailing: snap.checks.filter((c) => c.blocking).length,
      advisoryFailing: snap.checks.filter((c) => !c.pass && !c.warn && !c.blocking && !c.skipped).length,
    };
    return {
      ...derived,
      ...snap,
      blockingFailing: snap.blockingFailing ?? derived.blockingFailing,
      advisoryFailing: snap.advisoryFailing ?? derived.advisoryFailing,
      __provenance: { source: 'cache', ranAt: stamp, ageMs },
    };
  } catch { return null; }
}

/**
 * Which doctor probe ids the sidecar's premises actually name, and whether any
 * premise needs a repo-wide aggregate that a filtered run cannot honestly answer.
 *
 * `doctor-probe` / `doctor-probe-absent` are per-id questions: running the whole
 * doctor to answer three of them is the cost S311 removed once and this restores
 * for good. `doctor-blocking` is different — it counts blocking failures across
 * EVERY probe, so a `--only` subset would answer it with a number computed over
 * the wrong population. That must force a full run rather than quietly returning
 * a smaller count (a subset aggregate reported as a total is the S301 scope defect).
 */
export function planDoctorEvidence(items) {
  const ids = new Set();
  let needsAggregate = false;
  for (const item of items ?? []) {
    for (const pr of item.premises ?? []) {
      if (pr.adapter === 'doctor-blocking') { needsAggregate = true; continue; }
      if ((pr.adapter === 'doctor-probe' || pr.adapter === 'doctor-probe-absent') && pr.target) ids.add(pr.target);
    }
  }
  // `doctor-probe-absent` asks whether an id is registered AT ALL. A `--only`
  // run returns just the named checks, so an unregistered id and a filtered-out
  // id look identical — but `--only` filters a static CHECKS array by id, so an
  // id that survives the filter is registered and one that vanishes is not.
  // That is exactly the question, and the adapter reads it correctly from the
  // filtered result.
  return { ids: [...ids], needsAggregate };
}

/**
 * S319 [audit #3] — evidence acquisition that does not depend on the caller's
 * ordering.
 *
 * S311 correctly diagnosed the 4m30s cost as a redundant full doctor run and
 * fixed it by reusing `.cache/doctor-last.json` under a 6h window. But the only
 * caller is scripts/lib/brief-preflight.mjs, which runs at /start step 5 —
 * BEFORE the doctor runs in that session. So at the first /start of any day the
 * snapshot is always older than the window, the reuse misses, and the spawn dies
 * at its 30s cap. Measured at S319: 30s+ timeout during the brief, 514ms for the
 * byte-identical spawn once a snapshot existed. The brief had therefore printed
 * "audit premises UNVERIFIED" every session since S289 while the answer it could
 * not deliver was 10 verified / 0 open contradictions.
 *
 * A remedy whose hit depends on an ordering its only caller does not provide is
 * inert. On a cold cache, resolve only the probes the sidecar names.
 */
function gatherDoctorEvidence(items, { budgetMs = 600_000 } = {}) {
  const cached = readDoctorSnapshot();
  if (cached) return cached;

  const plan = planDoctorEvidence(items);
  const args = [path.join(ROOT, 'scripts', 'run-doctor.mjs'), '--json'];
  let source = 'fresh-run';
  if (!plan.needsAggregate && plan.ids.length) {
    args.push('--only', plan.ids.join(','));
    source = 'fresh-run-filtered';
  }
  // Reserve headroom. Handing the inner run the caller's WHOLE budget means a slow
  // doctor consumes every millisecond and this process is killed before it can write
  // the partial result — the caller would see an empty stdout and be back to a
  // blanket ETIMEDOUT, which is the state this fix exists to end. 70% leaves room to
  // evaluate and serialise; the floor keeps a tiny budget from becoming a zero one.
  const innerTimeout = Math.max(5_000, Math.floor(budgetMs * 0.7));
  const r = spawnSync(process.execPath, args, {
    cwd: ROOT, encoding: 'utf8', timeout: innerTimeout, windowsHide: true,
  });
  try {
    const out = r.stdout || '';
    const parsed = JSON.parse(out.slice(out.indexOf('{')));
    return {
      ...parsed,
      // A filtered run answers per-probe questions and nothing else. Blanking the
      // aggregate is deliberate: leaving a subset-derived blockingFailing in place
      // would let a future `doctor-blocking` premise read a count computed over
      // three probes as though it covered all 215.
      ...(source === 'fresh-run-filtered' ? { blockingFailing: null, advisoryFailing: null } : {}),
      __provenance: { source, ranAt: new Date().toISOString(), ageMs: 0, probeIds: source === 'fresh-run-filtered' ? plan.ids : null },
    };
  } catch {
    // A killed or unparseable run is a NON-MEASUREMENT that names what it could
    // not reach — never a blanket failure describing the whole check (S289).
    return {
      checks: [], __unreachable: true,
      __provenance: {
        source, ranAt: new Date().toISOString(), ageMs: 0,
        probeIds: plan.ids, timedOut: r.error?.code === 'ETIMEDOUT' || r.signal === 'SIGTERM',
      },
    };
  }
}

/** Existence map for every `file-exists` target the audit references. */
function gatherFileEvidence(items) {
  const files = {};
  for (const item of items) {
    for (const pr of item.premises ?? []) {
      if (pr.adapter === 'file-exists' && pr.target) {
        files[pr.target] = fs.existsSync(path.join(ROOT, pr.target));
      }
    }
  }
  return files;
}

/**
 * S245 [audit R12] — read the text of every file a `file-content`/`grep` premise
 * references, so those adapters can evaluate against injected content (the lib
 * stays pure — it never touches the filesystem). An absent file is injected as
 * null (adapter reads that as "pattern not present"), never omitted, so a decay
 * premise resolves rather than silently staying unverified.
 */
/** Targets skipped because they are directories — reported so the gap is nameable. */
const directoryTargets = [];


function gatherFileContentEvidence(items) {
  const fileContents = {};
  for (const item of items) {
    for (const pr of item.premises ?? []) {
      // S284 [audit #1] — read the shared list rather than a local copy. The local
      // copy is exactly how a new file-text adapter (grep-count) would ship able to
      // evaluate but with no evidence ever gathered for it: silently unverified.
      if (!FILE_CONTENT_ADAPTERS.includes(pr.adapter) || !pr.target) continue;
      if (pr.target in fileContents) continue;
      const p = path.join(ROOT, pr.target);
      // S303 [audit #2] — A DIRECTORY TARGET IS UNVERIFIABLE, NOT DISPROVEN.
      //
      // `null` here means one specific thing to every file-text adapter: "this path was
      // checked and the pattern is provably not present." That is right for a deleted
      // file — a decay premise SHOULD flip to contradicted when its marker is gone.
      //
      // It is wrong for a path that is not a file at all. `readFileSync` on a directory
      // throws EISDIR, which landed in the same catch, so a premise targeting a
      // DIRECTORY resolved to a confident `actual: false`. Measured live: the nightly
      // 2026-08-24 audit claimed a CANON-050 banned term appears in `portfolio`, and this reported the
      // claim DISPROVEN — while `check-no-dogfood.mjs` was returning three hits with
      // exact file:line. A false "already fixed" is the most costly direction a verifier
      // can fail in: it retires real work with the authority of evidence.
      //
      // Omitting the key leaves the adapter at `found:false` → UNVERIFIED, which is the
      // honest answer: the premise names a target this adapter cannot read.
      let stat = null;
      try { stat = fs.statSync(p); } catch { /* absent — handled below */ }
      if (stat?.isDirectory()) {
        directoryTargets.push({ itemId: item.id, adapter: pr.adapter, target: pr.target, pattern: pr.pattern ?? null });
        continue; // unreadable BY THIS ADAPTER → unverified, not false
      }
      try { fileContents[pr.target] = fs.readFileSync(p, 'utf8'); }
      catch { fileContents[pr.target] = null; } // absent/unreadable → "pattern not present"
    }
  }
  return fileContents;
}

/**
 * Load durable deploy receipts. A missing receipt contributes NOTHING, so the
 * premise resolves to unverified rather than contradicted -- we never claim to
 * have disproven live parity we simply cannot observe.
 */
function gatherDeployReceipts(items) {
  const receipts = {};
  for (const item of items) {
    for (const pr of item.premises ?? []) {
      if (pr.adapter !== 'deploy-receipt' || !pr.target) continue;
      const p = path.join(ROOT, pr.target);
      if (!fs.existsSync(p)) continue;
      try { receipts[pr.target] = JSON.parse(fs.readFileSync(p, 'utf8')); } catch { /* unreadable = no evidence */ }
    }
  }
  return receipts;
}

// ── main ────────────────────────────────────────────────────────────────────
const selection = resolveAuditSelection();
const auditPath = selection.file;
if (!auditPath || !fs.existsSync(auditPath)) {
  console.error(`No audit sidecar found (docs/AUDIT_*.json) — ${selection.reason}`);
  process.exit(0);
}
// S240 audit #2 — a corrupt sidecar must produce a diagnosis, not a stack trace.
// The 2026-07-16 nightly sidecar carried invalid `\|` escapes and this parse was
// the crash site; premise verification silently never ran.
let audit;
try {
  audit = JSON.parse(fs.readFileSync(auditPath, 'utf8'));
} catch (e) {
  const { diagnoseJsonText } = await import('./check-audit-sidecar-valid.mjs');
  const diag = diagnoseJsonText(fs.readFileSync(auditPath, 'utf8'));
  console.error(`⛔ ${path.basename(auditPath)} is not valid JSON — ${e.message}`);
  if (diag.invalidEscapeCount) {
    console.error(`   ${diag.invalidEscapeCount}× invalid escape ${diag.invalidEscapes.join(' ')} — ${diag.hint}`);
  }
  console.error('   The sidecar is the /implement contract; repair it at source before acting on this audit.');
  console.error('   Check all recent sidecars: node scripts/check-audit-sidecar-valid.mjs');
  process.exit(1);
}
// S303 [audit #1] — TWO SIDECAR KINDS, TWO CONTRACTS. `check-audit-sidecar-valid.mjs`
// applies `validateAuditContract` only to canonical `AUDIT_<date>.json` and states why:
// "Scheduled -routine audits are evidence packets, not /implement plans." This script
// applied the /implement contract to BOTH, so pointing it at a nightly sidecar produced
// 130 contract errors and the advice "repair it at source" — advice the other instrument
// contradicts, because the routine writer is correct not to emit `/implement` item shape.
// The consequence was silent and total: the nightly routine audit is the only audit
// produced automatically, its 10 items carry fully typed machine-verifiable `premises[]`,
// and the designated premise verifier refused to read a single one of them. Verify the
// contract that the artifact actually owes — premise SHAPE for routine packets, the full
// executable item contract for canonical plans.
const isRoutine = audit?.kind === 'routine' || /-routine\.json$/.test(auditPath);
const contractErrors = isRoutine ? validateAuditPremiseContract(audit) : validateAuditContract(audit);
if (contractErrors.length) {
  console.error(isRoutine
    ? `⛔ ${path.basename(auditPath)} carries malformed premises:`
    : `⛔ ${path.basename(auditPath)} is not an executable audit contract:`);
  for (const error of contractErrors) console.error(`   - ${error}`);
  process.exit(1);
}
// S339 — a WRITE-TIME shape check the routine can run on its own packet. The routine
// contract told the writer to verify with check-audit-sidecar-valid.mjs, which exempts
// routine packets from premise shape on purpose (S286). So the writer's gate was green
// on a packet this reader rejects: 09-10 (12) and 09-13 (7) shipped `file-exists`
// premises with no operator/expected, and the brief's premise check exited 1 for days.
// `--shape-only` stops here — no doctor, no evidence gathering — so it is cheap to run
// before every commit. It does not widen the scanner's read-path exemption.
if (argv.includes('--shape-only')) {
  // The routine contract makes premises MANDATORY on every item (§3). The shape
  // validator is silent about an item that carries none, so the write-time gate
  // checks presence too — otherwise dropping the array would be the easy way to pass.
  const bare = (audit.items ?? []).map((item, i) => ({ i, id: item?.id })).filter(({ i }) => {
    const p = audit.items[i]?.premises;
    return !Array.isArray(p) || p.length === 0;
  });
  if (isRoutine && bare.length) {
    console.error(`⛔ ${path.basename(auditPath)} has ${bare.length} item(s) with no typed premises (ROUTINE_AUDIT_CONTRACT §3 makes them mandatory):`);
    for (const { i, id } of bare) console.error(`   - /items/${i}${id ? ` (${id})` : ''}`);
    process.exit(1);
  }
  console.log(`✓ ${path.basename(auditPath)} premise shape valid (${isRoutine ? 'routine packet' : 'executable contract'})`);
  process.exit(0);
}
const items = audit.items ?? [];
const withPremises = items.filter((i) => (i.premises ?? []).length);

if (!withPremises.length) {
  const msg = `No typed premises attached in ${path.basename(auditPath)} — nothing to verify.`;
  console.log(JSON_OUT ? JSON.stringify({ ok: true, total: 0, note: msg }) : `ℹ ${msg}`);
  process.exit(0);
}

let evidence;
const evFile = flag('--evidence');
if (typeof evFile === 'string') {
  evidence = JSON.parse(fs.readFileSync(path.resolve(ROOT, evFile), 'utf8'));
} else {
  const needsDoctor = withPremises.some((i) =>
    (i.premises ?? []).some((p) => ['doctor-probe', 'doctor-blocking', 'doctor-probe-absent'].includes(p.adapter)));
  evidence = {
    workflows: gatherWorkflowEvidence(),
    tests: gatherTestEvidence(),
    files: gatherFileEvidence(withPremises),
    fileContents: gatherFileContentEvidence(withPremises),
    deployReceipts: gatherDeployReceipts(withPremises),
    doctor: needsDoctor ? gatherDoctorEvidence(withPremises, { budgetMs: BUDGET_MS }) : null,
  };
}

const results = evaluateAuditPremises(items, evidence);
// S304 [audit #1] — premises whose CLAIM outran their adapter. Named, not folded
// into the unverified count: like a directory target, this is an author error
// fixable in one edit, and before the fix it read as a DISPROOF rather than a gap.
const claimScopeMismatches = results
  .filter((r) => r.scopeMismatch)
  .map((r) => ({ itemId: r.itemId, claim: r.claim, ...r.scopeMismatch }));
// S263 — pass the sidecar's TOP-LEVEL executionLog; that is where shipped state
// actually lives, and reading only the per-item field made every shipped item
// look unresolved (see auditItemResolved).
const s = summarize(results, items, audit.executionLog);

if (JSON_OUT) {
  // selectionMode/selectionReason travel with the numbers so a consumer (brief-preflight
  // → the founder-facing SIGNALS row) can say WHICH audit was graded and on what basis.
  // Reporting a decay count without naming its subject is how a stale plan's decay got
  // published as the current plan's for three sessions.
  console.log(JSON.stringify({
    audit: path.basename(auditPath),
    selectionMode: selection.mode,
    selectionReason: selection.reason,
    session: selection.session ?? null,
    // S319 [audit #3] — say WHICH doctor answered. A premise resolved against a
    // 6h-old cache, a filtered fresh run over the ids this sidecar names, and a
    // full run are three different strengths of evidence, and a consumer that
    // cannot tell them apart cannot report honestly (CANON-031).
    doctorProvenance: evidence?.doctor?.__provenance ?? null,
    ...s, directoryTargets, claimScopeMismatches,
    // S317 [audit #2] — WHY nothing resolved, carried alongside the count.
    //
    // The startup brief printed one hardcoded sentence for the nothing-resolved
    // state — "premises are prose, not typed claims" — written for the S289 case
    // (AUDIT_2026-08-17.json, genuinely 16 prose strings). When S316 hit 0/23 for a
    // completely different reason (fully typed premises naming adapters that do not
    // exist) the brief confidently published the wrong diagnosis, and the session
    // that read it would have gone looking for prose that was not there. The cause
    // was computable the whole time; only the count was being passed along.
    unresolvedCause: unresolvedCause(results),
    results,
  }, null, 2));
} else {
  const mark = { [STATUS.VERIFIED]: '✓', [STATUS.CONTRADICTED]: '⛔', [STATUS.UNVERIFIED]: '?', [STATUS.VOLATILE]: '~' };
  console.log(`\n  AUDIT PREMISES · ${path.basename(auditPath)}  [${selection.mode}]`);
  console.log(`  ${'─'.repeat(70)}`);
  for (const r of results) {
    console.log(`  ${mark[r.status]} [${r.itemId}] ${r.claim}`);
    if (r.status !== STATUS.VERIFIED) console.log(`      ${r.reason}`);
  }
  console.log(`  ${'─'.repeat(70)}`);
  console.log(`  ${s.verified} verified · ${s.contradicted} contradicted · ${s.unverified} unverified`
    + (s.volatile ? ` · ${s.volatile} volatile` : ''));
  // S321 [audit #5] — a premise pinned to a drifting number decays on the clock, not
  // on the code. Reported apart from a disproof so nobody re-verifies a shipped fix
  // because a measurement moved.
  if (s.volatile) {
    console.log(`  ~ ${s.volatile} premise(s) are bound to a DRIFTING measurement — they decay on the clock and prove nothing:`);
    for (const v of s.volatilePremises) console.log(`      [${v.itemId}] ${v.reason}`);
  }
  // S284 [audit #1] — say out loud how much of this audit could not be checked.
  // "0 contradicted" on premises nothing could read is not a clean bill of health,
  // and it used to print identically to one.
  if (s.unverified) {
    const pct = Math.round((s.unverifiableRate ?? 0) * 100);
    console.log(`  ⚠ ${pct}% of premises could not be resolved — that share of this audit rests on no evidence.`);
    if (s.unverifiable) {
      console.log('  ⛔ NOTHING in this audit was verifiable. It has not been checked; it has only been read.');
    }
  }
  // S303 [audit #2] — name the directory targets rather than letting them vanish into
  // the unverified count. This is an author error the writer can fix in one edit, and
  // before the fix it did not read as an error at all — it read as a disproof.
  if (directoryTargets.length) {
    console.log(`  ⚠ ${directoryTargets.length} premise(s) target a DIRECTORY — file-text adapters read one file:`);
    for (const d of directoryTargets) {
      console.log(`      [${d.itemId}] ${d.adapter} target '${d.target}' — name the file, or use a doctor-probe premise`);
    }
  }
  // S304 [audit #1] — a claim that outran its adapter. Say which word did it, so
  // the repair is obvious: assert what the adapter can see, or change adapter.
  if (claimScopeMismatches.length) {
    console.log(`  ⚠ ${claimScopeMismatches.length} premise(s) CLAIM AN OUTCOME their adapter cannot measure:`);
    for (const m of claimScopeMismatches) {
      console.log(`      [${m.itemId}] "${m.token}" vs ${m.adapter} — ${m.limit}`);
    }
  }
  if (s.resolvedContradicted) console.log(`  ${s.resolvedContradicted} contradiction(s) confirm shipped problem states are gone`);
  if (!s.trustworthy) {
    console.log(`\n  ⛔ ${s.openContradicted} OPEN premise(s) DISPROVEN by live evidence — this audit is stale.`);
    console.log('     Re-verify before acting: a contradicted premise means the work may be done,');
    console.log('     already rejected, or aimed at a problem that no longer exists.');
  }
}

// Under --strict an unresolvable audit fails alongside a disproven one. Both are reasons
// not to act on the plan; only one of them used to be able to say so in an exit code.
if (STRICT && s.unverifiable) {
  if (!JSON_OUT) {
    console.log('\n  ⛔ --strict: exiting non-zero because NO premise resolved.');
    console.log('     Typed premises are required — see scripts/lib/audit-premises.mjs for the');
    console.log('     supported adapters. Prose strings are not machine-checkable claims.');
  }
  process.exit(2);
}

process.exit(s.trustworthy ? 0 : 1);
