/**
 * Lightweight SIL parser/forecaster for startup brief rendering.
 */

const CATEGORY_KEYS = {
  'Dev Health': 'dev',
  'Creative Alignment': 'align',
  'Momentum': 'momentum',
  'Engagement': 'engage',
  'Process Quality': 'process',
  'Cross-Repo Coherence': 'coherence',
  'Security Posture': 'security',
  'Ecosystem Integration': 'ecosystem',
  'Capital Efficiency': 'capital',
  'Automation Coverage': 'automation',
};

export function parseSilHistory(markdown = '') {
  const sessions = [];
  const headerRe = /^##\s+(\d{4}-\d{2}-\d{2}).*?Session\s+(\d+).*?Total:\s+(\d+)\/(\d+)/gmi;
  for (const match of markdown.matchAll(headerRe)) {
    const start = match.index ?? 0;
    const next = markdown.slice(start + 1).search(/^##\s+\d{4}-\d{2}-\d{2}/m);
    const body = next >= 0 ? markdown.slice(start, start + 1 + next) : markdown.slice(start);
    const categories = {};
    for (const [label, key] of Object.entries(CATEGORY_KEYS)) {
      const row = body.match(new RegExp(`\\|\\s*${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\|\\s*(\\d+)`, 'i'));
      if (row) categories[key] = Number(row[1]);
    }
    sessions.push({
      date: match[1],
      session: Number(match[2]),
      total: Number(match[3]),
      max: Number(match[4]),
      categories,
    });
  }
  return sessions;
}

export function forecastNext(sessions = [], { velocity = 0, blockerPressure = 0, contextAge = 0 } = {}) {
  if (!sessions.length) return null;
  const current = sessions[0];
  const previous = sessions[1];
  const drift = previous ? Math.max(-5, Math.min(5, current.total - previous.total)) : 0;
  const pressure = blockerPressure > 80 ? -1 : 0;
  const age = contextAge > 2 ? -1 : 0;
  const velocityBoost = Number(velocity) > 3 ? 1 : 0;
  const predictedDelta = Math.max(-10, Math.min(10, drift + pressure + age + velocityBoost));
  const totalPredicted = Math.max(0, Math.min(current.max || 1000, current.total + predictedDelta));
  const categories = Object.fromEntries(
    Object.entries(current.categories || {}).map(([key, score]) => [key, { score, delta: 0 }])
  );
  return { totalPredicted, categories };
}

export default { parseSilHistory, forecastNext };
