import { failureCause } from './spawn-failure-cause.mjs';

export const RECEIPT_ALLOWLIST = [
  { pattern: /^portfolio\/ACCESS_LEDGER\.ndjson$/,          why: 'secret-scan access receipt (Step 4/finalize scan)' },
  { pattern: /^portfolio\/PENDING_PROPAGATION\.json$/,      why: 'Step 7b cross-repo sync queue' },
  { pattern: /^portfolio\/events\.ndjson$/,                 why: 'session-closed event (Step 7c)' },
  { pattern: /^portfolio\/ops\/obelisk-receipts\.ndjson$/,  why: 'Obelisk capability receipts' },
  { pattern: /^portfolio\/ark\/log\/[\d-]+\.ndjson$/,       why: 'Ark broadcast log (Step 7c2 / Step 8 cargo)' },
  { pattern: /^portfolio\/ark\/outbox\/.+\.json$/,          why: 'Ark cargo emitted at closeout' },
  { pattern: /^portfolio\/ark\/DRAIN_OPPORTUNITY\.ndjson$/, why: 'Ark drain telemetry' },
  { pattern: /^portfolio\/ark\/LIFECYCLE\.ndjson$/,         why: 'Ark v2 lifecycle ledger (drain records received — S362)' },
  { pattern: /^portfolio\/compiled\/.+\.json$/,             why: 'compiled derived surface refresh' },
  { pattern: /^context\/PROJECT_STATUS\.json$/,             why: 'lastUpdated stamp (Step 3)' },

  { pattern: /^portfolio\/BLOCKER_DISCIPLINE_LOG\.ndjson$/, why: 'blocker-discipline evidence appended by enforce-blocker-discipline at closeout' },
  { pattern: /^portfolio\/CLOSEOUT_AUTOPILOT_RECEIPTS\.ndjson$/, why: 'closeout-autopilot run receipt (written when the run ends, after its own commit)' },

  { pattern: /^portfolio\/ops\/propagation-drain-receipts\.ndjson$/, why: 'propagation queue drain receipt (drain-propagation-queue)' },

  { pattern: /^portfolio\/ops\/probe-execution-health\.ndjson$/, why: 'per-run doctor probe execution receipt (run-doctor)' },

  { pattern: /^portfolio\/ops\/registry-mutations\.ndjson$/, why: 'registry mutation receipt (rescore-ignis and other registry writers)' },
];

