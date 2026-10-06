#!/usr/bin/env node
/**
 * check-audit-sidecar-valid.mjs — S240 audit #2 · every audit sidecar must parse.
 *
 * Why: the 2026-07-16 nightly routine audit wrote docs/AUDIT_2026-07-16-routine.json
 * with 7 invalid `\|` escapes (shell grep patterns pasted into JSON prose).
 * JSON.parse failed, check-audit-premises.mjs crashed with a raw stack trace, and
 * premise verification was silently impossible. An audit sidecar is the /implement
 * contract — an unparseable one is a broken contract, not a cosmetic defect.
 *
 * Scans docs/AUDIT_*.json (ALL variants, including -routine suffixes, which the
 * canonical `AUDIT_\d{4}-\d{2}-\d{2}\.json` regexes elsewhere deliberately skip —
 * that skip is exactly why the corrupt routine file went unnoticed).
 *
 * Bounded window: files whose embedded date is within --days (default 14) of
 * today, so ancient archives never resurrect a warning.
 *
 * Exit codes: 0 all parse · 1 at least one invalid.
 * Usage: node scripts/check-audit-sidecar-valid.mjs [--json] [--days N] [--dir docs] [--repair]
 *
 * S261 [audit #2]: --repair heals the known invalid-escape corruption class in
 * place (see repairJsonText). The detector alone could not stop the recurrence —
 * the same routine reproduced it on 2026-07-16 and again on 2026-08-01.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateAuditContract, validateAuditPremiseContract } from './lib/audit-sidecar.mjs';
// Read the shared list rather than a local copy — a local copy is exactly how a new
// file-text adapter ships unguarded (the S284 lesson, restated one layer up).
import { FILE_CONTENT_ADAPTERS as FILE_TEXT_ADAPTERS, claimScopeProblem } from './lib/audit-premises.mjs';
// S315 [audit #4] — resolve THIS session's sidecar through the shared selector
// rather than a local "newest file" guess. S312 established that a private
// latest-resolver silently means "latest matching MY filename shape".
import { selectSessionAudit } from './lib/audit-selector.mjs';
import { resolveActiveSessionId } from './lib/session-identity.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const JSON_OUT = argv.includes('--json');
const flag = (name, dflt) => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : dflt;
};
const DAYS = Number(flag('--days', 14));
const DIR = path.resolve(ROOT, flag('--dir', 'docs'));
// S261 [audit #2] — opt-in in-place repair of the known invalid-escape class.
const REPAIR = argv.includes('--repair');

/**
 * Diagnose the most common corruption class: an invalid escape sequence.
 * JSON only allows \" \\ \/ \b \f \n \r \t \uXXXX — anything else (e.g. the
 * `\|` a shell grep pattern drags in) is fatal to JSON.parse.
 */
const VALID_ESCAPE_CHARS = new Set(['"', '\\', '/', 'b', 'f', 'n', 'r', 't', 'u']);

/**
 * Locate invalid escape sequences by SCANNING, not by regex (S261 [audit #2]).
 *
 * The original implementation used /\\([^"\\/bfnrtu])/g, which is wrong on the
 * most common real input: an ALREADY-CORRECT `\\|` (literal backslash, then a
 * pipe). Regex has no notion of an escape pair consuming two characters, so it
 * matches at the SECOND backslash and reports a valid sequence as invalid — and
 * a repair built on that mis-detection turns `\\|` into `\\\|`, breaking text
 * that parsed fine. That is exactly what the first repair attempt hit.
 *
 * This scanner walks left-to-right, tracks string context (backslashes outside
 * a string are not escapes at all), and consumes a valid escape as a PAIR, so
 * `\\|` is correctly seen as valid and only a genuinely lone `\|` is flagged.
 *
 * Returns the byte offsets of each lone backslash, newest-analysis-friendly.
 */
