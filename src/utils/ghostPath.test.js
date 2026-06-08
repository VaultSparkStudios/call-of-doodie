import { describe, expect, it } from "vitest";
import { buildGhostKillerMarker } from "./ghostPath.js";

const enemies = [
  { name: "Basic", emoji: "b", color: "#fff" },
  { name: "Acid Spitter", emoji: "a", color: "#7CFF00" },
];

describe("ghost path killer marker", () => {
  it("returns null when no final killer exists", () => {
    expect(buildGhostKillerMarker([{ x: 10, y: 10 }], enemies)).toBeNull();
  });

  it("builds a bounded readable marker for the final killer", () => {
    const marker = buildGhostKillerMarker([
      { x: 100, y: 100 },
      { x: 250, y: 140 },
      { x: 300, y: 200, killedByType: 1 },
    ], enemies, { width: 280, height: 140 });

    expect(marker).toMatchObject({
      type: 1,
      emoji: "a",
      label: "Acid Spitter",
      color: "#7CFF00",
    });
    expect(marker.x).toBeGreaterThanOrEqual(14);
    expect(marker.x).toBeLessThanOrEqual(266);
    expect(marker.y).toBeGreaterThanOrEqual(16);
    expect(marker.y).toBeLessThanOrEqual(124);
  });
});
