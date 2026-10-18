import { receiptAllowlist, classifyPostBoundaryPaths, normalizePath } from './closeout-finalize.mjs';
import { classifyRegeneration } from './regenerated-surface.mjs';

export const QUEUE_DRAINS = [
  {
    queue: 'portfolio/PENDING_PROPAGATION.json',
    receipt: 'portfolio/ops/propagation-drain-receipts.ndjson',
    by: 'scripts/drain-propagation-queue.mjs',
  },
];

const DRAIN_BY_QUEUE = new Map(QUEUE_DRAINS.map((d) => [d.queue, d]));

export function parseNumstat(text) {
  const m = new Map();
  for (const raw of String(text || '').split(/\r?\n/)) {
    if (!raw.trim()) continue;
    const [a, d, ...rest] = raw.split('\t');
    let p = rest.join('\t');
    if (p.includes(' => ')) p = p.replace(/^.*\{.*=> (.*)\}.*$/, '$1');
    m.set(normalizePath(p), { added: a === '-' ? null : Number(a), deleted: d === '-' ? null : Number(d) });
  }
  return m;
}

export function parseStatus(text) {
  const rows = [];
  for (const raw of String(text || '').split(/\r?\n/)) {
    if (!raw.trim()) continue;
    const code = raw.slice(0, 2);
    let p = raw.slice(3).trim();
    if (p.includes(' -> ')) p = p.split(' -> ').pop();
    rows.push({ path: normalizePath(p), code });
  }
  return rows;
}

export function classifyResidue({ statusText, numstatText, allowlist = null, readRevisions = null, readFile = null } = {}) {
  const rows = parseStatus(statusText);
  if (rows.length === 0) return { kind: 'clean', receipts: [], regenerated: [], drained: [], substantive: [], rowsAdded: 0 };
  const numstat = parseNumstat(numstatText);

  const effectiveAllowlist = allowlist || receiptAllowlist(readFile);
  const { allowed, rejected } = classifyPostBoundaryPaths(rows.map((r) => r.path), effectiveAllowlist);
  const allowedByPath = new Map(allowed.map((a) => [a.path, a.why]));
  const receipts = [];
  const regenerated = [];
  const drained = [];

  const regenBasis = new Map();
  const contentChanged = new Map();
  for (const r of rows) {
    if (r.code === '??' || r.code.includes('D')) continue;
    let before = null, after = null;
    if (readRevisions) { try { ({ before, after } = readRevisions(r.path) || {}); } catch {  } }
    const verdict = classifyRegeneration({ path: r.path, beforeText: before ?? null, afterText: after ?? null });

    const admissible = verdict.regenerated
      && (!allowedByPath.has(r.path) || verdict.basis === 'content-equivalent');
    if (admissible) regenBasis.set(r.path, verdict);
    else if (verdict.changedKeys.length && !allowedByPath.has(r.path)) contentChanged.set(r.path, verdict);
  }

  const substantive = rejected
    .filter((p) => !regenBasis.has(p))
    .map((p) => ({
      path: p,
      code: rows.find((r) => r.path === p)?.code || '??',
      reason: contentChanged.get(p)?.detail || 'not a declared receipt class',
    }));
  for (const [p, v] of regenBasis) if (rejected.includes(p)) regenerated.push({ path: p, basis: v.basis, detail: v.detail });

  for (const r of rows) {
    if (regenBasis.has(r.path) && !allowedByPath.has(r.path)) continue;
    if (!allowedByPath.has(r.path)) continue;
    if (r.code.includes('D')) { substantive.push({ path: r.path, code: r.code, reason: 'receipt path deleted' }); continue; }
    const n = numstat.get(r.path);
    if (r.code === '??') { receipts.push({ path: r.path, why: allowedByPath.get(r.path) + ' (new file)', added: null }); continue; }

    if (regenBasis.has(r.path)) { const v = regenBasis.get(r.path); regenerated.push({ path: r.path, basis: v.basis, detail: v.detail }); continue; }
    if (!n) { substantive.push({ path: r.path, code: r.code, reason: 'no numstat row — cannot prove additions-only' }); continue; }

    const pair = DRAIN_BY_QUEUE.get(r.path);
    if (pair && n.deleted > 0) {
      const rec = numstat.get(pair.receipt);
      const recDirty = rows.some((x) => x.path === pair.receipt);
      if (recDirty && rec && rec.added > 0) {
        drained.push({
          path: r.path, receipt: pair.receipt, by: pair.by,
          detail: `${n.deleted} entr${n.deleted === 1 ? 'y' : 'ies'} drained · proven by ${rec.added} new receipt row(s) in ${pair.receipt}`,
        });
        continue;
      }
    }
    if (n.deleted === null || n.deleted > 0) { substantive.push({ path: r.path, code: r.code, reason: n.deleted === null ? 'binary change' : `${n.deleted} deletion(s) — not append-only` }); continue; }
    receipts.push({ path: r.path, why: allowedByPath.get(r.path), added: n.added });
  }
  const rowsAdded = receipts.reduce((s, r) => s + (r.added || 0), 0);

  const kind = substantive.length ? 'substantive'
    : drained.length ? 'drained'
      : regenerated.length ? 'regenerated' : 'receipt-only';
  return { kind, receipts, regenerated, drained, substantive, rowsAdded };
}

export function describeResidue(res) {
  const regen = (res.regenerated || []).length
    ? `${res.regenerated.length} machine regeneration(s): ${res.regenerated.map((r) => `${r.path} (${r.detail})`).join(', ')}`
    : '';

  const drain = (res.drained || []).length
    ? `${res.drained.length} queue drain(s): ${res.drained.map((d) => `${d.path} (${d.detail})`).join(', ')}`
    : '';
  if (res.kind === 'clean') return 'tree clean';
  if (res.kind === 'drained') return `${drain}${regen ? ` · plus ${regen}` : ''}${res.receipts.length ? ` · plus ${res.receipts.length} receipt ledger(s), +${res.rowsAdded} row(s)` : ''}`;
  if (res.kind === 'regenerated') return `${regen}${res.receipts.length ? ` · plus ${res.receipts.length} receipt ledger(s), +${res.rowsAdded} row(s)` : ''}`;
  if (res.kind === 'receipt-only') return `receipt-only residue: ${res.receipts.length} ledger(s), +${res.rowsAdded} row(s) — ${res.receipts.map((r) => r.path).join(', ')}`;
  return `substantive residue: ${res.substantive.map((s) => `${s.path} (${s.reason})`).join(', ')}${res.receipts.length ? ` · plus ${res.receipts.length} receipt ledger(s)` : ''}${regen ? ` · plus ${regen}` : ''}${drain ? ` · plus ${drain}` : ''}`;
}
