// CAMERA — a scrolling view over an arena that may be larger than the screen
// (S165). Pure and headless so the follow rule is unit-testable and so the
// deterministic `stepSim` kernel can carry a camera without a canvas.
//
// Coordinate contract:
//   * Simulation state (`gs.player`, `gs.enemies`, decals, the flood ring …)
//     is always in ARENA coordinates.
//   * The canvas is VIEWPORT sized. `drawGame` translates by `-cam.x, -cam.y`
//     once, so every existing world-space draw call keeps working unchanged.
//   * Screen-space overlays (HUD, scope, radar) are painted after that
//     transform is restored and never see the camera.
//
// When the arena equals the viewport — every mode that shipped before S165 —
// the camera clamps to (0, 0) and every conversion is the identity, so those
// modes are byte-identical.

// Fraction of the viewport the player may drift across before the camera
// starts moving. A dead zone keeps small strafes from swimming the whole world.
const DEADZONE_X = 0.22;
const DEADZONE_Y = 0.22;
// Per-frame catch-up fraction. Fast enough to keep a sprinting player framed,
// slow enough that the arena does not snap when the player dashes.
const FOLLOW_LERP = 0.12;

export function createCamera({ arenaW = 0, arenaH = 0, viewW = 0, viewH = 0 } = {}) {
  return {
    x: 0,
    y: 0,
    arenaW: Math.max(0, arenaW) || viewW,
    arenaH: Math.max(0, arenaH) || viewH,
  };
}

/** True when the arena is bigger than the screen in either axis. */
export function isCameraActive(cam, viewW, viewH) {
  if (!cam) return false;
  return (cam.arenaW || 0) > viewW + 0.5 || (cam.arenaH || 0) > viewH + 0.5;
}

export function clampCamera(cam, viewW, viewH) {
  if (!cam) return cam;
  const maxX = Math.max(0, (cam.arenaW || viewW) - viewW);
  const maxY = Math.max(0, (cam.arenaH || viewH) - viewH);
  cam.x = Math.min(maxX, Math.max(0, cam.x || 0));
  cam.y = Math.min(maxY, Math.max(0, cam.y || 0));
  return cam;
}

/**
 * Advance the camera one frame toward the target, honouring the dead zone and
 * the arena clamp. Returns the same camera object (mutated in place, like the
 * rest of the per-frame systems).
 */
export function updateCamera(cam, target, { viewW, viewH, snap = false, lerp = FOLLOW_LERP } = {}) {
  if (!cam || !target) return cam;
  if (!isCameraActive(cam, viewW, viewH)) {
    cam.x = 0;
    cam.y = 0;
    return cam;
  }
  const desiredX = target.x - viewW / 2;
  const desiredY = target.y - viewH / 2;
  if (snap) {
    cam.x = desiredX;
    cam.y = desiredY;
    return clampCamera(cam, viewW, viewH);
  }
  const slackX = (viewW * DEADZONE_X) / 2;
  const slackY = (viewH * DEADZONE_Y) / 2;
  const dx = desiredX - cam.x;
  const dy = desiredY - cam.y;
  if (Math.abs(dx) > slackX) cam.x += (dx - Math.sign(dx) * slackX) * lerp;
  if (Math.abs(dy) > slackY) cam.y += (dy - Math.sign(dy) * slackY) * lerp;
  return clampCamera(cam, viewW, viewH);
}

export function worldToScreen(cam, wx, wy) {
  return { x: wx - (cam?.x || 0), y: wy - (cam?.y || 0) };
}

export function screenToWorld(cam, sx, sy) {
  return { x: sx + (cam?.x || 0), y: sy + (cam?.y || 0) };
}

/** Centre of the visible viewport, in arena coordinates. */
export function viewCenter(cam, viewW, viewH) {
  return { x: (cam?.x || 0) + viewW / 2, y: (cam?.y || 0) + viewH / 2 };
}

/**
 * Resolve the arena size for a mode. `scale` multiplies the viewport; the
 * arena never shrinks below the viewport, so a mode can only ever ask for
 * more world, never for a letterbox.
 */
export function resolveArenaSize(modeDef, viewW, viewH) {
  const scale = Number(modeDef?.arena?.scale);
  const factor = Number.isFinite(scale) && scale > 1 ? Math.min(4, scale) : 1;
  return { arenaW: Math.round(viewW * factor), arenaH: Math.round(viewH * factor) };
}

/**
 * One runtime authority for systems that need world bounds after a run starts.
 * Falling back to the viewport preserves the exact pre-scrolling contract and
 * keeps partially initialized/test states safe.
 */
export function resolveArenaBounds(state, viewW, viewH) {
  const arenaW = Number(state?.arenaW);
  const arenaH = Number(state?.arenaH);
  return {
    W: Number.isFinite(arenaW) && arenaW >= viewW ? arenaW : viewW,
    H: Number.isFinite(arenaH) && arenaH >= viewH ? arenaH : viewH,
  };
}
