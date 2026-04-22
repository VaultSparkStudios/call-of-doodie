import { describe, expect, test } from "vitest";
import { spawnPickup, getPickupWeights } from "./pickupSpawning.js";

function makeGs(overrides = {}) {
  return { pickups: [], ...overrides };
}

describe("spawnPickup", () => {
  test("pushes exactly one pickup onto gs.pickups", () => {
    const gs = makeGs();
    spawnPickup(gs, 100, 200, false);
    expect(gs.pickups).toHaveLength(1);
  });

  test("pickup has correct coordinates and lifetime", () => {
    const gs = makeGs();
    spawnPickup(gs, 55, 77, false);
    expect(gs.pickups[0].x).toBe(55);
    expect(gs.pickups[0].y).toBe(77);
    expect(gs.pickups[0].life).toBe(450);
  });

  test("pickup type is always one of the valid 9 types", () => {
    const valid = new Set(["health","ammo","speed","nuke","upgrade","rage","magnet","freeze","time_dilation"]);
    for (let i = 0; i < 50; i++) {
      const gs = makeGs();
      spawnPickup(gs, 0, 0, false);
      expect(valid.has(gs.pickups[0].type)).toBe(true);
    }
  });

  test("never drops health in vampire mode", () => {
    // Run 100 times — vampire mode health weight is 0
    for (let i = 0; i < 100; i++) {
      const g = makeGs({ vampireMode: true });
      spawnPickup(g, 0, 0, false);
      expect(g.pickups[0].type).not.toBe("health");
    }
  });

  test("ammo drop weight is capped at 0.70 even with large ammoDropMult", () => {
    const weights = getPickupWeights(false, { ammoDropMult: 100 });
    expect(weights.ammo).toBeLessThanOrEqual(0.70);
  });

  test("armory run increases upgrade drop weight", () => {
    const normal = getPickupWeights(false, { armoryRun: false });
    const armory = getPickupWeights(false, { armoryRun: true });
    expect(armory.upgrade).toBeGreaterThan(normal.upgrade);
  });

  test("boss kills have higher upgrade weight than normal kills", () => {
    const normal = getPickupWeights(false);
    const boss   = getPickupWeights(true);
    expect(boss.upgrade).toBeGreaterThan(normal.upgrade);
  });

  test("multiple calls accumulate on the pickups array", () => {
    const gs = makeGs();
    spawnPickup(gs, 10, 10, false);
    spawnPickup(gs, 20, 20, true);
    spawnPickup(gs, 30, 30, false);
    expect(gs.pickups).toHaveLength(3);
  });
});

describe("getPickupWeights", () => {
  test("returns an object with all 9 pickup type keys", () => {
    const w = getPickupWeights(false);
    const expected = ["health","ammo","speed","nuke","upgrade","rage","magnet","freeze","time_dilation"];
    for (const key of expected) expect(w).toHaveProperty(key);
  });

  test("all weights are non-negative numbers", () => {
    for (const isBoss of [false, true]) {
      const w = getPickupWeights(isBoss);
      for (const v of Object.values(w)) {
        expect(typeof v).toBe("number");
        expect(v).toBeGreaterThanOrEqual(0);
      }
    }
  });

  test("health weight is 0 in vampire mode", () => {
    const w = getPickupWeights(false, { vampireMode: true });
    expect(w.health).toBe(0);
  });
});
