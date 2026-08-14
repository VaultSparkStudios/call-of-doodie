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
 * When ADS zoom is active the canvas is scaled around the player, so world
 * coordinates no longer match screen coordinates. Pass playerX/playerY and
 * zoomScale (1.28 for ADS) so the function can project each enemy through the
 * same transform before checking visibility and computing the edge position.
 * Arrow positions are always returned in screen space so they can be drawn
 * outside the zoom transform.
 *
 * @returns {{x:number,y:number,angle:number,color:string,alpha:number}[]}
 */
export function getOffscreenThreatArrows(enemies, W, H, { margin = 18, fogOfWar = false, playerX = null, playerY = null, zoomScale = 1 } = {}) {
  if (fogOfWar || !Array.isArray(enemies) || !enemies.length) return [];
  const doZoom = zoomScale > 1 && playerX != null && playerY != null;
  const arrows = [];
  for (const e of enemies) {
    const sx = doZoom ? playerX + (e.x - playerX) * zoomScale : e.x;
    const sy = doZoom ? playerY + (e.y - playerY) * zoomScale : e.y;
    if (!isOffscreen(sx, sy, W, H)) continue;
    const edge = projectToEdge(sx, sy, W, H, margin);
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
