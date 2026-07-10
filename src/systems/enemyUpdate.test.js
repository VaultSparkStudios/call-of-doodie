import { describe, it, expect } from "vitest";
import { computeEnemySteeringVector } from "./enemyUpdate.js";

const mkEnemy = (overrides = {}) => ({
  x: 200, y: 200, speed: 2, size: 20,
  typeIndex: 0, wobble: 0,
  buffed: false, chargeActive: false,
  ...overrides,
});

const player = { x: 400, y: 200 }; // directly east of default enemy

describe("computeEnemySteeringVector", () => {
  it("steers directly toward the player with no flow field", () => {
    const e = mkEnemy();
    const { sx, sy } = computeEnemySteeringVector(e, player, null, []);
    expect(sx).toBeCloseTo(1, 5);
    expect(sy).toBeCloseTo(0, 5);
  });

  it("returns a normalized steering vector (length ≈ 1) when not charging", () => {
    const e = mkEnemy();
    const p2 = { x: 350, y: 350 };
    const { sx, sy } = computeEnemySteeringVector(e, p2, null, []);
    expect(Math.hypot(sx, sy)).toBeCloseTo(1, 4);
  });

  it("uses the flow field vector when one is available", () => {
    const e = mkEnemy();
    // Fake flow field that steers north (dx=0, dy=-1)
    const fakeFF = {
      fdx: new Float32Array([0]),
      fdy: new Float32Array([-1]),
      cols: 1, rows: 1, cellSize: 800,
    };
    const { sx, sy } = computeEnemySteeringVector(e, player, fakeFF, []);
    expect(sx).toBeCloseTo(0, 4);
    expect(sy).toBeCloseTo(-1, 4);
  });

  it("falls back to direct vector when flow field cell is zero", () => {
    const e = mkEnemy();
    // Zero-vector flow field at every cell → sampleFlowField returns null
    const fakeFF = {
      fdx: new Float32Array([0]),
      fdy: new Float32Array([0]),
      cols: 1, rows: 1, cellSize: 800,
    };
    const { sx, sy } = computeEnemySteeringVector(e, player, fakeFF, []);
    // Falls back to direct angle (east)
    expect(sx).toBeCloseTo(1, 4);
    expect(sy).toBeCloseTo(0, 4);
  });

  it("applies freeze multiplier (0.35×) to buffedSpeed", () => {
    const e = mkEnemy({ speed: 2 });
    const { buffedSpeed } = computeEnemySteeringVector(e, player, null, [], { freezeTimer: 60 });
    expect(buffedSpeed).toBeCloseTo(2 * 0.35, 5);
  });

  it("applies time dilation multiplier (0.18×) to buffedSpeed", () => {
    const e = mkEnemy({ speed: 2 });
    const { buffedSpeed } = computeEnemySteeringVector(e, player, null, [], { timeDilationTimer: 30 });
    expect(buffedSpeed).toBeCloseTo(2 * 0.18, 5);
  });

  it("applies enrage level 1 multiplier (1.10×)", () => {
    const e = mkEnemy({ speed: 2 });
    const { buffedSpeed } = computeEnemySteeringVector(e, player, null, [], { chainEnrageLevel: 1 });
    expect(buffedSpeed).toBeCloseTo(2 * 1.10, 5);
  });

  it("applies enrage level 2 multiplier (1.20×)", () => {
    const e = mkEnemy({ speed: 2 });
    const { buffedSpeed } = computeEnemySteeringVector(e, player, null, [], { chainEnrageLevel: 2 });
    expect(buffedSpeed).toBeCloseTo(2 * 1.20, 5);
  });

  it("applies sergeant aura buffed multiplier (1.35×)", () => {
    const e = mkEnemy({ speed: 2, buffed: true });
    const { buffedSpeed } = computeEnemySteeringVector(e, player, null, [], {});
    expect(buffedSpeed).toBeCloseTo(2 * 1.35, 5);
  });

  it("applies enemySpeedMult global multiplier", () => {
    const e = mkEnemy({ speed: 2 });
    const { buffedSpeed } = computeEnemySteeringVector(e, player, null, [], { enemySpeedMult: 1.5 });
    expect(buffedSpeed).toBeCloseTo(2 * 1.5, 5);
  });

  it("compounds all active multipliers correctly", () => {
    const e = mkEnemy({ speed: 2, buffed: true });
    const { buffedSpeed } = computeEnemySteeringVector(e, player, null, [], {
      freezeTimer: 1,
      chainEnrageLevel: 2,
      enemySpeedMult: 2,
    });
    expect(buffedSpeed).toBeCloseTo(2 * 1.35 * 2 * 0.35 * 1.20, 5);
  });

  it("repulses from a nearby wall obstacle", () => {
    // Enemy at (200,200), wall obstacle just to the right
    const e = mkEnemy({ x: 200, y: 200, size: 20 });
    const p2 = { x: 400, y: 200 }; // east
    const wall = { x: 220, y: 180, w: 40, h: 40 }; // right of enemy within AVOID_R
    const { sx } = computeEnemySteeringVector(e, p2, null, [wall]);
    // Wall avoidance should push the steering vector left (away from wall)
    expect(sx).toBeLessThan(1); // no longer pure-east
  });

  it("skips wall avoidance when chargeActive", () => {
    const e = mkEnemy({ chargeActive: true });
    const wall = { x: 220, y: 180, w: 40, h: 40 };
    const { sx } = computeEnemySteeringVector(e, player, null, [wall]);
    // Charging enemy ignores walls → pure east toward player
    expect(sx).toBeCloseTo(1, 5);
  });

  it("produces zigzag for typeIndex 10 (Zigzagger) based on wobble", () => {
    const e = mkEnemy({ typeIndex: 10, wobble: Math.PI / 2 });
    const { zigzag } = computeEnemySteeringVector(e, player, null, []);
    // sin(π/2 * 3) = sin(3π/2) ≈ -1, so zigzag ≈ -3
    expect(zigzag).toBeCloseTo(Math.sin((Math.PI / 2) * 3) * 3, 4);
  });

  it("produces zero zigzag for non-Zigzagger types", () => {
    const e = mkEnemy({ typeIndex: 5, wobble: 1.23 });
    const { zigzag } = computeEnemySteeringVector(e, player, null, []);
    expect(zigzag).toBe(0);
  });
});
