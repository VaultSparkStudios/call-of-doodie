import crypto from 'node:crypto';
import path from 'node:path';
import { parseTaskRows } from './task-board.mjs';

const ACTIVE_SECTION = /^(?:Now\b|Next\b|Blocked\b|Human Action Required\b)/i;
const CLOSED_STATUS = /^(?:done|shipped|closed|complete|completed|superseded)/i;

export function stableTaskHash(value) {
  return crypto.createHash('sha256').update(String(value || '')).digest('hex').slice(0, 12);
}

export function stableSilIdentity(value) {
  const match = String(value || '').match(/\[SIL(?::[^\]]*)?\]\s*\[S(\d+)\s*#(\d+)\]/i)
    || String(value || '').match(/\[S(\d+)\s*#(\d+)\]/i);
  return match ? `S${Number(match[1])}#${Number(match[2])}` : null;
}

function compactTitle(value, max = 120) {
  return String(value || '')
    .replace(/^\s*-\s*\[[^\]]*\]\s*/, '')
    .replace(/[*~`]+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

function activeOpenBullets(markdown) {
  const records = [];
  let section = '(root)';
  for (const [index, line] of String(markdown || '').split(/\r?\n/).entries()) {
    const heading = line.match(/^#{2,6}\s+(.+?)\s*$/);
    if (heading) section = heading[1].trim();
    if (!ACTIVE_SECTION.test(section) || !/^\s*-\s*\[/.test(line)) continue;
    const closed = /^\s*-\s*\[x\]/i.test(line) || line.includes('~~');
    if (closed) continue;
    const identity = stableSilIdentity(line);
    const title = compactTitle(line);
    records.push({
      kind: 'bullet',
      key: identity || `L${index + 1}`,
      status: 'open',
      section,
      title,
      titleHash: stableTaskHash(title),
      line: index + 1,
    });
  }
  return records;
}

function finalizeLength(payload) {
  let prior = -1;
  for (let i = 0; i < 4; i += 1) {
    const rendered = JSON.stringify(payload, null, 2) + '\n';
    payload.budget.renderedChars = rendered.length;
    if (rendered.length === prior) return rendered;
    prior = rendered.length;
  }
  return JSON.stringify(payload, null, 2) + '\n';
}

export function buildAuditTaskContext(markdown, {
  sourcePath = 'context/TASK_BOARD.md',
  maxChars = 8000,
} = {}) {
  const text = String(markdown || '');
  const rows = parseTaskRows(text);
  const openRows = rows
    .filter((row) => ACTIVE_SECTION.test(row.section) && !CLOSED_STATUS.test(row.status))
    .map((row) => ({
      kind: 'table',
      key: row.id,
      status: row.status,
      section: row.section,
      title: compactTitle(row.title),
      titleHash: stableTaskHash(row.title),
      line: row.line,
    }));
  const open = [...openRows, ...activeOpenBullets(text)];
  const seen = new Set();
  const dedupedOpen = open.filter((item) => {
    const key = `${item.kind}:${item.key}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const recentShipped = rows
    .filter((row) => CLOSED_STATUS.test(row.status))
    .slice(0, 20)
    .map((row) => ({ id: row.id, status: row.status, titleHash: stableTaskHash(row.title) }));
  const historicTitleHashes = [...new Set(rows.map((row) => stableTaskHash(row.title)))].sort();
  const boundedMax = Math.max(1200, Math.min(20_000, Number(maxChars) || 8000));
  const payload = {
    ok: true,
    mode: 'audit-context',
    source: {
      path: path.normalize(sourcePath),
      sha256: crypto.createHash('sha256').update(text).digest('hex'),
      bytes: Buffer.byteLength(text),
    },
    budget: {
      maxChars: boundedMax,
      renderedChars: 0,
      truncated: false,
      openRetained: dedupedOpen.length,
      openTotal: dedupedOpen.length,
      recentShippedTotal: recentShipped.length,
      historicHashesTotal: historicTitleHashes.length,
      // Include these fields before trimming so their serialized cost is part
      // of the maxChars calculation instead of being appended after the fit.
      historicHashesIncluded: historicTitleHashes.length,
      recentShippedIncluded: recentShipped.length,
    },
    open: dedupedOpen,
    recentShipped,
    historicTitleHashes,
  };

  let rendered = finalizeLength(payload);
  while (rendered.length > boundedMax && payload.historicTitleHashes.length) {
    payload.historicTitleHashes.pop();
    payload.budget.historicHashesIncluded = payload.historicTitleHashes.length;
    payload.budget.truncated = true;
    rendered = finalizeLength(payload);
  }
  while (rendered.length > boundedMax && payload.recentShipped.length) {
    payload.recentShipped.pop();
    payload.budget.recentShippedIncluded = payload.recentShipped.length;
    payload.budget.truncated = true;
    rendered = finalizeLength(payload);
  }
  for (const titleLimit of [80, 48, 0]) {
    if (rendered.length <= boundedMax) break;
    for (const item of payload.open) {
      if (titleLimit === 0) delete item.title;
      else item.title = item.title.slice(0, titleLimit);
    }
    payload.budget.truncated = true;
    rendered = finalizeLength(payload);
  }
  rendered = finalizeLength(payload);
  if (rendered.length > boundedMax) {
    payload.ok = false;
    payload.error = `open task index alone exceeds maxChars=${boundedMax}`;
    rendered = finalizeLength(payload);
  }
  return { payload, rendered };
}
