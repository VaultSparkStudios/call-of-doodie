// sil-ledger.mjs — one parser for the append-only, mixed-format SIL ledger.
//
// SELF_IMPROVEMENT_LOOP.md is append-only but not physically ordered and carries
// several historical header shapes. Session number, never document position, is
// the ordering authority. Every consumer gets the same parsed block contract.

const HEADER_RE = /^##[^\n]*\bSession\s+(\d+)\b[^\n]*$/gmi;

const CATEGORY_ALIASES = new Map([
  ['cross-repo coherence', 'Cross-Repo Coherence'],
  ['cross-repo coher', 'Cross-Repo Coherence'],
  ['ecosystem integration', 'Ecosystem Integration'],
  ['ecosystem integ', 'Ecosystem Integration'],
  ['automation coverage', 'Automation Coverage'],
  ['automation cover', 'Automation Coverage'],
  ['engagement (infra)', 'Engagement'],
]);

function numberMatch(text, label) {
  const re = new RegExp(`(?:\\*\\*)?${label}:(?:\\*\\*)?\\s*(\\d+)`, 'i');
  const value = String(text).match(re)?.[1];
  return value == null ? null : Number(value);
}

function totalMatch(text) {
  const match = String(text).match(/(?:\*\*)?Total:(?:\*\*)?\s*(\d+)\/(\d+)/i);
  return match ? { total: Number(match[1]), max: Number(match[2]) } : { total: null, max: null };
}

function parseCategories(block) {
  const categories = {};
  const rowRe = /^\|\s*(?:\d+\s*\|\s*)?([A-Za-z][^|]+?)\s*\|\s*(\d+)\s*\|/gm;
  for (const match of String(block).matchAll(rowRe)) {
    let label = match[1].trim().replace(/\s+/g, ' ');
    label = CATEGORY_ALIASES.get(label.toLowerCase()) ?? label.replace(/\s*\([^)]*\)\s*$/, '');
    categories[label] = Number(match[2]);
  }
  return categories;
}

/** Parse every SIL session and sort greatest session first by default. */
export function parseSilSessions(markdown = '', { order = 'desc' } = {}) {
  const text = String(markdown);
  const headers = [...text.matchAll(HEADER_RE)];
  const entries = headers.map((match, index) => {
    const sourceIndex = match.index ?? 0;
    const headerEnd = sourceIndex + match[0].length;
    const nextIndex = headers[index + 1]?.index ?? text.length;
    const header = match[0];
    const body = text.slice(headerEnd, nextIndex).replace(/^\r?\n/, '');
    const block = `${header}\n${body}`;
    const { total, max } = totalMatch(block);
    const date = header.match(/\b(\d{4}-\d{2}-\d{2})\b/)?.[1] ?? null;
    const velocity = numberMatch(block, 'Velocity');
    return {
      session: Number(match[1]),
      date,
      header,
      body,
      block,
      total,
      max,
      totalNormalized: total == null || max == null ? null : (max === 500 ? total * 2 : total),
      velocity,
      categories: parseCategories(body),
      sourceIndex,
    };
  }).filter((entry) => Number.isFinite(entry.session));

  const direction = order === 'asc' ? 1 : -1;
  return entries.sort((a, b) => direction * (a.session - b.session) || a.sourceIndex - b.sourceIndex);
}

export function latestSilEntry(markdown = '', { requireScore = false } = {}) {
  const entries = parseSilSessions(markdown);
  return (requireScore ? entries.find((entry) => entry.total != null) : entries[0]) ?? null;
}

export function latestSilSession(markdown = '') {
  return latestSilEntry(markdown)?.session ?? null;
}

export function selectSilPair(markdown = '', { requireScore = false } = {}) {
  const entries = parseSilSessions(markdown);
  const current = (requireScore ? entries.find((entry) => entry.total != null) : entries[0]) ?? null;
  const previous = current
    ? entries.find((entry) => entry.session < current.session && (!requireScore || entry.total != null)) ?? null
    : null;
  return { current, previous };
}

export default { parseSilSessions, latestSilEntry, latestSilSession, selectSilPair };
