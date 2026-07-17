// Canonical parser for the two SIL entry formats carried by Studio OS repos.
// Keep every consumer on this source so session/date/score/category truth cannot drift.

export const SIL_CATEGORIES = [
  "Dev Health", "Creative Alignment", "Momentum", "Engagement", "Process Quality",
  "Cross-Repo Coher", "Security Posture", "Ecosystem Integ", "Capital Efficiency", "Automation Cover",
];

const CATEGORY_ALIASES = {
  "Cross-Repo Coherence": "Cross-Repo Coher",
  "Ecosystem Integration": "Ecosystem Integ",
  "Automation Coverage": "Automation Cover",
  "Engagement (infra)": "Engagement",
};

function parseCategories(block) {
  const categories = {};
  for (const line of String(block).split(/\r?\n/)) {
    if (!/^\s*\|/.test(line)) continue;
    const cells = line.split("|").slice(1, -1).map((cell) => cell.trim());
    if (cells.length < 2) continue;
    const numbered = /^\d+$/.test(cells[0]);
    const name = numbered ? cells[1] : cells[0];
    const scoreText = numbered ? cells[2] : cells[1];
    const canonical = CATEGORY_ALIASES[name] || name;
    if (!SIL_CATEGORIES.includes(canonical) || !/^\d+$/.test(scoreText || "")) continue;
    const score = Number(scoreText);
    if (score >= 0 && score <= 100) categories[canonical] = score;
  }
  return categories;
}

function captureMetric(text, pattern) {
  const match = String(text).match(pattern);
  return match ? Number(match[1]) : null;
}

export function parseSilHistory(silText, maxSessions = 5) {
  const text = String(silText || "");
  const headings = [...text.matchAll(/^##[^\n]*?\bSession\s+(\d+)\b[^\n]*$/gm)];
  const sessions = headings.map((match, index) => {
    const start = match.index;
    const end = headings[index + 1]?.index ?? text.length;
    const header = match[0];
    const block = text.slice(start, end);
    const body = block.slice(header.length).replace(/^\r?\n/, "");
    const totalMatch = block.match(/\bTotal:\s*(\d+)\/(\d+)/i);
    return {
      session: Number(match[1]),
      date: header.match(/\b(20\d{2}-\d{2}-\d{2})\b/)?.[1] || null,
      idx: start,
      header,
      body,
      total: totalMatch ? Number(totalMatch[1]) : null,
      max: totalMatch ? Number(totalMatch[2]) : null,
      velocity: captureMetric(block, /\bVelocity:\s*(\d+)/i),
      debt: block.match(/\bDebt:\s*([↑↓→])/i)?.[1] || null,
      categories: parseCategories(block),
    };
  });
  sessions.sort((a, b) => b.session - a.session);
  const limit = Number.isFinite(maxSessions) ? Math.max(0, maxSessions) : sessions.length;
  return sessions.slice(0, limit);
}

export function latestScoredSilSession(silText) {
  return parseSilHistory(silText, Number.POSITIVE_INFINITY).find((entry) => entry.total != null) || null;
}

export function validateSilSession(entry) {
  const categoryCount = entry ? Object.keys(entry.categories || {}).length : 0;
  return {
    ok: Boolean(entry?.date && entry?.total != null && entry?.max && categoryCount === SIL_CATEGORIES.length),
    categoryCount,
    expectedCategoryCount: SIL_CATEGORIES.length,
    session: entry?.session ?? null,
    date: entry?.date ?? null,
    total: entry?.total ?? null,
  };
}

export function totalFromCategories(entry) {
  const values = Object.values(entry?.categories || {});
  return values.length === SIL_CATEGORIES.length ? values.reduce((sum, score) => sum + score, 0) : null;
}

export const _silHistoryInternals = { parseCategories };
