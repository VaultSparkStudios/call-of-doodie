import { describe, it, expect } from "vitest";
import { isOffscreen, projectToEdge, getOffscreenThreatArrows } from "./offscreenIndicators.js";

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

  it("produces one arrow per offscreen enemy with priority styling for bosses", () => {
    const arrows = getOffscreenThreatArrows([
      { x: -50, y: 300, isBossEnemy: true },
      { x: 850, y: 300 },
    ], W, H);
    expect(arrows).toHaveLength(2);
    expect(arrows[0].color).toBe("#FF4D4D");
    expect(arrows[0].alpha).toBeGreaterThan(arrows[1].alpha);
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
});
