export const OPERATION_PROXIMITY_SCHEMA = "operation-proximity-v1";

const MAX_DISTANCE_PX = 9999;
const MAX_RADIUS_PX = 512;
const PLAYER_COLLISION_RADIUS_PX = 16;
const DIRECTIONS = Object.freeze([
  "EAST", "SOUTH-EAST", "SOUTH", "SOUTH-WEST",
  "WEST", "NORTH-WEST", "NORTH", "NORTH-EAST",
]);

function finiteNumber(value) {
  if (value == null || value === "" || typeof value === "boolean") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function boundedText(value, max = 32) {
  return String(value ?? "").replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, max) || null;
}

function boundedPixels(value) {
  return Math.max(0, Math.min(MAX_DISTANCE_PX, Math.round(Number(value) || 0)));
}

function directionFromDelta(dx, dy, distance) {
  if (distance < 0.5) return "HERE";
  const octant = Math.round(Math.atan2(dy, dx) / (Math.PI / 4));
  return DIRECTIONS[(octant + 8) % 8];
}

function unavailableSnapshot(target, reasonCode) {
  return Object.freeze({
    schemaVersion: OPERATION_PROXIMITY_SCHEMA,
    targetId: boundedText(target?.id),
    targetKind: boundedText(target?.kind),
    available: false,
    inRange: false,
    centerDistancePx: null,
    distanceToRangePx: null,
    interactionRadiusPx: null,
    direction: "UNKNOWN",
    reasonCode,
  });
}

/**
 * Produces a renderer-neutral, bounded proximity receipt for one interaction.
 * Missing or malformed player/target geometry always fails closed.
 */
export function buildOperationProximitySnapshot({ player, target } = {}) {
  if (!target?.id) return unavailableSnapshot(target, "TARGET_UNAVAILABLE");
  const playerX = finiteNumber(player?.x);
  const playerY = finiteNumber(player?.y);
  const targetX = finiteNumber(target?.position?.x);
  const targetY = finiteNumber(target?.position?.y);
  const radius = finiteNumber(target?.interactionRadius);
  if ([playerX, playerY, targetX, targetY, radius].some((value) => value == null) || radius <= 0) {
    return unavailableSnapshot(target, "PROXIMITY_GEOMETRY_INVALID");
  }

  const dx = targetX - playerX;
  const dy = targetY - playerY;
  const centerDistance = Math.hypot(dx, dy);
  // Runtime movement keeps the player's 16px body outside solid geometry.
  // Measure interaction edge-to-edge so wall-mounted targets remain reachable.
  const effectiveRadius = Math.min(MAX_RADIUS_PX, radius + PLAYER_COLLISION_RADIUS_PX);
  const inRange = centerDistance <= effectiveRadius;
  return Object.freeze({
    schemaVersion: OPERATION_PROXIMITY_SCHEMA,
    targetId: boundedText(target.id),
    targetKind: boundedText(target.kind),
    available: true,
    inRange,
    centerDistancePx: boundedPixels(centerDistance),
    distanceToRangePx: boundedPixels(Math.max(0, centerDistance - effectiveRadius)),
    interactionRadiusPx: Math.max(1, Math.round(effectiveRadius)),
    direction: directionFromDelta(dx, dy, centerDistance),
    reasonCode: inRange ? "TARGET_IN_RANGE" : "TARGET_OUT_OF_RANGE",
  });
}

export function operationProximitySnapshotsEqual(left, right) {
  if (left === right) return true;
  if (!left || !right) return false;
  return left.schemaVersion === right.schemaVersion
    && left.targetId === right.targetId
    && left.targetKind === right.targetKind
    && left.available === right.available
    && left.inRange === right.inRange
    && left.centerDistancePx === right.centerDistancePx
    && left.distanceToRangePx === right.distanceToRangePx
    && left.interactionRadiusPx === right.interactionRadiusPx
    && left.direction === right.direction
    && left.reasonCode === right.reasonCode;
}
