// zones — capturable control points (S163).
//
// Used by HOLD THE THRONE and by the HOLD objective verb. A zone is a circle
// the player (or an ally) must occupy. Enemies inside with no friendly unit
// contest it and raise pressure; pressure at 100 flips the zone to lost.
// Pure functions over `gs.zones`; deterministic (no RNG needed).

export const ZONE_STATE = Object.freeze({ IDLE: "idle", HELD: "held", CONTESTED: "contested", CAPTURED: "captured", LOST: "lost" });

export function createZone({ id, x, y, radius = 110, captureFrames = 30 * 60, label = "THRONE" } = {}) {
  return {
    id: id || `zone-${Math.round(x)}-${Math.round(y)}`,
    x, y, radius, label,
    captureFrames,
    progress: 0,          // frames held
    pressure: 0,          // 0..100 enemy pressure while contested
    state: ZONE_STATE.IDLE,
    active: true,
    friendlyInside: 0,
    enemyInside: 0,
  };
}

function inside(unit, zone) {
  return Math.hypot(unit.x - zone.x, unit.y - zone.y) <= zone.radius;
}

/**
 * Advance every active zone one frame. Returns events for the host
 * ({ type: "captured"|"lost"|"contested"|"held", zone }).
 */
export function stepZones(gs) {
  const zones = gs.zones;
  const events = [];
  if (!Array.isArray(zones) || zones.length === 0) return events;
  const p = gs.player;
  const allies = (gs.allies || []).filter((a) => a && !a.downed && !a.untargetable);
  const enemies = (gs.enemies || []).filter((e) => e && !e._defeatResolved);
  const targetables = [];
  for (const z of zones) {
    if (!z.active || z.state === ZONE_STATE.CAPTURED || z.state === ZONE_STATE.LOST) continue;
    z.friendlyInside = (p && inside(p, z) ? 1 : 0) + allies.filter((a) => inside(a, z)).length;
    z.enemyInside = enemies.filter((e) => inside(e, z)).length;
    const prev = z.state;
    if (z.friendlyInside > 0 && z.enemyInside === 0) {
      z.state = ZONE_STATE.HELD;
      z.progress += 1;
      z.pressure = Math.max(0, z.pressure - 0.5);
    } else if (z.friendlyInside > 0 && z.enemyInside > 0) {
      z.state = ZONE_STATE.CONTESTED;
      z.pressure = Math.min(100, z.pressure + 0.15 * z.enemyInside);
    } else if (z.enemyInside > 0) {
      z.state = ZONE_STATE.CONTESTED;
      z.pressure = Math.min(100, z.pressure + 0.35 * z.enemyInside);
      z.progress = Math.max(0, z.progress - 2);
    } else {
      z.state = ZONE_STATE.IDLE;
      z.pressure = Math.max(0, z.pressure - 0.25);
      z.progress = Math.max(0, z.progress - 1);
    }
    if (z.progress >= z.captureFrames) {
      z.state = ZONE_STATE.CAPTURED;
      z.progress = z.captureFrames;
      events.push({ type: "captured", zone: z });
    } else if (z.pressure >= 100) {
      z.state = ZONE_STATE.LOST;
      events.push({ type: "lost", zone: z });
    } else if (prev !== z.state) {
      events.push({ type: z.state, zone: z });
    }
    // Enemies path toward an uncaptured zone when nobody is holding it.
    if (z.state !== ZONE_STATE.CAPTURED) targetables.push({ x: z.x, y: z.y, alive: true, kind: "zone", id: z.id });
  }
  gs._targetables = targetables;
  return events;
}

export function getActiveZone(gs) {
  return (gs.zones || []).find((z) => z.active && z.state !== ZONE_STATE.CAPTURED && z.state !== ZONE_STATE.LOST) || null;
}

export function summarizeZones(gs) {
  return (gs.zones || []).map((z) => ({
    id: z.id,
    label: z.label,
    state: z.state,
    progressPct: z.captureFrames ? Math.min(1, z.progress / z.captureFrames) : 0,
    pressurePct: z.pressure / 100,
    x: z.x, y: z.y, radius: z.radius,
    active: z.active,
  }));
}

/** Three throne positions well away from the spawn-safe centre. */
export function throneLayout(W, H) {
  return [
    { id: "throne-west", x: W * 0.22, y: H * 0.5, label: "WEST THRONE" },
    { id: "throne-north", x: W * 0.5, y: H * 0.2, label: "NORTH THRONE" },
    { id: "throne-east", x: W * 0.78, y: H * 0.5, label: "EAST THRONE" },
  ];
}
