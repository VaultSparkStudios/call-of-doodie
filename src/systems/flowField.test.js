import { describe, expect, it } from "vitest";
import { buildFlowField, sampleFlowField } from "./flowField.js";

describe("flowField", () => {
  it("points reachable cells toward the player", () => {
    const field = buildFlowField(120, 120, 24, 24, [], 24);
    const steering = sampleFlowField(field, 96, 24);
    expect(steering.sx).toBeLessThan(0);
    expect(Math.abs(steering.sy)).toBeLessThan(0.01);
  });

  it("routes around blocked obstacle cells", () => {
    const field = buildFlowField(144, 96, 24, 48, [{ x: 48, y: 24, w: 48, h: 48 }], 24);
    const steering = sampleFlowField(field, 120, 48);
    expect(steering).not.toBeNull();
    expect(Math.abs(steering.sy)).toBeGreaterThan(0);
  });

  it("returns null for unreachable blocked islands so callers can use direct chase fallback", () => {
    const field = buildFlowField(96, 96, 12, 12, [{ x: 24, y: 0, w: 72, h: 96 }], 24);
    expect(sampleFlowField(field, 72, 48)).toBeNull();
  });
});