export function findInvalidEscapes(text) {
  const found = [];
  let inString = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (!inString) {
      if (ch === '"') inString = true;
      continue;
    }
    if (ch === '\\') {
      const next = text[i + 1];
      if (VALID_ESCAPE_CHARS.has(next)) { i += 1; continue; } // valid pair — consume both
      found.push({ index: i, char: next ?? '<eof>' });
      continue;
    }
    if (ch === '"') inString = false;
  }
  return found;
}

export function diagnoseJsonText(text) {
  try {
    JSON.parse(text);
    return { ok: true };
  } catch (e) {
    const bad = findInvalidEscapes(text);
    return {
      ok: false,
      error: e.message,
      invalidEscapes: [...new Set(bad.map((m) => '\\' + m.char))],
      invalidEscapeCount: bad.length,
      invalidEscapeOffsets: bad.map((m) => m.index),
      hint: bad.length
        ? 'invalid escape sequence(s) — likely shell/grep patterns pasted into JSON prose; double the backslashes'
        : 'structural JSON error — inspect near the reported position',
    };
  }
}

/**
 * Repair the ONE known corruption class: an invalid escape sequence inside a
 * JSON string (S261 [audit #2]).
 *
 * Why this is safe to automate. JSON permits exactly \" \\ \/ \b \f \n \r \t and
 * \uXXXX. A backslash followed by anything else cannot be valid JSON under ANY
 * reading, so there is no ambiguity about intent: the author meant a literal
 * backslash (a shell grep alternation like `grep -n 'READY\|DEGRADED'` pasted
 * into recipe prose). Doubling it is the unique interpretation that both parses
 * and preserves the original text verbatim.
 *
 * What this deliberately does NOT do: it never repairs structural JSON errors
 * (missing brace, trailing comma, truncation). Those have multiple plausible
 * fixes, and guessing would mean inventing audit content — a lying surface
 * (CANON-031). Structural damage returns ok:false and stays a hard finding.
 *
 * Returns { ok, repaired, text, replacements, reason }.
 */
export function repairJsonText(text) {
  const before = diagnoseJsonText(text);
  if (before.ok) return { ok: true, repaired: false, text, replacements: 0, reason: 'already valid' };
  if (!before.invalidEscapeCount) {
    return { ok: false, repaired: false, text, replacements: 0, reason: `structural JSON error, not auto-repairable — ${before.error}` };
  }
  // Insert one extra backslash at each LONE backslash offset, walking from the
  // end so earlier offsets stay valid as the string grows. Escape pairs that are
  // already correct (`\\|`) are never touched — findInvalidEscapes consumed them.
  const offsets = findInvalidEscapes(text).map((m) => m.index);
  let fixed = text;
  for (let k = offsets.length - 1; k >= 0; k -= 1) {
    const at = offsets[k];
    fixed = fixed.slice(0, at) + '\\' + fixed.slice(at);
  }
  const replacements = offsets.length;
  const after = diagnoseJsonText(fixed);
  if (!after.ok) {
    return { ok: false, repaired: false, text, replacements, reason: `escape repair insufficient — residual: ${after.error}` };
  }
  return { ok: true, repaired: true, text: fixed, replacements, reason: `doubled ${replacements} invalid escape(s)` };
}

/**
 * Repair a sidecar in place. Writes only when the repair actually parses, and
 * re-reads + re-parses the written bytes before reporting success — a repair
 * that claims green without proving it is exactly the failure mode this whole
 * arc exists to prevent.
 */
export function repairSidecarFile(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const r = repairJsonText(raw);
  if (!r.ok || !r.repaired) return { file: path.basename(filePath), ...r, wrote: false };
  fs.writeFileSync(filePath, r.text, 'utf8');
  const verify = diagnoseJsonText(fs.readFileSync(filePath, 'utf8'));
  return { file: path.basename(filePath), ...r, wrote: true, verified: verify.ok };
}

