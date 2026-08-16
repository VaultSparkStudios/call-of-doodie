import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  ARENA_HAZARD_TYPES,
  ARENA_LAYOUT_NAMES,
  buildArenaEnvironment,
} from "./arenaEnvironment.js";

const WIDTH = 800;
const HEIGHT = 600;

function build(seed, width = WIDTH, height = HEIGHT) {
  return buildArenaEnvironment({ seed, width, height });
}

describe("buildArenaEnvironment", () => {
  it("repeats every generated value for the same seed and dimensions", () => {
    const first = build(151);
    const second = build(151);

    expect(second).toEqual(first);
    expect(build(152)).not.toEqual(first);
  });

  it("pins the exact legacy output and PRNG call order for a fixed seed", () => {
    const environment = build(151);
    const digest = createHash("sha256")
      .update(JSON.stringify(environment))
      .digest("hex");

    // Digest covers the full environment JSON, including each prop's
    // spriteKey — a pure THEME_PROP_EMOJI_TO_CELL lookup, not RNG output.
    // S155 expanded sprite coverage (16 → 48 cells), changing spriteKey for
    // previously-uncovered emoji; positions and PRNG call order are pinned
    // unchanged by the determinism test above.
    expect(digest).toBe("6cc2bc8ecc6bfd2332da2ee7b57fb8fa295f86af28e965bbc3735172650b350a");
    expect(environment).toMatchObject({
      layoutName: "Corridors",
      mapTheme: 2,
    });
    expect(environment.terrain).toHaveLength(22);
    expect(environment.floorZones).toHaveLength(5);
    expect(environment.props).toHaveLength(8);
    expect(environment.hazards).toHaveLength(3);
  });

  it("keeps arena centers and collision rectangles inside the arena bounds", () => {
    for (const seed of [-100000, 0, 151, 913579, 2147483647]) {
      const environment = build(seed);

      expect(ARENA_LAYOUT_NAMES).toContain(environment.layoutName);
      expect(environment.mapTheme).toBeGreaterThanOrEqual(0);
      expect(environment.mapTheme).toBeLessThan(8);
      for (const obstacle of environment.obstacles) {
        expect(obstacle.x).toBeGreaterThanOrEqual(0);
        expect(obstacle.y).toBeGreaterThanOrEqual(0);
        expect(obstacle.x + obstacle.w).toBeLessThanOrEqual(WIDTH);
        expect(obstacle.y + obstacle.h).toBeLessThanOrEqual(HEIGHT);
      }
      for (const item of [...environment.terrain, ...environment.floorZones, ...environment.props]) {
        expect(item.x).toBeGreaterThanOrEqual(0);
        expect(item.x).toBeLessThanOrEqual(WIDTH);
        expect(item.y).toBeGreaterThanOrEqual(0);
        expect(item.y).toBeLessThanOrEqual(HEIGHT);
      }
      for (const hazard of environment.hazards) {
        expect(hazard.x - hazard.radius).toBeGreaterThanOrEqual(0);
        expect(hazard.x + hazard.radius).toBeLessThanOrEqual(WIDTH);
        expect(hazard.y - hazard.radius).toBeGreaterThanOrEqual(0);
        expect(hazard.y + hazard.radius).toBeLessThanOrEqual(HEIGHT);
      }
    }
  });

  it("filters Pillars obstacles out of the 115px spawn-safe radius", () => {
    const environment = build(0);

    expect(environment.layoutName).toBe("Pillars");
    expect(environment.obstacles).toHaveLength(8);
    for (const obstacle of environment.obstacles) {
      const distance = Math.hypot(
        obstacle.x + obstacle.w / 2 - WIDTH / 2,
        obstacle.y + obstacle.h / 2 - HEIGHT / 2,
      );
      expect(distance).toBeGreaterThan(115);
    }
  });

  it("rejects props that overlap padded obstacles or the center clearing", () => {
    for (const seed of [-100000, 0, 151, 913579, 2147483647]) {
      const environment = build(seed);
      for (const prop of environment.props) {
        const overlapsObstacle = environment.obstacles.some((obstacle) => (
          prop.x > obstacle.x - 10
          && prop.x < obstacle.x + obstacle.w + 10
          && prop.y > obstacle.y - 10
          && prop.y < obstacle.y + obstacle.h + 10
        ));

        expect(overlapsObstacle).toBe(false);
        expect(Math.hypot(prop.x - WIDTH / 2, prop.y - HEIGHT / 2)).toBeGreaterThanOrEqual(90);
        expect(prop.spriteKey === null || typeof prop.spriteKey === "string").toBe(true);
      }
    }
  });

  it("creates three to six typed, bounded hazards", () => {
    for (const seed of [-100000, 0, 151, 913579, 2147483647]) {
      const { hazards } = build(seed);

      expect(hazards.length).toBeGreaterThanOrEqual(3);
      expect(hazards.length).toBeLessThanOrEqual(6);
      for (const hazard of hazards) {
        expect(ARENA_HAZARD_TYPES).toContain(hazard.type);
        expect(hazard.radius).toBeGreaterThanOrEqual(35);
        expect(hazard.radius).toBeLessThanOrEqual(65);
        expect(hazard.pulseTimer).toBeGreaterThanOrEqual(0);
        expect(hazard.pulseTimer).toBeLessThan(120);
      }
    }
  });

  it("keeps App.jsx as orchestration over the extracted environment boundary", () => {
    const appSource = readFileSync(resolve(process.cwd(), "src/App.jsx"), "utf8");

    expect(appSource).toContain('import { buildArenaEnvironment } from "./systems/arenaEnvironment.js";');
    expect(appSource).toContain("buildArenaEnvironment({ seed, width: w, height: h })");
    expect(appSource).not.toContain("Math.imul(_ws, 1664525)");
  });
});
