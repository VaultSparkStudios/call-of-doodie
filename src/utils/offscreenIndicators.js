/**
 * offscreenIndicators.js — pure geometry for edge-of-viewport threat arrows.
 *
 * For most modes the arena is a fixed W×H field, so "off-screen" only happens
 * briefly — enemies spawn just past the edges (see gameHelpers.js spawnEnemy)
 * and during Siege/formation bursts several can be off-canvas at once. Since
 * S165 a mode may declare an arena larger than the viewport and scroll a camera
 * over it, in which case most of the field is off-screen at any moment and this
 * compass carries the whole readability load. Callers pass `camX`/`camY` (arena
 * → screen offset); at (0, 0) the geometry is exactly what it was before.
 * Boss/elite spawns and burst waves are the moments "Readable chaos" (SOUL.md)
 * matters most, so this surfaces a small directional compass marker at the
 * canvas edge for each occupied direction.
 *
 * Suppressed entirely during the Fog of War perk (gs.fogOfWar) — reduced
 * information there is that perk's intentional tradeoff, not a bug to patch.
 */

export function isOffscreen(x, y, W, H, tolerance = 2) {
  return x < -tolerance || x > W + tolerance || y < -tolerance || y > H + tolerance;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function worldToThreatScreenPoint(x, y, {
  focusX = 0,
  focusY = 0,
  zoom = 1,
} = {}) {
  const safeZoom = Number.isFinite(zoom) && zoom > 0 ? zoom : 1;
  return {
    x: focusX + (x - focusX) * safeZoom,
    y: focusY + (y - focusY) * safeZoom,
  };
}

/**
 * Projects a point outside [0,W]x[0,H] onto the boundary of an inset
 * rectangle, along the ray from a player/focus origin through the point.
 * Returns { x, y, angle } where angle points outward (toward the enemy).
 */
export function projectToEdge(x, y, W, H, margin = 18, {
  originX = W / 2,
  originY = H / 2,
} = {}) {
  const minX = Math.min(margin, W / 2);
  const maxX = Math.max(minX, W - margin);
  const minY = Math.min(margin, H / 2);
  const maxY = Math.max(minY, H - margin);
  const ox = clamp(originX, minX, maxX);
  const oy = clamp(originY, minY, maxY);
  const dx = x - originX, dy = y - originY;
  const angle = Math.atan2(dy, dx);
  const cos = Math.cos(angle), sin = Math.sin(angle);
  const scale = Math.min(
    cos > 0 ? (maxX - ox) / cos : cos < 0 ? (minX - ox) / cos : Infinity,
    sin > 0 ? (maxY - oy) / sin : sin < 0 ? (minY - oy) / sin : Infinity,
  );
  return {
    x: clamp(ox + cos * scale, minX, maxX),
    y: clamp(oy + sin * scale, minY, maxY),
    angle,
  };
}

const ELITE_ARROW_COLORS = {
  armored: "#FFD700", fast: "#00E5FF", berserker: "#FF00C8", explosive: "#FF6400", phantom: "#B450FF",
};

/**
 * Builds a bounded, player-relative screen-space compass. Enemies in the same
 * angular sector collapse into one marker so burst spawns cannot paint a wall
 * of overlapping arrows. Boss and elite styling wins within a sector.
 * @returns {{x:number,y:number,angle:number,color:string,alpha:number,count:number,priority:number}[]}
 */
export function getOffscreenThreatArrows(enemies, W, H, {
  margin = 18,
  fogOfWar = false,
  focusX = W / 2,
  focusY = H / 2,
  zoom = 1,
  sectorCount = 8,
  maxArrows = 8,
  camX = 0,
  camY = 0,
} = {}) {
  if (fogOfWar || !Array.isArray(enemies) || !enemies.length) return [];
  const safeSectorCount = clamp(Math.floor(sectorCount) || 8, 1, 16);
  const safeMaxArrows = clamp(Math.floor(maxArrows) || 8, 1, safeSectorCount);
  // Arena → screen. Focus and every enemy shift together, so the ADS zoom
  // still pivots on the player and the edge projection stays in canvas space.
  const screenFocusX = focusX - camX;
  const screenFocusY = focusY - camY;
  const groups = new Map();
  for (const e of enemies) {
    const point = worldToThreatScreenPoint(e.x - camX, e.y - camY, {
      focusX: screenFocusX, focusY: screenFocusY, zoom,
    });
    if (!isOffscreen(point.x, point.y, W, H)) continue;
    const edge = projectToEdge(point.x, point.y, W, H, margin, {
      originX: screenFocusX,
      originY: screenFocusY,
    });
    const priority = e.isBossEnemy ? 3 : e.eliteType ? 2 : 1;
    const normalizedAngle = (edge.angle + Math.PI * 2) % (Math.PI * 2);
    const sector = Math.floor(normalizedAngle / (Math.PI * 2) * safeSectorCount) % safeSectorCount;
    const candidate = {
      ...edge,
      color: e.isBossEnemy ? "#FF4D4D" : (ELITE_ARROW_COLORS[e.eliteType] || "#FFFFFF"),
      alpha: priority > 1 ? 0.9 : 0.55,
      priority,
      count: 1,
      sector,
    };
    const current = groups.get(sector);
    if (!current) {
      groups.set(sector, candidate);
      continue;
    }
    current.count += 1;
    if (candidate.priority > current.priority) {
      groups.set(sector, { ...candidate, count: current.count });
    }
  }
  return [...groups.values()]
    .sort((a, b) => b.priority - a.priority || b.count - a.count || a.sector - b.sector)
    .slice(0, safeMaxArrows)
    .sort((a, b) => a.sector - b.sector)
    .map(({ sector: _sector, ...arrow }) => arrow);
}

export function drawOffscreenThreatArrows(ctx, arrows) {
  if (!ctx || !Array.isArray(arrows)) return;
  for (const arrow of arrows) {
    ctx.save();
    ctx.translate(arrow.x, arrow.y);
    ctx.rotate(arrow.angle);
    ctx.globalAlpha = arrow.alpha;
    ctx.fillStyle = arrow.color;
    ctx.beginPath();
    ctx.moveTo(9, 0);
    ctx.lineTo(-6, -6);
    ctx.lineTo(-6, 6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    if (arrow.count > 1) {
      const bx = arrow.x - Math.cos(arrow.angle) * 15;
      const by = arrow.y - Math.sin(arrow.angle) * 15;
      ctx.save();
      ctx.globalAlpha = Math.max(0.85, arrow.alpha);
      ctx.fillStyle = "rgba(0,0,0,0.82)";
      ctx.beginPath();
      ctx.arc(bx, by, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = arrow.color;
      ctx.font = "bold 8px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(arrow.count > 9 ? "9+" : String(arrow.count), bx, by + 0.5);
      ctx.restore();
    }
  }
  ctx.globalAlpha = 1;
}