export function scanAuditSidecars({ dir = DIR, days = DAYS, now = new Date(), currentFile = null } = {}) {
  if (!fs.existsSync(dir)) return { ok: true, checked: 0, invalid: [], note: 'no docs dir' };
  const cutoff = now.getTime() - days * 86_400_000;
  const files = fs.readdirSync(dir).filter((f) => /^AUDIT_.*\.json$/.test(f)).filter((f) => {
    const m = f.match(/(\d{4}-\d{2}-\d{2})/);
    if (!m) return true; // undated variants stay in scope — can't prove they're old
    return new Date(m[1] + 'T00:00:00Z').getTime() >= cutoff;
  });
  const invalid = [];
  for (const f of files) {
    const p = path.join(dir, f);
    const raw = fs.readFileSync(p, 'utf8');
    const diag = diagnoseJsonText(raw);
    if (!diag.ok) {
      invalid.push({ file: f, kind: 'json', ...diag });
      continue;
    }
    const parsed = JSON.parse(raw);

    // S303 [audit #2] — a file-text premise whose target is a DIRECTORY, checked for
    // EVERY sidecar kind including routine packets. This scanner sees files by
    // existence rather than by authorship, which is the same reason it catches
    // hand-authored sidecars that never pass through a writer — and the nightly
    // routine lane is precisely such a producer.
    //
    // Only a directory is flagged. An ABSENT target is legitimate and load-bearing: a
    // decay premise ("the marker is still present") must resolve to CONTRADICTED when
    // the file is deleted, which is how those adapters detect completed work. A
    // directory can never be read by a file-text adapter, so it is an author error with
    // no valid reading — and before this it did not read as an error at all. It read as
    // a disproof, retiring live audit items with the authority of evidence.
    for (const [index, item] of (parsed.items ?? []).entries()) {
      for (const [pIndex, premise] of (item?.premises ?? []).entries()) {
        if (!FILE_TEXT_ADAPTERS.includes(premise?.adapter) || typeof premise?.target !== 'string') continue;
        let stat = null;
        try { stat = fs.statSync(path.join(ROOT, premise.target)); } catch { continue; } // absent = valid
        if (!stat.isDirectory()) continue;
        invalid.push({
          file: f,
          kind: 'directory-target',
          at: `/items/${index}/premises/${pIndex}`,
          target: premise.target,
          error: `${premise.adapter} target '${premise.target}' is a directory — file-text adapters read one file, so this premise can never resolve`,
        });
      }
    }

    // S304 [audit #1] — THE CLAIM OUTRAN THE ADAPTER.
    //
    // The directory sweep above catches a target the adapter cannot READ. This
    // catches the other half: the adapter reads its target perfectly and the
    // claim is about something else. `file-exists` can only answer "is the path
    // present?", so it cannot settle whether the thing at that path SUCCEEDED.
    //
    // Measured live: item 8 of AUDIT_2026-08-21.json settled "no successful
    // backup ledger has been produced" with file-exists, and the file's only row
    // was a 61-byte R2 smoke object that had been deleted again. The verifier
    // reported the claim DISPROVEN — certifying a backup plane that had never
    // run once. Scanned here, by existence rather than authorship, so it fires
    // on hand-authored sidecars and without anyone running the verifier.
    for (const [index, item] of (parsed.items ?? []).entries()) {
      for (const [pIndex, premise] of (item?.premises ?? []).entries()) {
        const scope = claimScopeProblem(premise);
        if (!scope) continue;
        invalid.push({
          file: f,
          kind: 'claim-scope-mismatch',
          at: `/items/${index}/premises/${pIndex}`,
          target: premise.target ?? null,
          error: `claim asserts an outcome ("${scope.token}") that ${scope.adapter} cannot measure — ${scope.limit}. Assert what the adapter can see, or use a content/probe adapter.`,
        });
      }
    }

    // Scheduled -routine audits are evidence packets, not /implement plans.
    // Canonical date-only sidecars are the executable contract and must carry
    // the complete item shape rather than merely parse.
    //
    // S317 [audit #2] — this branch tests the EXECUTABLE-PLAN shape, so it stays
    // scoped to plan-shaped sidecars. What must NOT stay scoped to it is the
    // premise check below, which was nested inside and therefore never ran on the
    // filename shape every recent audit actually uses.
    const isRoutine = parsed?.kind === 'routine' || /-routine\.json$/.test(f);
    // SCOPE, corrected mid-session (S317): the executable-plan CONTRACT check stays
    // on bare-date sidecars, exactly where it was. Widening it to session-suffixed
    // files was scope I did not audit and could not repair: it resurfaced S314's 43
    // contract errors, whose `ladder` is a prose string rather than
    // L1/L2/L3 {effortHours, recipe}. Backfilling those means inventing effort
    // numbers for items I did not write, and a gate raised over an unrepairable
    // past is a wall, not a gate. The audited defect was the PREMISE check's scope,
    // and that is what changes below.
    //
    // Residual, recorded rather than hidden: a HAND-AUTHORED session-suffixed plan
    // sidecar still escapes the executable-contract check. One written through
    // writeAuditSidecar does not — it validates all three contracts at write time,
    // which is how this session's own sidecar was produced.
    if (/^AUDIT_\d{4}-\d{2}-\d{2}\.json$/.test(f)) {
      const contractErrors = validateAuditContract(parsed);
      if (contractErrors.length) invalid.push({ file: f, kind: 'contract', contractErrors, error: `${contractErrors.length} contract error(s)` });
    }

    // S289 [audit item 2] — premise SHAPE, scanned here rather than folded into
    // validateAuditContract. S284 kept the two contracts deliberately separate and
    // put the premise check at WRITE time, "where the author can still fix it" —
    // that reasoning holds and is not being overridden. The hole it leaves is a
    // sidecar that never passes through the writer at all: docs/AUDIT_2026-08-17.json
    // was hand-authored with 16 prose strings where typed premises belong, so the
    // write-time guard never ran, and every downstream reader treated "nothing could
    // be resolved" as "nothing was wrong". The scanner sees files by existence rather
    // than by authorship, so it is the right place to catch that.
    //
    // S317 [audit #2] — HOISTED out of the bare-date branch above, which is the
    // whole reason S289's reasoning never took effect. That branch tested
    // /^AUDIT_\d{4}-\d{2}-\d{2}\.json$/, so `-S316`, `-S315`, `-S314`, `-S313` —
    // the shape every recent session writes — were skipped entirely. Proven with
    // byte-identical content in a temp dir: the bare-date copy reported "69
    // unverifiable premise(s)" while the -S316 copy was not flagged at all. Four of
    // the last five session sidecars had never been premise-checked, and S316's
    // plan was written, read and executed with 0 of its 23 claims verified.
    //
    // The filename shape is deliberately NOT re-tested here. It was already the
    // THIRD copy of that regex (S312 fixed two others, resolveAuditSelection and
    // findLatestAuditSidecar); a fourth would decay the same way. The `isRoutine`
    // test above is reused instead.
    //
    // SCOPE, corrected mid-session: the first version of this widened the premise
    // check to EVERY kind, including -routine packets. That reverses S286, which
    // exempted routine packets on purpose, and tier2-premise-gate-closed states the
    // reason in the test itself — widening a check to satisfy it is the move S285
    // recorded as forbidden. The real defect was never the routine exemption; it
    // was that PLAN sidecars with a session suffix fell outside the bare-date
    // branch. Fixing exactly that, and no more.
    if (isRoutine) continue;
    const premiseErrors = validateAuditPremiseContract(parsed);
    if (premiseErrors.length) {
      invalid.push({
        file: f, kind: 'premises', premiseErrors,
        error: `${premiseErrors.length} unverifiable premise(s) — claims no adapter can read stay 'unverified' forever`,
      });
    }
  }
  // S315 [audit #4] — an invalid sidecar for the CURRENT session is not the same
  // finding as an invalid one from two weeks ago. The current one is the live
  // /implement contract of the session writing it, and it is repairable by the
  // author who is still here. Naming it separately is what lets the doctor make
  // it blocking without turning every historical authoring error into a wall.
  const current = currentFile
    ? invalid.find((bad) => bad.file === currentFile) ?? null
    : null;
  for (const bad of invalid) if (currentFile && bad.file === currentFile) bad.currentSession = true;
  return {
    ok: invalid.length === 0,
    checked: files.length,
    windowDays: days,
    invalid,
    currentFile,
    currentSessionInvalid: current ? current.file : null,
  };
}

