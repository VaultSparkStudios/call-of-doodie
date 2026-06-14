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

// Returns a difficulty-aware tone descriptor for dialogue flavoring.
export function getBossTone(difficultyId) {
  if (difficultyId === 'easy')   return 'embarrassingly';
  if (difficultyId === 'hard')   return 'impressively';
  if (difficultyId === 'insane') return 'terrifyingly';
  return 'adequately';
}
