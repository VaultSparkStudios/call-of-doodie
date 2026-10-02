export function interpolateBossQuote(template, ctx = {}) {
  if (!template || typeof template !== 'string') return template;
  return template
    .replace(/\{wave\}/g, ctx.wave ?? '?')
    .replace(/\{weapon\}/g, ctx.weapon ?? 'that')
    .replace(/\{deaths\}/g, ctx.deaths ?? '0')
    .replace(/\{streak\}/g, ctx.streak ?? '0')
    .replace(/\{act\}/g, ctx.act ?? 'run')
    .replace(/\{sessionDeaths\}/g, ctx.sessionDeaths ?? '0')
    .replace(/\{bossKills\}/g, ctx.bossKills ?? '0')
    .replace(/\{tone\}/g, ctx.tone ?? '');
}

/** Pick an authored line from typed event facts, avoiding the last two used variants. */
export function chooseBossQuote(pool, signature, recentIndices = []) {
  if (!Array.isArray(pool) || pool.length === 0) return { quote: null, index: -1 };
  let hash = 2166136261;
  for (const character of String(signature || '')) { hash ^= character.charCodeAt(0); hash = Math.imul(hash, 16777619); }
  const first = (hash >>> 0) % pool.length;
  const recent = Array.isArray(recentIndices) ? recentIndices.slice(-2) : [];
  let index = first;
  for (let offset = 0; offset < pool.length; offset++) {
    const candidate = (first + offset) % pool.length;
    if (!recent.includes(candidate)) { index = candidate; break; }
  }
  return { quote: pool[index], index };
}

// Returns a difficulty-aware tone descriptor for dialogue flavoring.
export function getBossTone(difficultyId) {
  if (difficultyId === 'easy')   return 'embarrassingly';
  if (difficultyId === 'hard')   return 'impressively';
  if (difficultyId === 'insane') return 'terrifyingly';
  return 'adequately';
}
