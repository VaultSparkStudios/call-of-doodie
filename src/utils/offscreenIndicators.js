/**
 * offscreenIndicators.js — pure geometry for edge-of-viewport threat arrows.
 *
 * The arena is a fixed W×H field (no scrolling camera), so "off-screen"
 * only happens briefly — enemies spawn just past the edges (see
 * gameHelpers.js spawnEnemy) and during Siege/formation bursts several can
 * be off-canvas at once. Boss/elite spawns and those bursts are exactly the
 * moments "Readable chaos" (SOUL.md) matters most, so this surfaces a small
 * directional arrow at the canvas edge for every currently off-screen enemy.
 *
 * Suppressed entirely during the Fog of War perk (gs.fogOfWar) — reduced
 * information there is that perk's intentional tradeoff, not a bug to patch.
 */

export function isOffscreen(x, y, W, H, tolerance = 2) {
  return x < -tolerance || x > W + tolerance || y < -tolerance || y > H + tolerance;
}

/**
 * Projects a point outside [0,W]x[0,H] onto the boundary of an inset
 * rectangle, along the ray from the viewport center through the point.
 * Returns { x, y, angle } where angle points outward (toward the enemy).
 */
export function projectToEdge(x, y, W, H, margin = 18) {
  const cx = W / 2, cy = H / 2;
  const dx = x - cx, dy = y - cy;
  const angle = Math.atan2(dy, dx);
  const halfW = Math.max(1, W / 2 - margin);
  const halfH = Math.max(1, H / 2 - margin);
  const cos = Math.cos(angle), sin = Math.sin(angle);
  const scale = Math.min(
    cos !== 0 ? Math.abs(halfW / cos) : Infinity,
    sin !== 0 ? Math.abs(halfH / sin) : Infinity,
  );
  return { x: cx + cos * scale, y: cy + sin * scale, angle };
}

const ELITE_ARROW_COLORS = {
  armored: "#FFD700", fast: "#00E5FF", berserker: "#FF00C8", explosive: "#FF6400", phantom: "#B450FF",
};

/**
 * Builds render-ready arrow descriptors for every off-screen enemy.
 *
 * Positions use CSS-pixel canvas coordinates (W×H). Callers must draw these
 * arrows in screen space — outside any active camera zoom (e.g. ADS) — so the
 * arrows land at the visual canvas edge rather than inheriting the zoom offset.
 *
 * @returns {{x:number,y:number,angle:number,color:string,alpha:number}[]}
 */
export function getOffscreenThreatArrows(enemies, W, H, { margin = 18, fogOfWar = false } = {}) {
  if (fogOfWar || !Array.isArray(enemies) || !enemies.length) return [];
  const arrows = [];
  for (const e of enemies) {
    if (!isOffscreen(e.x, e.y, W, H)) continue;
    const edge = projectToEdge(e.x, e.y, W, H, margin);
    const priority = Boolean(e.isBossEnemy || e.eliteType);
    arrows.push({
      x: edge.x,
      y: edge.y,
      angle: edge.angle,
      color: e.isBossEnemy ? "#FF4D4D" : (ELITE_ARROW_COLORS[e.eliteType] || "#FFFFFF"),
      alpha: priority ? 0.85 : 0.4,
    });
  }
  return arrows;
}
