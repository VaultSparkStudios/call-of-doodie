export function stepAndCompactInPlace(items, predicate) {
  if (!Array.isArray(items)) return [];
  const length = items.length;
  let write = 0;
  for (let read = 0; read < length; read += 1) {
    const item = items[read];
    if (predicate(item, read, items)) items[write++] = item;
  }
  items.length = write;
  return items;
}

export function stepTransientEffectsInPlace(gs = {}) {
  gs.particles = stepAndCompactInPlace(gs.particles || [], (particle) => {
    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.vx *= 0.95;
    particle.vy *= 0.95;
    particle.life -= 1;
    return particle.life > 0;
  });
  gs.floatingTexts = stepAndCompactInPlace(gs.floatingTexts || [], (text) => {
    text.y += text.vy;
    text.life -= 1;
    return text.life > 0;
  });
  gs.dyingEnemies = stepAndCompactInPlace(gs.dyingEnemies || [], (enemy) => {
    enemy.life -= 1;
    return enemy.life > 0;
  });
  gs.lightningArcs = stepAndCompactInPlace(gs.lightningArcs || [], (arc) => {
    arc.life -= 1;
    return arc.life > 0;
  });
  gs.beams = stepAndCompactInPlace(gs.beams || [], (beam) => {
    beam.life -= 1;
    return beam.life > 0;
  });
  return gs;
}

