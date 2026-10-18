export function parsePorcelain(text) {
  const m = new Map();
  for (const raw of String(text || '').split(/\r?\n/)) {
    if (!raw.trim()) continue;
    const code = raw.slice(0, 2);
    let p = raw.slice(3).trim();
    if (p.includes(' -> ')) p = p.split(' -> ').pop();
    m.set(p.replace(/\\/g, '/'), code);
  }
  return m;
}

export const GIT_STATUS_MAX_BUFFER = 64 * 1024 * 1024;

export function snapshotTrackedTree({ spawnSync, cwd }) {
  try {
    const r = spawnSync('git', ['status', '--porcelain', '--untracked-files=no'], { cwd, encoding: 'utf8', windowsHide: true, maxBuffer: GIT_STATUS_MAX_BUFFER });
    if (r.error || r.status !== 0) return { ok: false, text: null, error: r.error?.message || `git exit ${r.status}` };
    return { ok: true, text: r.stdout, error: null, fingerprints: fingerprintDirtyPaths({ spawnSync, cwd, text: r.stdout }) };
  } catch (e) { return { ok: false, text: null, error: e.message }; }
}

export function fingerprintDirtyPaths({ spawnSync, cwd, text }) {
  const paths = [...parsePorcelain(text)].filter(([, code]) => !code.includes('D')).map(([p]) => p);
  if (paths.length === 0) return {};
  try {
    const r = spawnSync('git', ['hash-object', '--no-filters', '--stdin-paths'], { cwd, encoding: 'utf8', windowsHide: true, input: `${paths.join('\n')}\n`, maxBuffer: GIT_STATUS_MAX_BUFFER });
    if (r.error || r.status !== 0) return null;
    const ids = String(r.stdout || '').split(/\r?\n/).filter(Boolean);
    if (ids.length !== paths.length) return null;
    return Object.fromEntries(paths.map((p, i) => [p, /^[0-9a-f]{40,64}$/.test(ids[i]) ? ids[i] : null]));
  } catch { return null; }
}

export function purityDelta(before, after) {
  if (!before?.ok || !after?.ok) {
    return { measurable: false, mutated: [], preExisting: 0, reason: `UNMEASURABLE — git could not answer (${before?.error || after?.error || 'unknown'})` };
  }
  const a = parsePorcelain(before.text);
  const b = parsePorcelain(after.text);
  const mutated = [];

  const fpA = before.fingerprints;
  const fpB = after.fingerprints;
  const bytesMeasured = fpA !== undefined && fpB !== undefined;
  const unfingerprinted = [];
  for (const [p, code] of b) {

    if (!a.has(p)) mutated.push({ path: p, before: null, after: code });
    else if (a.get(p) !== code) mutated.push({ path: p, before: a.get(p), after: code });
    else if (bytesMeasured && !code.includes('D')) {
      const x = fpA?.[p];
      const y = fpB?.[p];
      if (!x || !y) unfingerprinted.push(p);
      else if (x !== y) mutated.push({ path: p, before: code, after: code, bytesChanged: true });
    }
  }

  for (const [p, code] of a) if (!b.has(p)) mutated.push({ path: p, before: code, after: null, restored: true });
  return {
    measurable: true, mutated, preExisting: a.size, reason: null,
    bytes: bytesMeasured ? 'pre-dirty-fingerprinted' : 'not-measured',
    unfingerprinted,
  };
}

function cleanDetail(delta) {
  if (!delta.preExisting) return 'tracked tree byte-identical across the suite (0 pre-existing dirty path(s) excluded)';
  if (delta.bytes === 'pre-dirty-fingerprinted') {
    return `tracked tree byte-identical across the suite (${delta.preExisting} pre-existing dirty path(s) unchanged by byte fingerprint)`;
  }
  return `tracked tree status-identical across the suite (${delta.preExisting} pre-existing dirty path(s) excluded; their bytes were not fingerprinted)`;
}

export function describePurity(delta) {
  if (!delta.measurable) return delta.reason;
  if (delta.mutated.length === 0) return cleanDetail(delta);
  const names = delta.mutated.slice(0, 6).map((m) => m.path).join(', ') + (delta.mutated.length > 6 ? ` +${delta.mutated.length - 6} more` : '');
  return `suite left ${delta.mutated.length} tracked file(s) changed: ${names} — attribution PRESUMPTIVE (a concurrent writer inside the window is indistinguishable from the suite)`;
}