export function normalizePath(p) {
  return String(p).trim().replace(/\\/g, '/').replace(/^\.\//, '');
}

export const RECEIPT_REGISTRY_PATH = 'portfolio/ops/ACTION_BOUND_RECEIPTS.json';

function literalPathPattern(p) {
  return new RegExp(`^${normalizePath(p).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`);
}

export function derivedReceiptLedgers(readFile) {
  let registry;
  try {
    registry = JSON.parse(readFile(RECEIPT_REGISTRY_PATH));
  } catch {
    return [];
  }
  const out = [];
  for (const surface of registry?.surfaces || []) {
    if (!surface?.ledger || typeof surface.ledger !== 'string') continue;
    out.push({
      pattern: literalPathPattern(surface.ledger),
      why: `declared receipt ledger '${surface.id}' (${surface.kind}) — ${RECEIPT_REGISTRY_PATH}`,
      derived: true,
      ledger: normalizePath(surface.ledger),
    });
  }
  return out;
}

export function receiptAllowlist(readFile) {
  if (typeof readFile !== 'function') return RECEIPT_ALLOWLIST;
  return [...RECEIPT_ALLOWLIST, ...derivedReceiptLedgers(readFile)];
}

export function classifyPostBoundaryPaths(paths, allowlist = RECEIPT_ALLOWLIST) {
  const allowed = [];
  const rejected = [];
  for (const raw of paths) {
    const path = normalizePath(raw);
    if (!path) continue;
    const hit = allowlist.find((e) => e.pattern.test(path));
    if (hit) allowed.push({ path, why: hit.why });
    else rejected.push(path);
  }
  return { allowed, rejected };
}

export function dedupeScanReceipts(lines, committedCount = 0) {
  const head = lines.slice(0, committedCount);
  const tail = lines.slice(committedCount);

  const lastIndexByScope = new Map();
  const parsed = tail.map((line, i) => {
    const text = String(line);
    if (!text.trim()) return { i, text, scope: null };
    let obj = null;
    try { obj = JSON.parse(text); } catch { return { i, text, scope: null }; }

    if (!obj || obj.type !== 'scan') return { i, text, scope: null };
    const scope = String(obj.scope ?? '?');
    lastIndexByScope.set(scope, i);
    return { i, text, scope };
  });

  const keptTail = [];
  let removed = 0;
  for (const row of parsed) {
    if (row.scope === null) { keptTail.push(row.text); continue; }
    if (lastIndexByScope.get(row.scope) === row.i) keptTail.push(row.text);
    else removed++;
  }
  return { kept: [...head, ...keptTail], removed };
}

export function planFinalize({ dirty = [], dry = false, allowlist = RECEIPT_ALLOWLIST } = {}) {
  const { allowed, rejected } = classifyPostBoundaryPaths(dirty, allowlist);

  if (rejected.length) {

    return {
      shouldCommit: false,
      allowed,
      rejected,
      reason: 'unexpected-post-boundary-paths',
      message: null,
    };
  }
  if (!allowed.length) {
    return { shouldCommit: false, allowed, rejected, reason: 'already-clean', message: null };
  }
  if (dry) {
    return { shouldCommit: false, allowed, rejected, reason: 'dry-run', message: null };
  }
  return {
    shouldCommit: true,
    allowed,
    rejected,
    reason: 'receipts-pending',
    message: buildFinalizeMessage(allowed),
  };
}

export function buildFinalizeMessage(allowed) {
  const paths = [...new Set(allowed.map((a) => a.path))].sort();
  const body = paths.map((p) => `- ${p}`).join('\n');
  return `chore(closeout): finalize session receipts\n\n` +
    `Bounded finalization transaction (S239 audit #2): the durable side effects\n` +
    `emitted after the primary closeout push, committed once so that clean,\n` +
    `pushed, and session-closed describe the same remote state.\n\n${body}\n`;
}

export async function convergeCloseout({
  observeDirty,
  settle = async () => {},
  stage,
  commit,
  push,
  dry = false,
  maxPasses = 3,
  allowlist = RECEIPT_ALLOWLIST,
} = {}) {
  if (typeof observeDirty !== 'function') throw new TypeError('observeDirty callback required');
  const passes = [];
  for (let pass = 1; pass <= maxPasses; pass++) {
    await settle(pass);
    const dirty = await observeDirty();
    const plan = planFinalize({ dirty, dry, allowlist });
    passes.push({ pass, dirty: [...dirty], reason: plan.reason, allowed: plan.allowed.map((row) => row.path), rejected: plan.rejected });
    if (plan.rejected.length) return { ok: false, converged: false, reason: plan.reason, passes, residue: plan.rejected };
    if (plan.reason === 'already-clean') return { ok: true, converged: true, reason: 'quiescent', passes, residue: [] };
    if (plan.reason === 'dry-run') return { ok: true, converged: false, reason: 'dry-run', passes, residue: plan.allowed.map((row) => row.path) };
    await stage(plan.allowed.map((row) => row.path), pass);
    const committed = await commit(plan.message, pass);
    if (!commandSucceeded(committed)) return { ok: false, converged: false, reason: 'commit-failed', failure: commandFailure(committed), passes, residue: await observeDirty() };
    const pushed = await push(pass);
    if (!commandSucceeded(pushed)) return { ok: false, converged: false, reason: 'push-failed', failure: commandFailure(pushed), passes, residue: await observeDirty() };
  }
  await settle(maxPasses + 1);
  const residue = await observeDirty();
  return { ok: residue.length === 0, converged: residue.length === 0, reason: residue.length ? 'pass-cap-exhausted' : 'quiescent-at-cap', passes, residue };
}

function commandSucceeded(result) {
  return result === true || (result !== null && typeof result === 'object'
    && result.code === 0 && !result.signal && !result.errorCode && !result.errorMessage);
}

function commandFailure(result) {
  const command = result && typeof result === 'object' ? result : null;
  return { cause: failureCause(command), command };
}

export function redactFinalizeCommand(result, redactText) {
  if (typeof redactText !== 'function') throw new TypeError('redactText callback required');
  if (result === true || result === false || result == null) return result;
  const command = {};
  for (const field of ['code', 'signal', 'errorCode', 'errorMessage', 'out', 'err']) {
    const value = result[field];
    if (value !== undefined) command[field] = typeof value === 'string' ? redactText(value) : value;
  }
  return command;
}

export function recordFinalizationFailure(result, {
  receipt, warnings, redactText, processState = process,
}) {
  processState.exitCode = processState.exitCode || 1;
  const residue = (result.residue || []).map((value) => redactText(String(value)));
  const command = result.failure?.command ? redactFinalizeCommand(result.failure.command, redactText) : null;
  const cause = redactText(result.failure?.cause || residue.join(', ') || 'no file residue; finalization did not converge');
  const diagnostic = {
    step: 'closeout-finalization', reason: result.reason,
    failure: { cause, command }, residue,
  };
  receipt.diagnostic(diagnostic);
  warnings.push(`closeout finalization ${result.reason}: ${cause}`);
  return diagnostic;
}

export function preservedUnstagedPaths(dirty, staged) {
  const selected = new Set(staged.map(normalizePath));
  return [...new Set(dirty.map(normalizePath))].filter(p => !selected.has(p));
}
export function scopedDirtyPaths(dirty, preserved) {
  const excluded = new Set(preserved.map(normalizePath));
  return dirty.filter(p => !excluded.has(normalizePath(p)));
}
