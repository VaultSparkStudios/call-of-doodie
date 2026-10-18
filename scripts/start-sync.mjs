#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from './lib/safe-spawn.mjs';
import { classifyResidue, describeResidue } from './lib/tree-residue.mjs';
import { matchStrandedResidue, readReceiptRows, blobsFor, dirtyPathsZ, expandResiduePaths, DELETED } from './lib/stranded-closeout.mjs';
import { STAGED_PATHS_GIT_ARGS } from './lib/shared-policies.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const JSON_OUT = argv.includes('--json');
const DRY = argv.includes('--dry-run');
const RECOVER_STRANDED = argv.includes('--recover-stranded');
const flag = (n, d) => { const i = argv.indexOf(n); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const REMOTE = flag('--remote', 'origin');
const BRANCH = flag('--branch', 'main');

function git(args, opts = {}) {
  const r = spawnSync('git', args, { cwd: ROOT, encoding: 'utf8', windowsHide: true, maxBuffer: 256 * 1024 * 1024, ...opts });
  return { code: r.status, out: r.stdout || '', err: r.stderr || '', error: r.error?.message || null };
}

export function planSync({ statusText, numstatText, behind, ahead, readRevisions = null, readFile = null }) {
  const residue = classifyResidue({ statusText, numstatText, readRevisions, readFile });
  let action;

  if (residue.kind === 'substantive') action = 'stop';
  else if (behind === 0) action = 'none';
  else action = residue.kind === 'clean' ? 'pull' : 'pull-autostash';
  return { residue, behind, ahead, action };
}

function readRevisions(relPath) {
  const show = git(['show', `HEAD:${relPath}`]);
  let after = null;
  try { after = fs.readFileSync(path.join(ROOT, relPath), 'utf8'); } catch { after = null; }
  return { before: show.code === 0 ? show.out : null, after };
}

function readRepoFile(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

function computePlan(fetchErr) {
  const status = git(['status', '--porcelain']);

  let numstat = git(['diff', '--numstat', 'HEAD']);

  if (numstat.code !== 0) numstat = git(['diff', '--numstat']);
  const counts = git(['rev-list', '--left-right', '--count', `${REMOTE}/${BRANCH}...HEAD`]);
  const [behind, ahead] = counts.code === 0 ? counts.out.trim().split(/\s+/).map(Number) : [null, null];
  const unmeasurable = status.code !== 0 || numstat.code !== 0 || counts.code !== 0;
  return unmeasurable
    ? { residue: null, behind, ahead, action: 'stop', reason: `git could not answer (${String(status.err || numstat.err || counts.err || fetchErr || '').trim()})` }
    : planSync({ statusText: status.out, numstatText: numstat.out, behind, ahead, readRevisions, readFile: readRepoFile });
}

function projectSlug() {
  try { return JSON.parse(fs.readFileSync(path.join(ROOT, 'context', 'PROJECT_STATUS.json'), 'utf8')).slug || path.basename(ROOT); }
  catch { return path.basename(ROOT); }
}

function receiptLedgerPath() {
  const candidates = [
    path.join(ROOT, 'portfolio', 'CLOSEOUT_AUTOPILOT_RECEIPTS.ndjson'),
    path.join(ROOT, '..', 'vaultspark-studio-ops', 'portfolio', 'CLOSEOUT_AUTOPILOT_RECEIPTS.ndjson'),
  ];
  return candidates.find((c) => fs.existsSync(c)) || null;
}

function matchStranded(paths) {
  const ledger = receiptLedgerPath();
  if (!ledger) return { session: null, receipts: [], abortedRunsWithRecord: 0, proven: [], unproven: paths, ledger: null };
  try {

    const listing = dirtyPathsZ(ROOT);
    const expanded = expandResiduePaths(paths, listing);
    return { ...matchStrandedResidue({ paths: expanded, rows: readReceiptRows(ledger), slug: projectSlug(), blobsOf: (ps) => blobsFor(ROOT, ps) }), ledger: path.relative(ROOT, ledger).replace(/\\/g, '/') };
  } catch (e) {
    return { session: null, receipts: [], abortedRunsWithRecord: 0, proven: [], unproven: paths, error: String(e.message || e) };
  }
}

function commitStranded(match) {
  const paths = match.proven.map((x) => x.path);
  const input = paths.join('\0') + '\0';
  const lit = (args) => git(['--literal-pathspecs', ...args, '--pathspec-from-file=-', '--pathspec-file-nul'], { input });

  const stagedBefore = new Set(git(['diff', '--cached', '--no-renames', '--name-only', '-z']).out.split('\0').filter(Boolean));

  const preStaged = paths.filter((p) => stagedBefore.has(p));
  if (preStaged.length) {
    return { ok: false, step: 'preflight', err: `${preStaged.length} proven path(s) already have staged changes (${preStaged.slice(0, 3).join(', ')}) — nothing staged or committed; resolve them by hand` };
  }
  const unstage = () => {
    const r = git(['--literal-pathspecs', 'restore', '--staged', '--pathspec-from-file=-', '--pathspec-file-nul'], { input });
    return r.code === 0 ? '' : ` · ⚠ unstage failed (${(r.err || '').trim()}) — inspect the index`;
  };
  const add = lit(['add']);
  if (add.code !== 0) { const u = unstage(); return { ok: false, step: 'add', err: (add.err || add.error || '').trim() + u }; }
  const index = new Map();
  for (const entry of git(['ls-files', '-s', '-z']).out.split('\0').filter(Boolean)) {
    const tab = entry.indexOf('\t');
    index.set(entry.slice(tab + 1), entry.slice(0, tab).split(' ')[1]);
  }
  const drift = match.proven.filter((x) => (x.blob === DELETED ? index.has(x.path) : index.get(x.path) !== x.blob));
  if (drift.length) {
    const u = unstage();
    return { ok: false, step: 'verify', err: `${drift.length} path(s) changed between proof and staging (${drift.slice(0, 3).map((x) => x.path).join(', ')}) — nothing committed${u}` };
  }
  const subject = 'chore(start-sync): recover stranded closeout output';
  const body = `${match.proven.length} path(s) byte-identical to what aborted closeout run(s) ${match.receipts.join(', ')} (S${match.session}) recorded as stranded.\nProven by blob id against the receipt ledger and re-checked in the index; no other path is included.`;
  const commit = git(['--literal-pathspecs', 'commit', '--pathspec-from-file=-', '--pathspec-file-nul', '-m', subject, '-m', body], { input });
  if (commit.code !== 0) { const u = unstage(); return { ok: false, step: 'commit', err: (commit.err || commit.out || '').trim() + u }; }
  return { ok: true, paths: match.proven.length, receipts: match.receipts };
}

const INFORMATION_FREE_BASES = new Set(['content-equivalent', 'content-equivalent-modulo-drift']);

export function restorableRegenerations(residue) {
  return (residue?.regenerated || []).filter((x) => INFORMATION_FREE_BASES.has(x.basis)).map((x) => x.path);
}

export function unmergedPaths(gitFn) {
  const r = gitFn(['diff', '--name-only', '--diff-filter=U', '-z']);
  return r.code === 0 ? r.out.split('\0').filter(Boolean) : null;
}

export function executeSync(gitFn, plan, { remote, branch }) {
  const autostash = plan.action !== 'pull';
  const restored = [];
  const restoreSkipped = [];
  if (autostash) {

    const stagedList = gitFn(STAGED_PATHS_GIT_ARGS);
    const staged = stagedList.code === 0 ? new Set(stagedList.out.split('\0').filter(Boolean)) : null;
    for (const p of restorableRegenerations(plan.residue)) {
      if (staged === null || staged.has(p)) { restoreSkipped.push({ path: p, reason: staged === null ? 'index unreadable' : 'has staged changes' }); continue; }

      const r = gitFn(['--literal-pathspecs', 'checkout', 'HEAD', '--', p]);
      if (r.code === 0) restored.push(p);
      else restoreSkipped.push({ path: p, reason: (r.err || `git exit ${r.code}`).trim().split('\n')[0] });
    }
  }
  const pull = gitFn(autostash ? ['pull', '--rebase', '--autostash', remote, branch] : ['pull', '--rebase', remote, branch]);
  const unmerged = unmergedPaths(gitFn);
  const conflicted = unmerged === null || unmerged.length > 0;

  let failure = null;
  let stash = null;
  if (pull.code !== 0) {

    const midRebase = (unmerged && unmerged.length > 0) || gitFn(['rev-parse', '-q', '--verify', 'REBASE_HEAD']).code === 0;
    failure = midRebase ? 'rebase-stopped' : 'pull-failed';
  }
  else if (unmerged === null) failure = 'unverified';
  else if (unmerged.length) {
    failure = autostash ? 'autostash-conflict' : 'unmerged';
    if (autostash) {
      const top = gitFn(['log', '-g', '-1', '--format=%H %gs', 'refs/stash']);
      if (top.code === 0 && /^[0-9a-f]{40} autostash$/.test(top.out.trim())) stash = top.out.trim().slice(0, 12);
    }
  }
  return {
    ...pull,
    code: failure ? (pull.code || 1) : 0,
    ran: autostash ? 'pull --rebase --autostash' : 'pull --rebase',
    restored, restoreSkipped, unmerged, conflicted, failure, stash,
  };
}

export function describeSyncFailure(result) {
  const names = (result.unmerged || []).slice(0, 5).join(', ');
  switch (result.failure) {
    case 'rebase-stopped':
      return {
        reason: `the rebase stopped${result.unmerged?.length ? ` on ${result.unmerged.length} conflicted path(s): ${names}` : ''} — the repository is mid-rebase`,
        advice: [
          'Your commits conflict with upstream. Resolve the paths and `git rebase --continue`, or `git rebase --abort` to return to where you started.',
          ...(result.ran.includes('--autostash') ? ['Pre-pull changes are held inside the rebase and are re-applied when it finishes or is aborted; they are not on the stash list.'] : []),
        ],
      };
    case 'pull-failed': {
      const said = String(result.err || result.error || '').trim().split(/\r?\n/).filter(Boolean).pop();
      return {
        reason: `git pull did not run to completion (${said || `exit ${result.code}`}) — nothing was rebased`,
        advice: ['No rebase is in progress and no path is conflicted. Check the remote and your network or credentials, then run the sync again.'],
      };
    }
    case 'autostash-conflict':
      return {
        reason: `the autostash did not re-apply cleanly — ${result.unmerged.length} unmerged path(s): ${names}`,
        advice: [
          `The rebase itself landed; git kept your pre-pull changes in a stash${result.stash ? ` (${result.stash})` : ' — find it with `git stash list`; the newest entry is not an autostash, so check before touching one'}.`,
          'Resolve each unmerged path (a regenerated surface: take upstream with `git checkout HEAD -- <path>`), then `git reset -q`. The stash is yours to drop once the tree is right.',
        ],
      };
    case 'unmerged':
      return { reason: `the pull exited 0 and left ${result.unmerged.length} unmerged path(s): ${names}`, advice: ['Resolve each path, then `git reset -q`.'] };
    case 'unverified':
      return { reason: 'the pull ran but git could not list unmerged paths — the tree is unverified', advice: ['Run `git status` before doing anything else.'] };
    default:
      return { reason: null, advice: [] };
  }
}

function main() {
  const fetch = git(['fetch', REMOTE, '-q']);

  if (fetch.code !== 0) {
    const reason = `remote fetch failed — synchronization unverified (${String(fetch.err || fetch.error || `exit ${fetch.code}`).trim()})`;
    if (JSON_OUT) console.log(JSON.stringify({ ok: false, action: 'stop', ran: 'fetch', fetchOk: false,
      code: fetch.code, failure: 'fetch-failed', reason, behind: null, ahead: null,
      residue: null, restored: [], restoreSkipped: [], unmerged: null, retainedStash: null,
      stranded: null, recovered: null }, null, 2));
    else console.error(`⛔ start-sync: ${reason}\n  No paths restored, residue committed or pull attempted. Check the remote and retry.`);
    process.exit(1);
  }
  let plan = computePlan(fetch.err);
  let stranded = null;
  let recovered = null;
  if (plan.action === 'stop' && plan.residue?.substantive?.length) {
    stranded = matchStranded(plan.residue.substantive.map((x) => x.path));
    if (RECOVER_STRANDED && !DRY && stranded.proven.length) {
      recovered = commitStranded(stranded);
      if (recovered.ok) plan = computePlan(fetch.err);
    }
  }
  const { behind, ahead } = plan;
  let result = { ok: false, ran: null, code: null };
  if (!DRY && (plan.action === 'pull' || plan.action === 'pull-autostash')) result = executeSync(git, plan, { remote: REMOTE, branch: BRANCH });
  else result = { code: plan.action === 'stop' ? 1 : 0, ran: DRY ? `(dry-run) ${plan.action}` : plan.action, out: '', err: '' };
  const ok = plan.action !== 'stop' && result.code === 0;
  const failure = describeSyncFailure(result);
  const summary = {
    ok, action: plan.action, ran: result.ran, behind, ahead, fetchOk: fetch.code === 0,
    residue: plan.residue ? { kind: plan.residue.kind, detail: describeResidue(plan.residue), receipts: plan.residue.receipts.map((r) => r.path), regenerated: plan.residue.regenerated || [], substantive: plan.residue.substantive } : null,
    reason: plan.reason || failure.reason,
    gitErr: (result.err || '').trim() || null,
    failure: result.failure || null,
    restored: result.restored || [], restoreSkipped: result.restoreSkipped || [],

    unmerged: result.unmerged ?? null, retainedStash: result.stash || null,
    stranded: stranded ? { session: stranded.session, receipts: stranded.receipts, proven: stranded.proven.map((x) => x.path), unproven: stranded.unproven.length, error: stranded.error || null } : null,
    recovered,
  };
  if (JSON_OUT) console.log(JSON.stringify(summary, null, 2));
  else if (ok) {
    if (recovered?.ok) console.log(`✓ start-sync: recovered ${recovered.paths} stranded closeout path(s) from ${recovered.receipts.join(', ')} in one session-neutral commit`);
    console.log(`✓ start-sync: ${summary.residue?.detail || 'tree clean'} · behind ${behind} / ahead ${ahead} · ${result.ran}${result.restored?.length ? ` · ${result.restored.length} proven regeneration(s) restored to HEAD first (upstream's copy wins)` : ''}`);
  }
  else {
    console.log(`⛔ start-sync: ${summary.reason || summary.residue?.detail || 'sync failed'}`);
    for (const line of failure.advice) console.log(`  ${line}`);
    for (const s of summary.restoreSkipped) console.log(`  · regeneration not restored before the pull: ${s.path} (${s.reason})`);
    if (plan.residue?.substantive?.length) {
      console.log('  Prior-session WIP is never auto-stashed — inspect with git diff, then commit or stash by hand.');

      console.log('  If you commit it, use a session-neutral subject — e.g. `chore(start-sync): recover residue` — an S<n> scope here spends the next session number before the lock claims it.');
    }
    if (stranded?.proven.length) {
      console.log(`  ↳ ${stranded.proven.length} of ${stranded.proven.length + stranded.unproven.length} substantive path(s) are byte-identical to what aborted closeout run(s) ${stranded.receipts.join(', ')} (S${stranded.session}) stranded — prior closeout output, not WIP.`);
      if (!RECOVER_STRANDED) console.log('    Recover exactly those (proven by blob id; nothing else is staged): node scripts/start-sync.mjs --recover-stranded');
    } else if (stranded && !stranded.error && plan.residue?.substantive?.length) {
      console.log(`  ↳ no residue path matches a stranded-closeout record (${stranded.abortedRunsWithRecord} aborted run(s) with a record in the newest session) — provenance unproven.`);
    }
    if (recovered && !recovered.ok) console.log(`  ⚠ stranded recovery failed at git ${recovered.step}: ${recovered.err}`);
    if (recovered?.ok) console.log(`  ✓ recovered ${recovered.paths} stranded path(s) in one commit; the remaining residue above is unproven and still needs a human look.`);
    if (summary.gitErr) console.log(`  git: ${summary.gitErr}`);
  }
  process.exit(ok ? 0 : 1);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main();