export const EXPECTED_REGENERATIONS = Object.freeze([
  { path: 'portfolio/INFRA_DEBT_LEDGER.md',              by: 'scripts/test/tier2-portfolio-debt.mjs' },
  { path: 'portfolio/compiled/STUDIO_ORCHESTRATOR.json', by: 'scripts/test/tier2-render-studio-orchestrator.mjs (asserts the regeneration)' },
  { path: 'docs/STUDIO_ORCHESTRATOR.md',                 by: 'scripts/test/tier2-render-studio-orchestrator.mjs' },
  { path: 'portfolio/compiled/SESSION_ORCHESTRATOR.json', by: 'scripts/test/tier2-session-orchestrator-v2-smoke.mjs (session-orchestrator-v2.mjs writes it unconditionally; --json does not suppress)' },
  { path: 'docs/STARTUP_BRIEF.md',                       by: 'scripts/test/tier2-render-startup-brief.mjs' },
  { path: 'docs/STARTUP_BRIEF_V5.md',                    by: 'scripts/test/tier2-render-startup-brief.mjs' },
  { path: 'docs/FEED_DISTRIBUTION_EVAL.md',              by: 'scripts/test/tier2-eval-feed-distribution.mjs' },
  { path: 'docs/FEED_DISTRIBUTION_EVAL_ALL.md',          by: 'scripts/test/tier2-eval-feed-distribution.mjs' },
  { path: 'portfolio/ark/SLO_REPORT.json',               by: 'scripts/test/tier1-ark-slo-check.mjs (asserts persistence)' },
  { path: 'portfolio/ops/phantom-blocker-sweep.ndjson',  by: 'scripts/test/tier2-phantom-blocker-sweep.mjs' },
  { path: 'context/GENIUS_LIST.json',                    by: 'scripts/test/tier2-genius-list*.mjs' },
  { path: 'context/GENIUS_LIST.md',                      by: 'scripts/test/tier2-genius-list*.mjs' },
  { path: 'docs/AGENT_CAPABILITIES.md',                  by: 'scripts/test/tier2-agent-capabilities*.mjs' },
  { path: 'docs/CLOSEOUT_STATUS_BOARD.md',               by: 'scripts/test/tier2-closeout-board*.mjs' },
  { path: 'portfolio/ACTIVE_SESSIONS.json',              by: 'scripts/test/tier2-studio-status*.mjs' },
  { path: 'portfolio/FOUNDER_COCKPIT.json',              by: 'scripts/test/tier2-founder-cockpit*.mjs' },
  { path: 'portfolio/events.ndjson',                     by: 'scripts/test/tier2-studio-events*.mjs' },
  { path: 'portfolio/ops/obelisk-receipts.ndjson',       by: 'scripts/test/tier2-obelisk*.mjs' },
  { path: 'portfolio/ops/routing-grades.ndjson',         by: 'scripts/test/tier2-model-router*.mjs' },
]);

const EXPECTED_PATHS = new Map(EXPECTED_REGENERATIONS.map((e) => [e.path, e.by]));

export function partitionPurity(delta) {
  if (!delta?.measurable) return { measurable: false, expected: [], unexpected: [], reason: delta?.reason ?? null };
  const expected = [];
  const unexpected = [];
  for (const m of delta.mutated) {
    if (EXPECTED_PATHS.has(m.path)) expected.push({ ...m, by: EXPECTED_PATHS.get(m.path) });
    else unexpected.push(m);
  }
  return { measurable: true, expected, unexpected, reason: null };
}

export function describePartitionedPurity(delta) {
  const p = partitionPurity(delta);
  if (!p.measurable) return { pass: false, warn: true, detail: p.reason };
  if (p.unexpected.length) {
    const names = p.unexpected.slice(0, 5).map((m) => m.path).join(', ');
    return {
      pass: false,
      warn: true,
      detail: `${p.unexpected.length} UNEXPECTED tracked file(s) written by the suite: ${names}`
        + `${p.expected.length ? ` · ${p.expected.length} known regeneration(s)` : ''}`
        + ' — attribution PRESUMPTIVE (a concurrent writer inside the window is indistinguishable from the suite)',
    };
  }

  if (delta.unfingerprinted?.length) {
    return {
      pass: false,
      warn: true,
      detail: `${delta.unfingerprinted.length} pre-existing dirty path(s) could not be byte-fingerprinted (${delta.unfingerprinted.slice(0, 4).join(', ')}) — byte purity UNMEASURED for them, not clean`
        + `${p.expected.length ? ` · ${p.expected.length} known regeneration(s)` : ''}`,
    };
  }
  if (p.expected.length) {
    return {
      pass: true,
      warn: true,
      detail: `${p.expected.length} known regeneration(s) — the suite rewrites tracked repo state BY DESIGN and they land in the closeout commit. `
        + 'Attributed, not excused: the durable fix is running the suite in a throwaway worktree.',
    };
  }
  return { pass: true, warn: false, detail: cleanDetail(delta) };
}

