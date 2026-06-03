/**
 * gameStep.js — pure per-frame game logic extractions (App.jsx slice 1).
 *
 * Each function here is a pure transformation: takes explicit state/inputs,
 * returns updated values. No React refs, no side effects.
 *
 * Extraction roadmap:
 *   slice 1 (this file) — player movement, obstacle push-out
 *   slice 2 — bullet movement + lifetime
 *   slice 3 — enemy movement (flow field lookup)
 *   slice N — full step(gs, frame, inputs) → {nextGs, events}
 */

/**
 * Compute normalized movement direction from keyboard + joystick input.
 * Returns { dx, dy } where |dx,dy| ≤ 1.0.
 */
export function computeMovementVector(keys = {}, joystick = { active: false, dx: 0, dy: 0 }) {
  let dx = 0, dy = 0;
  if (keys["w"] || keys["arrowup"])    dy -= 1;
  if (keys["s"] || keys["arrowdown"])  dy += 1;
  if (keys["a"] || keys["arrowleft"])  dx -= 1;
  if (keys["d"] || keys["arrowright"]) dx += 1;
  if (joystick.active) {
    const dist = Math.hypot(joystick.dx, joystick.dy);
    if (dist > 5) { dx += joystick.dx / Math.max(dist, 50); dy += joystick.dy / Math.max(dist, 50); }
  }
  const len = Math.hypot(dx, dy);
  if (len > 0) { dx /= len; dy /= len; }
  return { dx, dy };
}

export function computePointerAimAngle(pointer, rect, canvasSize, player) {
  const safeRect = rect || { left: 0, top: 0, width: canvasSize?.w || 1, height: canvasSize?.h || 1 };
  const canvasW = canvasSize?.w || safeRect.width || 1;
  const canvasH = canvasSize?.h || safeRect.height || 1;
  const rectW = safeRect.width || 1;
  const rectH = safeRect.height || 1;
  const x = ((pointer?.x || 0) - (safeRect.left || 0)) * (canvasW / rectW);
  const y = ((pointer?.y || 0) - (safeRect.top || 0)) * (canvasH / rectH);
  return Math.atan2(y - (player?.y || 0), x - (player?.x || 0));
}

export function angleToUnitVector(angle) {
  return {
    x: Math.cos(angle),
    y: Math.sin(angle),
  };
}

export function pointerAimBucket(angle) {
  const { x, y } = angleToUnitVector(angle);
  if (Math.abs(x) >= Math.abs(y)) return x >= 0 ? "east" : "west";
  return y >= 0 ? "south" : "north";
}

export function buildPointerAimSweepReport(rect, canvasSize, player) {
  const safeRect = rect || { left: 0, top: 0, width: canvasSize?.w || 1, height: canvasSize?.h || 1 };
  const midX = (safeRect.left || 0) + (safeRect.width || 1) / 2;
  const midY = (safeRect.top || 0) + (safeRect.height || 1) / 2;
  const edgeX = (safeRect.width || 1) * 0.35;
  const edgeY = (safeRect.height || 1) * 0.35;
  const probes = [
    { id: "east", pointer: { x: midX + edgeX, y: midY } },
    { id: "south", pointer: { x: midX, y: midY + edgeY } },
    { id: "west", pointer: { x: midX - edgeX, y: midY } },
    { id: "north", pointer: { x: midX, y: midY - edgeY } },
  ].map((probe) => {
    const angle = computePointerAimAngle(probe.pointer, safeRect, canvasSize, player);
    return { ...probe, angle, bucket: pointerAimBucket(angle) };
  });
  const buckets = new Set(probes.map((probe) => probe.bucket));
  return {
    probes,
    buckets: Array.from(buckets).sort(),
    complete: ["east", "north", "south", "west"].every((bucket) => buckets.has(bucket)),
  };
}

/**
 * Apply player movement for one frame. Mutates player.x / player.y in place.
 * Returns the (possibly mutated) player object for chaining.
 *
 * @param {object} player - { x, y, speed }
 * @param {{ dx: number, dy: number }} dir - normalized movement vector from computeMovementVector
 * @param {object} opts
 * @param {boolean} opts.dashActive - if true, skip movement (dash handles it externally)
 * @param {number}  opts.adrenalineRushTimer - >0 → 2× speed
 * @param {boolean} opts.rubbleSlowed - true → 60% speed
 * @param {number}  opts.W - canvas width (for clamping)
 * @param {number}  opts.H - canvas height (for clamping)
 * @param {Array}   opts.obstacles - [{ x, y, w, h }]
 */
export function applyPlayerMovement(player, dir, {
  dashActive = false,
  adrenalineRushTimer = 0,
  rubbleSlowed = false,
  W = 800,
  H = 600,
  obstacles = [],
} = {}) {
  if (!dashActive) {
    const rushMult   = adrenalineRushTimer > 0 ? 2.0 : 1.0;
    const rubbleMult = rubbleSlowed ? 0.6 : 1.0;
    player.x += dir.dx * player.speed * rushMult * rubbleMult;
    player.y += dir.dy * player.speed * rushMult * rubbleMult;
  }
  // Canvas boundary clamp
  player.x = Math.max(20, Math.min(W - 20, player.x));
  player.y = Math.max(20, Math.min(H - 20, player.y));
  // Obstacle push-out
  for (const ob of obstacles) {
    const cx = Math.max(ob.x, Math.min(player.x, ob.x + ob.w));
    const cy = Math.max(ob.y, Math.min(player.y, ob.y + ob.h));
    const dist = Math.hypot(player.x - cx, player.y - cy);
    if (dist < 16) {
      const ang = Math.atan2(player.y - cy, player.x - cx);
      player.x = cx + Math.cos(ang) * 17;
      player.y = cy + Math.sin(ang) * 17;
    }
  }
  return player;
}
