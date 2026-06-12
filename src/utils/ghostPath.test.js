import { describe, expect, it } from "vitest";
import { buildGhostDeathReadout, buildGhostKillerMarker } from "./ghostPath.js";

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

describe("ghost death readout", () => {
  it("classifies a nearly stationary final path as pinned", () => {
    const readout = buildGhostDeathReadout([
      { x: 100, y: 100 },
      { x: 102, y: 101 },
      { x: 103, y: 101 },
      { x: 104, y: 102, killedByType: 1 },
    ], enemies);

    expect(readout).toMatchObject({
      mood: "pinned",
      headline: "Pinned by Acid Spitter",
    });
  });

  it("classifies a long final path as sprinting", () => {
    const readout = buildGhostDeathReadout([
      { x: 10, y: 10 },
      { x: 80, y: 50 },
      { x: 160, y: 100 },
      { x: 245, y: 150, killedByType: 1 },
    ], enemies);

    expect(readout).toMatchObject({
      mood: "sprinting",
      headline: "Outrun by Acid Spitter",
    });
  });
});