export const UNATTRIBUTED_OBSERVED = Object.freeze([
  'docs/GENIUS_LIST.md',
  'portfolio/BLOCKER_DISCIPLINE_LOG.ndjson',
  'portfolio/ark/DISPATCH_ESCALATIONS.json',
]);

export function mergeInvocationPurity(invocations, { filesRun = null } = {}) {
  const rows = (invocations || []).filter((row) => row && row.delta);
  if (rows.length === 0) return null;
  const measuredAt = rows[rows.length - 1].endedAt;
  const broken = rows.find((row) => !row.delta.measurable);
  let delta;
  if (broken) {
    delta = { measurable: false, mutated: [], preExisting: 0, reason: broken.delta.reason || 'UNMEASURABLE — an invocation could not snapshot the tree' };
  } else {
    const byPath = new Map();
    for (const row of rows) for (const m of row.delta.mutated) byPath.set(m.path, m);

    delta = {
      measurable: true, mutated: [...byPath.values()], preExisting: rows[0].delta.preExisting, reason: null,
      bytes: rows.every((row) => row.delta.bytes === 'pre-dirty-fingerprinted') ? 'pre-dirty-fingerprinted' : 'not-measured',
      unfingerprinted: [...new Set(rows.flatMap((row) => row.delta.unfingerprinted || []))],
    };
  }
  const parts = partitionPurity(delta);
  const verdict = describePartitionedPurity(delta);
  return {
    ...delta,
    measuredAt,
    filesRun,
    invocations: rows.length,
    expected: parts.expected,
    unexpected: parts.unexpected,
    pass: verdict.pass,
    detail: verdict.detail,
  };
}

export function mergeShardPurity(shardRows, { filesRun = null } = {}) {
  const rows = shardRows || [];
  if (rows.length === 0) return null;
  const unobserved = rows.filter((row) => !row.purity || !row.purity.delta);
  if (unobserved.length) {
    const reason = `UNMEASURABLE — ${unobserved.length} of ${rows.length} shard proof(s) carry no purity window (${unobserved.slice(0, 4).map((row) => row.shard).join(', ')}${unobserved.length > 4 ? ', …' : ''}); re-run those shards to measure`;
    const measuredAt = rows.map((row) => row.purity?.endedAt).filter(Boolean).sort().pop() || null;
    return { measurable: false, mutated: [], preExisting: 0, reason, measuredAt, filesRun, invocations: rows.length - unobserved.length, expected: [], unexpected: [], pass: false, detail: reason };
  }
  const ordered = rows.map((row) => row.purity).sort((a, b) => String(a.startedAt).localeCompare(String(b.startedAt)));
  return mergeInvocationPurity(ordered, { filesRun });
}

export function carryForwardMutations(priorPurity, delta, afterSnapshot) {
  if (!delta?.measurable || !priorPurity?.delta?.measurable || !afterSnapshot?.ok) return delta;
  const stillDirty = parsePorcelain(afterSnapshot.text);
  const have = new Set(delta.mutated.map((m) => m.path));

  const carried = priorPurity.delta.mutated
    .filter((m) => !have.has(m.path) && (m.restored ? !stillDirty.has(m.path) : stillDirty.has(m.path)))
    .map((m) => (m.restored ? { ...m, carried: true } : { ...m, after: stillDirty.get(m.path), carried: true }));
  return carried.length ? { ...delta, mutated: [...delta.mutated, ...carried] } : delta;
}

export function statusTreePurity(treePurity) {
  if (!treePurity) return null;
  return {
    measurable: treePurity.measurable,
    mutated: (treePurity.mutated || []).map((m) => m.path),
    preExisting: treePurity.preExisting,
    measuredAt: treePurity.measuredAt,
    detail: treePurity.detail,
  };
}
