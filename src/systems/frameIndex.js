export function compactTruthyInPlace(items) {
  if (!Array.isArray(items)) return [];
  let write = 0;
  for (let read = 0; read < items.length; read += 1) {
    const item = items[read];
    if (item) items[write++] = item;
  }
  items.length = write;
  return items;
}

export function createEnemyFrameIndex() {
  return {
    sergeants: [],
    summonCounts: Object.create(null),
    summonKeys: [],
    scanned: 0,
  };
}

export function buildEnemyFrameIndex(enemies, scratch = createEnemyFrameIndex()) {
  const index = scratch || createEnemyFrameIndex();
  index.sergeants.length = 0;
  for (let i = 0; i < index.summonKeys.length; i += 1) delete index.summonCounts[index.summonKeys[i]];
  index.summonKeys.length = 0;
  index.scanned = 0;

  for (let i = 0; i < enemies.length; i += 1) {
    const enemy = enemies[i];
    index.scanned += 1;
    if (enemy.typeIndex === 13) index.sergeants.push(enemy);
    if (enemy.summonedBy != null) {
      const key = enemy.summonedBy;
      if (!index.summonCounts[key]) index.summonKeys.push(key);
      index.summonCounts[key] = (index.summonCounts[key] || 0) + 1;
    }
  }
  return index;
}

export function applySergeantAura(enemies, index, radius = 150) {
  const sergeants = index?.sergeants || [];
  const radiusSquared = radius * radius;
  for (let i = 0; i < enemies.length; i += 1) {
    const enemy = enemies[i];
    let buffed = false;
    if (enemy.typeIndex !== 13) {
      for (let j = 0; j < sergeants.length; j += 1) {
        const sergeant = sergeants[j];
        const dx = enemy.x - sergeant.x;
        const dy = enemy.y - sergeant.y;
        if ((dx * dx) + (dy * dy) < radiusSquared) {
          buffed = true;
          break;
        }
      }
    }
    enemy.buffed = buffed;
  }
  return enemies;
}

export function countSummonsFor(index, summonerId) {
  if (summonerId == null) return 0;
  return index?.summonCounts?.[summonerId] || 0;
}
