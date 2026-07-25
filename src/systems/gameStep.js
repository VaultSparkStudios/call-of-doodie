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
function finiteAxis(value, min = -1, max = 1) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.max(min, Math.min(max, numeric)) : 0;
}

function keyboardVector(keys = {}) {
  let dx = 0, dy = 0;
  if (keys["w"] || keys["arrowup"])    dy -= 1;
  if (keys["s"] || keys["arrowdown"])  dy += 1;
  if (keys["a"] || keys["arrowleft"])  dx -= 1;
  if (keys["d"] || keys["arrowright"]) dx += 1;
  return { dx, dy };
}

function touchVector(joystick = {}) {
  if (!joystick?.active) return { dx: 0, dy: 0, active: false };
  const rawX = finiteAxis(joystick.dx, -10000, 10000);
  const rawY = finiteAxis(joystick.dy, -10000, 10000);
  const distance = Math.hypot(rawX, rawY);
  if (distance <= 5) return { dx: 0, dy: 0, active: false };
  return {
    dx: rawX / Math.max(distance, 50),
    dy: rawY / Math.max(distance, 50),
    active: true,
  };
}

function gamepadVector(gamepad = {}) {
  if (!gamepad?.active) return { dx: 0, dy: 0, active: false };
  const dx = finiteAxis(gamepad.x ?? gamepad.dx);
  const dy = finiteAxis(gamepad.y ?? gamepad.dy);
  return { dx, dy, active: Math.hypot(dx, dy) > 0 };
}

export function resolveMovementVector({ keys = {}, joystick = {}, gamepad = {} } = {}) {
  const keyboard = keyboardVector(keys);
  const touch = touchVector(joystick);
  const controller = gamepadVector(gamepad);
  let dx = keyboard.dx + touch.dx + controller.dx;
  let dy = keyboard.dy + touch.dy + controller.dy;
  const activeSources = [];
  if (Math.hypot(keyboard.dx, keyboard.dy) > 0) activeSources.push("keyboard");
  if (touch.active) activeSources.push("touch");
  if (controller.active) activeSources.push("gamepad");
  const len = Math.hypot(dx, dy);
  const strongestMagnitude = Math.max(
    Math.hypot(keyboard.dx, keyboard.dy),
    Math.hypot(touch.dx, touch.dy),
    Math.hypot(controller.dx, controller.dy),
  );
  const contention = activeSources.length > 1 && strongestMagnitude >= 0.5 && len < strongestMagnitude * 0.35;
  if (len > 0) {
    dx /= len;
    dy /= len;
  }
  return { dx, dy, activeSources, contention };
}

export function computeMovementVector(keys = {}, joystick = {}, gamepad = {}) {
  const { dx, dy } = resolveMovementVector({ keys, joystick, gamepad });
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
  const canvasW = canvasSize?.w || safeRect.width || 1;
  const canvasH = canvasSize?.h || safeRect.height || 1;
  const midX = (safeRect.left || 0) + ((player?.x ?? canvasW / 2) / canvasW) * (safeRect.width || 1);
  const midY = (safeRect.top || 0) + ((player?.y ?? canvasH / 2) / canvasH) * (safeRect.height || 1);
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
  const safeDx = finiteAxis(dir?.dx);
  const safeDy = finiteAxis(dir?.dy);
  const safeSpeed = Math.max(0, Number.isFinite(Number(player?.speed)) ? Number(player.speed) : 0);
  const safeW = Math.max(40, Number.isFinite(Number(W)) ? Number(W) : 800);
  const safeH = Math.max(40, Number.isFinite(Number(H)) ? Number(H) : 600);
  player.x = Number.isFinite(Number(player.x)) ? Number(player.x) : safeW / 2;
  player.y = Number.isFinite(Number(player.y)) ? Number(player.y) : safeH / 2;
  if (!dashActive) {
    const rushMult   = adrenalineRushTimer > 0 ? 2.0 : 1.0;
    const rubbleMult = rubbleSlowed ? 0.6 : 1.0;
    player.x += safeDx * safeSpeed * rushMult * rubbleMult;
    player.y += safeDy * safeSpeed * rushMult * rubbleMult;
  }
  // Canvas boundary clamp
  player.x = Math.max(20, Math.min(safeW - 20, player.x));
  player.y = Math.max(20, Math.min(safeH - 20, player.y));
  // Obstacle push-out
  for (const ob of obstacles) {
    const obX = Number.isFinite(Number(ob?.x)) ? Number(ob.x) : 0;
    const obY = Number.isFinite(Number(ob?.y)) ? Number(ob.y) : 0;
    const obW = Math.max(0, Number.isFinite(Number(ob?.w)) ? Number(ob.w) : 0);
    const obH = Math.max(0, Number.isFinite(Number(ob?.h)) ? Number(ob.h) : 0);
    const cx = Math.max(obX, Math.min(player.x, obX + obW));
    const cy = Math.max(obY, Math.min(player.y, obY + obH));
    const dist = Math.hypot(player.x - cx, player.y - cy);
    if (dist < 16) {
      const ang = Math.atan2(player.y - cy, player.x - cx);
      player.x = cx + Math.cos(ang) * 17;
      player.y = cy + Math.sin(ang) * 17;
    }
  }
  return player;
}