// ── main (skipped when imported as a lib) ────────────────────────────────────
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  // The selector answers "which sidecar is this session's" from session number or
  // handoff linkage; `newest` is the honest fallback when neither is available.
  let currentFile = null;
  try {
    // Ask by SESSION first. Handoff linkage still names the PREVIOUS session's
    // audit for the whole of a session until the handoff is rewritten at closeout,
    // so linkage alone would call a two-week-old sidecar "current" all session.
    const session = resolveActiveSessionId(ROOT);
    const sel = selectSessionAudit({ repoRoot: ROOT, session });
    currentFile = sel.mode === 'exact-session'
      ? sel.selected?.file ?? null
      : sel.selected?.file ?? sel.newest?.file ?? null;
  } catch { currentFile = null; }
  let res = scanAuditSidecars({ currentFile });
  // S261 [audit #2] — --repair closes the loop the detector alone never could.
  // S240 shipped this probe after the 2026-07-16 routine audit wrote 7 invalid
  // escapes; on 2026-08-01 the same routine wrote 8 more. Detecting a recurring
  // corruption every night without ever healing it is a report refresh, not a fix.
  if (REPAIR && !res.ok) {
    const repairs = res.invalid.map((bad) => repairSidecarFile(path.join(DIR, bad.file)));
    for (const r of repairs) {
      if (r.wrote && r.verified) console.log(`  ✓ repaired ${r.file} — ${r.reason}`);
      else console.log(`  ⛔ could NOT repair ${r.file} — ${r.reason}`);
    }
    res = scanAuditSidecars({ currentFile }); // re-scan so the exit code reflects reality, not intent
  }
  if (JSON_OUT) {
    console.log(JSON.stringify(res, null, 2));
  } else if (res.ok) {
    console.log(`✓ audit sidecars valid — ${res.checked} file(s) in ${res.windowDays}d window all parse`);
  } else {
    console.log(`⛔ ${res.invalid.length}/${res.checked} audit sidecar(s) INVALID:`);
    for (const bad of res.invalid) {
      console.log(`   · ${bad.file} — ${bad.error}`);
      if (bad.invalidEscapeCount) console.log(`     ${bad.invalidEscapeCount}× invalid escape ${bad.invalidEscapes.join(' ')} — ${bad.hint}`);
      if (bad.kind === 'contract') {
        for (const error of bad.contractErrors.slice(0, 8)) console.log(`     · ${error}`);
        if (bad.contractErrors.length > 8) console.log(`     · … ${bad.contractErrors.length - 8} more contract error(s)`);
      }
      if (bad.kind === 'premises') {
        for (const error of bad.premiseErrors.slice(0, 8)) console.log(`     · ${error}`);
        if (bad.premiseErrors.length > 8) console.log(`     · … ${bad.premiseErrors.length - 8} more premise error(s)`);
      }
    }
    if (res.currentSessionInvalid) {
      console.log(`   ⛔ ${res.currentSessionInvalid} is THIS SESSION'S sidecar — the live /implement contract, repairable now by its author.`);
    }
    console.log('   remedy: fix at source (double backslashes / regenerate); the sidecar is the /implement contract.');
  }
  process.exit(res.ok ? 0 : 1);
}
