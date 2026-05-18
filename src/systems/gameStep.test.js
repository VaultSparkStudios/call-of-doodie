import { describe, it, expect } from "vitest";
import { computeMovementVector, applyPlayerMovement } from "./gameStep.js";

describe("computeMovementVector", () => {
  it("returns zero vector when no input", () => {
    const { dx, dy } = computeMovementVector({}, { active: false, dx: 0, dy: 0 });
    expect(dx).toBe(0);
    expect(dy).toBe(0);
  });

  it("normalizes diagonal movement to length 1", () => {
    const { dx, dy } = computeMovementVector({ w: true, d: true });
    expect(Math.hypot(dx, dy)).toBeCloseTo(1, 5);
    expect(dx).toBeGreaterThan(0);
    expect(dy).toBeLessThan(0);
  });

  it("handles cardinal movement (up only)", () => {
    const { dx, dy } = computeMovementVector({ arrowup: true });
    expect(dx).toBe(0);
    expect(dy).toBe(-1);
  });

  it("applies joystick input when active", () => {
    const { dx, dy } = computeMovementVector({}, { active: true, dx: 50, dy: 0 });
    expect(dx).toBeGreaterThan(0);
    expect(dy).toBe(0);
  });

  it("ignores joystick with dist <= 5", () => {
    const { dx, dy } = computeMovementVector({}, { active: true, dx: 3, dy: 0 });
    expect(dx).toBe(0);
    expect(dy).toBe(0);
  });
});

describe("applyPlayerMovement", () => {
  it("moves player in the correct direction", () => {
    const player = { x: 100, y: 100, speed: 5 };
    applyPlayerMovement(player, { dx: 1, dy: 0 }, { W: 800, H: 600 });
    expect(player.x).toBeCloseTo(105, 5);
    expect(player.y).toBe(100);
  });

  it("skips movement when dashActive", () => {
    const player = { x: 100, y: 100, speed: 5 };
    applyPlayerMovement(player, { dx: 1, dy: 0 }, { dashActive: true, W: 800, H: 600 });
    expect(player.x).toBe(100);
  });

  it("applies adrenaline rush speed multiplier (2×)", () => {
    const player = { x: 100, y: 100, speed: 5 };
    applyPlayerMovement(player, { dx: 1, dy: 0 }, { adrenalineRushTimer: 30, W: 800, H: 600 });
    expect(player.x).toBeCloseTo(110, 5);
  });

  it("applies rubble slow multiplier (0.6×)", () => {
    const player = { x: 100, y: 100, speed: 5 };
    applyPlayerMovement(player, { dx: 1, dy: 0 }, { rubbleSlowed: true, W: 800, H: 600 });
    expect(player.x).toBeCloseTo(103, 5);
  });

  it("clamps player within canvas bounds", () => {
    const player = { x: 799, y: 100, speed: 5 };
    applyPlayerMovement(player, { dx: 1, dy: 0 }, { W: 800, H: 600 });
    expect(player.x).toBe(780); // W - 20
  });

  it("pushes player out of obstacles", () => {
    const player = { x: 50, y: 50, speed: 0 };
    const obstacles = [{ x: 35, y: 35, w: 30, h: 30 }];
    applyPlayerMovement(player, { dx: 0, dy: 0 }, { W: 800, H: 600, obstacles });
    // Player should be pushed away from obstacle center (50, 50)
    const dist = Math.hypot(player.x - 50, player.y - 50);
    expect(dist).toBeGreaterThanOrEqual(16); // pushed to at least 17px from nearest obstacle edge
  });
});
