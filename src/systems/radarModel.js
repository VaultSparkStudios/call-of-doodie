const DEFAULT_OBJECTIVE_LIMIT = 8;

/** Pure world-to-radar projection shared by the renderer and unit tests. */
export function projectRadarPoint({
  x,
  y,
  wholeArena,
  arenaW,
  arenaH,
  playerX,
  playerY,
  viewW,
  viewH,
  radius,
}) {
  if (wholeArena) {
    const span = Math.max(1, Math.hypot(arenaW, arenaH));
    return {
      dx: ((x - arenaW / 2) / span) * radius * 2,
      dy: ((y - arenaH / 2) / span) * radius * 2,
    };
  }
  return {
    dx: ((x - playerX) / (viewW * 0.6)) * radius,
    dy: ((y - playerY) / (viewH * 0.6)) * radius,
  };
}

/**
 * Objective markers are only useful when the radar represents the whole map.
 * The exit always wins the bounded marker budget; remaining slots show loot in
 * stable pickup order so the same state paints the same radar.
 */
export function buildRadarObjectiveMarkers(gs, { wholeArena = false, limit = DEFAULT_OBJECTIVE_LIMIT } = {}) {
  if (!wholeArena || !gs) return [];
  const cap = Math.max(1, Math.min(12, Math.floor(limit) || DEFAULT_OBJECTIVE_LIMIT));
  const finitePoint = (item) => item && Number.isFinite(item.x) && Number.isFinite(item.y);
  const markers = [];
  const exit = (gs.structures || []).find((structure) => structure?.kind === "exit" && structure.alive !== false && finitePoint(structure));
  if (exit) markers.push({ id: exit.id || "evac", kind: "evac", x: exit.x, y: exit.y });
  for (let index = 0; index < (gs.pickups || []).length && markers.length < cap; index += 1) {
    const pickup = gs.pickups[index];
    if (pickup?.type !== "loot" || !finitePoint(pickup)) continue;
    markers.push({ id: `loot-${index}`, kind: "loot", x: pickup.x, y: pickup.y });
  }
  return markers;
}

