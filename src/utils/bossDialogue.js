export function interpolateBossQuote(template, ctx = {}) {
  if (!template || typeof template !== 'string') return template;
  return template
    .replace(/\{wave\}/g, ctx.wave ?? '?')
    .replace(/\{weapon\}/g, ctx.weapon ?? 'that')
    .replace(/\{deaths\}/g, ctx.deaths ?? '0')
    .replace(/\{streak\}/g, ctx.streak ?? '0')
    .replace(/\{act\}/g, ctx.act ?? 'run');
}
