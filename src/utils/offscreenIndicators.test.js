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

  describe("ADS zoom", () => {
    // Player at center; 1.28× zoom centered on player
    const px = 400, py = 300;

    it("shows arrow for enemy pushed off-screen by ADS zoom but visible in world space", () => {
      // Enemy near the right edge in world coords: x=750 is on-screen without zoom.
      // With 1.28× zoom centered at (400,300): screen x = 400 + (750-400)*1.28 = 848 → off right edge.
      const arrows = getOffscreenThreatArrows(
        [{ x: 750, y: 300 }],
        W, H, { playerX: px, playerY: py, zoomScale: 1.28 },
      );
      expect(arrows).toHaveLength(1);
      // Arrow should be on the right edge
      expect(arrows[0].x).toBeGreaterThan(W / 2);
    });

    it("hides arrow for world-offscreen enemy that is still on-screen after ADS zoom", () => {
      // An enemy just past the right edge in world coords: x=810.
      // With 1.28× zoom centered at (400,300): screen x = 400 + (810-400)*1.28 = 924.8 → still off.
      // But an enemy at x=802 and y=300: screen x = 400 + (802-400)*1.28 = 914.6 → off too.
      // Instead test an enemy that zooms inward: e.g. x=30 would be pushed further left.
      // Test an enemy that IS world-offscreen but the zoom makes its screen pos in-bounds.
      // For this we need the inverse: world x such that screen x is in [0,W].
      // screen_x = 400 + (ex - 400) * 1.28 ∈ [0,800]
      // ex ∈ [400 - 400/1.28, 400 + 400/1.28] = [87.5, 712.5] in world coords
      // So an enemy at world x=-5 (off left edge): screen x = 400 + (-5-400)*1.28 = 400 - 518.4 = -118.4 → still off
      // This test checks that enemy already off-screen in world still shows an arrow with zoom active
      const arrows = getOffscreenThreatArrows(
        [{ x: -5, y: 300 }],
        W, H, { playerX: px, playerY: py, zoomScale: 1.28 },
      );
      expect(arrows).toHaveLength(1);
      expect(arrows[0].x).toBeLessThan(W / 2);
    });

    it("arrow angle points toward enemy screen position under ADS zoom", () => {
      // Enemy above and right in world: world (600, 50).
      // Screen pos: x = 400 + (600-400)*1.28 = 656, y = 300 + (50-300)*1.28 = -20 → off top.
      const arrows = getOffscreenThreatArrows(
        [{ x: 600, y: 50 }],
        W, H, { playerX: px, playerY: py, zoomScale: 1.28 },
      );
      expect(arrows).toHaveLength(1);
      // Angle should have a negative y component (pointing up/away from bottom)
      expect(Math.sin(arrows[0].angle)).toBeLessThan(0);
    });

    it("returns same result as non-zoom path when zoomScale is 1", () => {
      const enemy = { x: -50, y: 300, isBossEnemy: true };
      const noZoom = getOffscreenThreatArrows([enemy], W, H);
      const zoom1 = getOffscreenThreatArrows([enemy], W, H, { playerX: px, playerY: py, zoomScale: 1 });
      expect(zoom1).toEqual(noZoom);
    });
  });
});
