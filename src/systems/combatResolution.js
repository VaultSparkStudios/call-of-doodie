// combatResolution.js — pure helpers for bullet/enemy collision math.
//
// SCAFFOLD as of Session 57: only the helpers actually needed by Hot Zones (#1)
// and replay validation (#5) live here. The full bullet-vs-enemy resolution
// path remains in App.jsx; extracting it safely is a multi-session refactor
// because it's tangled with React refs, addParticles, and analytics events.
//
// Future sessions should migrate:
//   - bullet-vs-enemy hit detection
//   - lightning chain target selection
//   - pierce / bounce decrement
//   - crit roll
// Each migration must keep deterministic seed behavior intact (replay validation
// resimulates from the seed and expects byte-identical scores).

/**
 * Returns true if the point (px, py) is inside the axis-aligned circle
 * defined by (cx, cy, r). Used by Hot Zones, sniper windows, lockdown radii.
 */
export function pointInCircle(px, py, cx, cy, r) {
  const dx = px - cx, dy = py - cy;
  return (dx * dx + dy * dy) <= r * r;
}

/**
 * Returns the squared distance between two points (avoids the sqrt in tight
 * inner loops; safe to compare with radius * radius).
 */
export function dist2(ax, ay, bx, by) {
  const dx = ax - bx, dy = ay - by;
  return dx * dx + dy * dy;
}
