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

export function retainLastMatchingInPlace(items, predicate, limit) {
  if (!Array.isArray(items)) return [];
  const cap = Math.max(0, Math.floor(Number(limit) || 0));
  if (cap === 0) {
    items.length = 0;
    return items;
  }
  let skip = 0;

  for (let index = items.length - 1; index >= 0; index -= 1) {
    if (predicate(items[index], index, items)) skip += 1;
  }
  skip = Math.max(0, skip - cap);
  return stepAndCompactInPlace(items, (item, index, source) => {
    if (!predicate(item, index, source)) return false;
    if (skip > 0) {
      skip -= 1;
      return false;
    }
    return true;
  });
}

export function stepTransientEffectsInPlace(gs = {}) {
  gs.particles = stepAndCompactInPlace(gs.particles || [], (particle) => {
    particle.x += particle.vx;
    particle.y += particle.vy;
    if (particle.gravity) {
      // debris / casing: gravity pull with mild horizontal drag
      particle.vy += particle.gravity;
      particle.vx *= 0.97;
      if (particle.rotVel) particle.rot += particle.rotVel;
    } else if (particle.kind === "smoke") {
      particle.vx *= 0.98;
      particle.vy *= 0.98;
    } else {
      particle.vx *= 0.95;
      particle.vy *= 0.95;
    }
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

