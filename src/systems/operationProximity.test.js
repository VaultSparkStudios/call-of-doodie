import { describe, expect, it } from "vitest";
import { buildOperationProximitySnapshot, operationProximitySnapshotsEqual } from "./operationProximity.js";

const target = {
  id: "door-north",
  kind: "door",
  position: { x: 480, y: 64 },
  interactionRadius: 24,
};

describe("Operation interaction proximity", () => {
  it("accepts the radius boundary and reports a bounded direction receipt", () => {
    expect(buildOperationProximitySnapshot({ player: { x: 456, y: 64 }, target })).toMatchObject({
      targetId: "door-north",
      available: true,
      inRange: true,
      centerDistancePx: 24,
      distanceToRangePx: 0,
      interactionRadiusPx: 40,
      direction: "EAST",
      reasonCode: "TARGET_IN_RANGE",
    });
  });

  it("fails closed outside the radius and for malformed geometry", () => {
    expect(buildOperationProximitySnapshot({ player: { x: 480, y: 200 }, target })).toMatchObject({
      inRange: false,
      centerDistancePx: 136,
      distanceToRangePx: 96,
      direction: "NORTH",
      reasonCode: "TARGET_OUT_OF_RANGE",
    });
    expect(buildOperationProximitySnapshot({ player: { x: Number.NaN, y: 64 }, target })).toMatchObject({
      available: false,
      inRange: false,
      direction: "UNKNOWN",
      reasonCode: "PROXIMITY_GEOMETRY_INVALID",
    });
  });

  it("includes the runtime player body radius so wall-mounted targets stay reachable", () => {
    expect(buildOperationProximitySnapshot({ player: { x: 440, y: 64 }, target })).toMatchObject({
      inRange: true,
      centerDistancePx: 40,
      interactionRadiusPx: 40,
      distanceToRangePx: 0,
    });
  });

  it("bounds exported distance and compares only public snapshot fields", () => {
    const first = buildOperationProximitySnapshot({ player: { x: -100000, y: -100000 }, target });
    const second = buildOperationProximitySnapshot({ player: { x: -100000, y: -100000 }, target });
    expect(first.centerDistancePx).toBe(9999);
    expect(first.distanceToRangePx).toBe(9999);
    expect(operationProximitySnapshotsEqual(first, second)).toBe(true);
    expect(operationProximitySnapshotsEqual(first, { ...second, inRange: true })).toBe(false);
  });
});
