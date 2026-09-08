import { describe, expect, it } from "vitest";
import { buildRadarObjectiveMarkers, projectRadarPoint } from "./radarModel.js";

describe("projectRadarPoint", () => {
  it("preserves the player-relative viewport projection", () => {
    expect(projectRadarPoint({ x: 640, y: 360, wholeArena: false, playerX: 640, playerY: 360, viewW: 1280, viewH: 720, radius: 45 })).toEqual({ dx: 0, dy: 0 });
  });

  it("fits all four scaled-arena corners inside the round radar", () => {
    const base = { wholeArena: true, arenaW: 1920, arenaH: 1080, playerX: 960, playerY: 540, viewW: 1280, viewH: 720, radius: 45 };
    for (const [x, y] of [[0, 0], [1920, 0], [0, 1080], [1920, 1080]]) {
      const point = projectRadarPoint({ ...base, x, y });
      expect(Math.hypot(point.dx, point.dy)).toBeLessThanOrEqual(45.001);
    }
  });
});

describe("buildRadarObjectiveMarkers", () => {
  const state = {
    structures: [{ id: "evac-toilet", kind: "exit", alive: true, x: 1700, y: 900 }],
    pickups: Array.from({ length: 12 }, (_, index) => ({ type: "loot", x: 100 + index * 20, y: 200 + index * 10 })),
  };

  it("keeps legacy player-relative radar free of objective markers", () => {
    expect(buildRadarObjectiveMarkers(state, { wholeArena: false })).toEqual([]);
  });

  it("prioritizes evac and bounds the loot marker count", () => {
    const markers = buildRadarObjectiveMarkers(state, { wholeArena: true, limit: 5 });
    expect(markers).toHaveLength(5);
    expect(markers[0]).toEqual({ id: "evac-toilet", kind: "evac", x: 1700, y: 900 });
    expect(markers.slice(1).every((marker) => marker.kind === "loot")).toBe(true);
  });

  it("drops dead exits and malformed loot coordinates", () => {
    const markers = buildRadarObjectiveMarkers({
      structures: [{ kind: "exit", alive: false, x: 1, y: 1 }],
      pickups: [{ type: "loot", x: Number.NaN, y: 4 }, { type: "health", x: 4, y: 4 }],
    }, { wholeArena: true });
    expect(markers).toEqual([]);
  });
});

