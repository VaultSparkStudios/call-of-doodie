import { describe, it, expect } from "vitest";
import {
  drawOffscreenThreatArrows,
  getOffscreenThreatArrows,
  isOffscreen,
  projectToEdge,
  worldToThreatScreenPoint,
} from "./offscreenIndicators.js";

describe("isOffscreen", () => {
  it("treats points inside the viewport as onscreen", () => {
    expect(isOffscreen(400, 300, 800, 600)).toBe(false);
    expect(isOffscreen(0, 0, 800, 600)).toBe(false);
    expect(isOffscreen(800, 600, 800, 600)).toBe(false);
  });

  it("treats points past any edge as offscreen", () => {
    expect(isOffscreen(-30, 300, 800, 600)).toBe(true);
    expect(isOffscreen(830, 300, 800, 600)).toBe(true);
    expect(isOffscreen(400, -30, 800, 600)).toBe(true);
    expect(isOffscreen(400, 630, 800, 600)).toBe(true);
  });
});

describe("projectToEdge", () => {
  it("projects a point directly left of center onto the left inset edge", () => {
    const edge = projectToEdge(-100, 300, 800, 600, 18);
    expect(edge.x).toBeCloseTo(18, 5); // margin from x=0
    expect(edge.y).toBeCloseTo(300, 5);
    expect(edge.angle).toBeCloseTo(Math.PI, 5);
  });

  it("projects a point directly above center onto the top inset edge", () => {
    const edge = projectToEdge(400, -100, 800, 600, 18);
    expect(edge.x).toBeCloseTo(400, 5);
    expect(edge.y).toBeCloseTo(18, 5);
    expect(edge.angle).toBeCloseTo(-Math.PI / 2, 5);
  });

  it("stays within the inset rectangle bounds for a diagonal point", () => {
    const edge = projectToEdge(-500, -500, 800, 600, 18);
    expect(edge.x).toBeGreaterThanOrEqual(18 - 0.01);
    expect(edge.y).toBeGreaterThanOrEqual(18 - 0.01);
    expect(edge.x).toBeLessThanOrEqual(800 - 18 + 0.01);
    expect(edge.y).toBeLessThanOrEqual(600 - 18 + 0.01);
  });

  it("projects from the live player rather than the viewport center", () => {
    const edge = projectToEdge(900, 500, 800, 600, 18, { originX: 100, originY: 100 });
    expect(edge.x).toBeCloseTo(782, 5);
    expect(edge.angle).toBeCloseTo(Math.atan2(400, 800), 5);
    expect(edge.y).toBeGreaterThan(400);
  });
});

describe("worldToThreatScreenPoint", () => {
  it("matches the aim-down-sights transform around the player focus", () => {
    expect(worldToThreatScreenPoint(700, 300, { focusX: 400, focusY: 300, zoom: 1.28 }))
      .toEqual({ x: 784, y: 300 });
  });
});

describe("getOffscreenThreatArrows", () => {
  const W = 800, H = 600;

  it("returns nothing when there are no enemies", () => {
    expect(getOffscreenThreatArrows([], W, H)).toEqual([]);
    expect(getOffscreenThreatArrows(null, W, H)).toEqual([]);
  });

  it("ignores onscreen enemies", () => {
    const arrows = getOffscreenThreatArrows([{ x: 400, y: 300 }], W, H);
    expect(arrows).toEqual([]);
  });

  it("preserves boss priority while grouping one occupied direction", () => {
    const arrows = getOffscreenThreatArrows([
      { x: -50, y: 300, isBossEnemy: true },
      { x: -80, y: 300 },
    ], W, H);
    expect(arrows).toHaveLength(1);
    expect(arrows[0].color).toBe("#FF4D4D");
    expect(arrows[0].priority).toBe(3);
    expect(arrows[0].count).toBe(2);
  });

  it("colors elite-type arrows distinctly from regular threats", () => {
    const arrows = getOffscreenThreatArrows([{ x: -50, y: 300, eliteType: "armored" }], W, H);
    expect(arrows[0].color).toBe("#FFD700");
    expect(arrows[0].alpha).toBeGreaterThan(0.5);
  });

  it("is fully suppressed during Fog of War", () => {
    const arrows = getOffscreenThreatArrows(
      [{ x: -50, y: 300, isBossEnemy: true }],
      W, H, { fogOfWar: true },
    );
    expect(arrows).toEqual([]);
  });

  it("uses zoomed screen coordinates to detect newly offscreen threats", () => {
    const unzoomed = getOffscreenThreatArrows([{ x: 730, y: 300 }], W, H, {
      focusX: 400,
      focusY: 300,
      zoom: 1,
    });
    const zoomed = getOffscreenThreatArrows([{ x: 730, y: 300 }], W, H, {
      focusX: 400,
      focusY: 300,
      zoom: 1.28,
    });
    expect(unzoomed).toEqual([]);
    expect(zoomed).toHaveLength(1);
    expect(zoomed[0].x).toBeCloseTo(782, 5);
  });

  it("bounds burst pressure to eight directional groups", () => {
    const enemies = Array.from({ length: 48 }, (_, index) => {
      const angle = (index / 48) * Math.PI * 2;
      return { x: 400 + Math.cos(angle) * 900, y: 300 + Math.sin(angle) * 900 };
    });
    const arrows = getOffscreenThreatArrows(enemies, W, H);
    expect(arrows.length).toBeLessThanOrEqual(8);
    expect(arrows.reduce((sum, arrow) => sum + arrow.count, 0)).toBe(48);
  });
});

describe("drawOffscreenThreatArrows", () => {
  it("draws a screen-space marker and a bounded group count", () => {
    const calls = [];
    const ctx = new Proxy({}, {
      get(target, key) {
        if (!(key in target)) target[key] = (...args) => calls.push([key, ...args]);
        return target[key];
      },
      set(target, key, value) {
        calls.push([key, value]);
        target[key] = value;
        return true;
      },
    });
    drawOffscreenThreatArrows(ctx, [{
      x: 782, y: 300, angle: 0, color: "#FF4D4D", alpha: 0.9, count: 12, priority: 3,
    }]);
    expect(calls).toContainEqual(["translate", 782, 300]);
    expect(calls).toContainEqual(["fillText", "9+", 767, 300.5]);
  });
});
