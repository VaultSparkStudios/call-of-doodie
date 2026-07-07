import { describe, it, expect } from "vitest";
import {
  computeMovementVector,
  applyPlayerMovement,
  computePointerAimAngle,
  angleToUnitVector,
  buildPointerAimSweepReport,
  stepBullets,
  stepEnemyBullets,
} from "./gameStep.js";

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

describe("computePointerAimAngle", () => {
  const rect = { left: 10, top: 20, width: 400, height: 300 };
  const canvasSize = { w: 800, h: 600 };
  const player = { x: 400, y: 300 };

  it("projects pointer aim east on the canvas", () => {
    const angle = computePointerAimAngle({ x: 410, y: 170 }, rect, canvasSize, player);
    const v = angleToUnitVector(angle);
    expect(v.x).toBeCloseTo(1, 5);
    expect(v.y).toBeCloseTo(0, 5);
  });

  it("projects pointer aim west on the canvas", () => {
    const angle = computePointerAimAngle({ x: 10, y: 170 }, rect, canvasSize, player);
    const v = angleToUnitVector(angle);
    expect(v.x).toBeCloseTo(-1, 5);
    expect(v.y).toBeCloseTo(0, 5);
  });

  it("projects pointer aim north and south on the canvas", () => {
    const north = angleToUnitVector(computePointerAimAngle({ x: 210, y: 20 }, rect, canvasSize, player));
    const south = angleToUnitVector(computePointerAimAngle({ x: 210, y: 320 }, rect, canvasSize, player));
    expect(north.x).toBeCloseTo(0, 5);
    expect(north.y).toBeCloseTo(-1, 5);
    expect(south.x).toBeCloseTo(0, 5);
    expect(south.y).toBeCloseTo(1, 5);
  });

  it("projects diagonal quadrant vectors", () => {
    const ne = angleToUnitVector(computePointerAimAngle({ x: 360, y: 20 }, rect, canvasSize, player));
    const sw = angleToUnitVector(computePointerAimAngle({ x: 60, y: 320 }, rect, canvasSize, player));
    expect(ne.x).toBeGreaterThan(0.7);
    expect(ne.y).toBeLessThan(-0.7);
    expect(sw.x).toBeLessThan(-0.7);
    expect(sw.y).toBeGreaterThan(0.7);
  });

  it("builds a complete four-direction browser pointer sweep report", () => {
    const report = buildPointerAimSweepReport(rect, canvasSize, player);

    expect(report.complete).toBe(true);
    expect(report.buckets).toEqual(["east", "north", "south", "west"]);
    expect(report.probes.map(probe => probe.id)).toEqual(["east", "south", "west", "north"]);
  });
});

describe("stepBullets", () => {
  const player = { x: 0, y: 0 };
  const W = 800, H = 600;

  function bullet(overrides = {}) {
    return { x: 100, y: 100, vx: 5, vy: 0, life: 10, size: 4, color: "#F00", ...overrides };
  }

  it("moves bullet by velocity each frame", () => {
    const b = bullet();
    const { bullets } = stepBullets({ bullets: [b], obstacles: [], player, W, H, frameCount: 0 });
    expect(bullets).toHaveLength(1);
    expect(bullets[0].x).toBe(105);
    expect(bullets[0].y).toBe(100);
    expect(bullets[0].life).toBe(9);
  });

  it("removes bullet when life reaches zero", () => {
    const { bullets } = stepBullets({ bullets: [bullet({ life: 1 })], obstacles: [], player, W, H, frameCount: 0 });
    expect(bullets).toHaveLength(0);
  });

  it("removes bullet that exits canvas to the right", () => {
    const { bullets } = stepBullets({ bullets: [bullet({ x: 805, vx: 5 })], obstacles: [], player, W, H, frameCount: 0 });
    expect(bullets).toHaveLength(0);
  });

  it("removes bullet that exits canvas to the left", () => {
    const { bullets } = stepBullets({ bullets: [bullet({ x: -15, vx: -5 })], obstacles: [], player, W, H, frameCount: 0 });
    expect(bullets).toHaveLength(0);
  });

  it("emits trail particle on even frames only", () => {
    const b0 = bullet({ trail: true });
    const r0 = stepBullets({ bullets: [b0], obstacles: [], player, W, H, frameCount: 0 });
    expect(r0.particleSpawns).toHaveLength(1);
    expect(r0.particleSpawns[0].color).toBe("#F00");
    expect(r0.particleSpawns[0].count).toBe(1);

    const b1 = bullet({ trail: true });
    const r1 = stepBullets({ bullets: [b1], obstacles: [], player, W, H, frameCount: 1 });
    expect(r1.particleSpawns).toHaveLength(0);
  });

  it("emits white particles and screenShakeBump=1 when bullet bounces off obstacle", () => {
    // Bullet moving right, obstacle to its immediate right
    const b = bullet({ x: 199, vx: 5, bouncesLeft: 1 });
    const obs = [{ x: 200, y: 90, w: 20, h: 20 }];
    const result = stepBullets({ bullets: [b], obstacles: obs, player, W, H, frameCount: 0 });
    expect(result.screenShakeBump).toBe(1);
    const white = result.particleSpawns.find(p => p.color === "#FFFFFF");
    expect(white).toBeTruthy();
    expect(white.count).toBe(4);
  });

  it("removes bullet consumed by obstacle (no bouncesLeft)", () => {
    const b = bullet({ x: 199, vx: 5, bouncesLeft: 0 });
    const obs = [{ x: 200, y: 90, w: 20, h: 20 }];
    const { bullets, particleSpawns } = stepBullets({ bullets: [b], obstacles: obs, player, W, H, frameCount: 0 });
    expect(bullets).toHaveLength(0);
    const colored = particleSpawns.find(p => p.color === "#F00");
    expect(colored).toBeTruthy();
    expect(colored.count).toBe(3);
  });

  it("boomerang curves outbound (vx/vy rotate by 0.055 rad/frame)", () => {
    const b = bullet({ boomerang: true, returning: false, outboundLife: 5, life: 10, vx: 5, vy: 0 });
    const { bullets } = stepBullets({ bullets: [b], obstacles: [], player, W, H, frameCount: 0 });
    expect(bullets[0].vy).not.toBe(0); // rotation applied
    expect(Math.hypot(bullets[0].vx, bullets[0].vy)).toBeCloseTo(5, 4); // speed preserved
  });

  it("boomerang switches to returning when life <= outboundLife", () => {
    const b = bullet({ boomerang: true, returning: false, outboundLife: 10, life: 10, vx: 5, vy: 0 });
    const { bullets } = stepBullets({ bullets: [b], obstacles: [], player, W, H, frameCount: 0 });
    expect(bullets[0].returning).toBe(true);
  });

  it("returning boomerang steers toward player", () => {
    const b = bullet({ x: 200, y: 0, boomerang: true, returning: true, vx: 5, vy: 0 });
    const p = { x: 0, y: 0 };
    const { bullets } = stepBullets({ bullets: [b], obstacles: [], player: p, W, H, frameCount: 0 });
    expect(bullets[0].vx).toBeLessThan(0); // moving left toward player
  });

  it("returning boomerang removed when within catch radius of player", () => {
    const b = bullet({ x: 20, y: 0, boomerang: true, returning: true, vx: -5, vy: 0 });
    const { bullets } = stepBullets({ bullets: [b], obstacles: [], player: { x: 0, y: 0 }, W, H, frameCount: 0 });
    expect(bullets).toHaveLength(0);
  });

  it("returns empty particleSpawns and zero screenShakeBump for clean flight", () => {
    const { particleSpawns, screenShakeBump } = stepBullets({
      bullets: [bullet()], obstacles: [], player, W, H, frameCount: 0,
    });
    expect(particleSpawns).toHaveLength(0);
    expect(screenShakeBump).toBe(0);
  });
});

describe("stepEnemyBullets", () => {
  const W = 800, H = 600;

  function eb(overrides = {}) {
    return { x: 100, y: 100, vx: 3, vy: 0, life: 10, ...overrides };
  }

  it("moves enemy bullet by velocity at normal speed", () => {
    const { enemyBullets } = stepEnemyBullets({ enemyBullets: [eb()], obstacles: [], timeDilationTimer: 0, W, H });
    expect(enemyBullets).toHaveLength(1);
    expect(enemyBullets[0].x).toBe(103);
    expect(enemyBullets[0].life).toBe(9);
  });

  it("slows enemy bullet to 0.2× speed during time dilation", () => {
    const { enemyBullets } = stepEnemyBullets({ enemyBullets: [eb({ vx: 10 })], obstacles: [], timeDilationTimer: 30, W, H });
    expect(enemyBullets[0].x).toBeCloseTo(102, 5); // 100 + 10*0.2
  });

  it("removes bullet when life expires", () => {
    const { enemyBullets } = stepEnemyBullets({ enemyBullets: [eb({ life: 1 })], obstacles: [], timeDilationTimer: 0, W, H });
    expect(enemyBullets).toHaveLength(0);
  });

  it("removes bullet that exits canvas right", () => {
    const { enemyBullets } = stepEnemyBullets({ enemyBullets: [eb({ x: 810, vx: 3 })], obstacles: [], timeDilationTimer: 0, W, H });
    expect(enemyBullets).toHaveLength(0);
  });

  it("removes bullet whose center enters an obstacle", () => {
    const { enemyBullets } = stepEnemyBullets({
      enemyBullets: [eb({ x: 50, y: 50 })],
      obstacles: [{ x: 40, y: 40, w: 20, h: 20 }],
      timeDilationTimer: 0, W, H,
    });
    expect(enemyBullets).toHaveLength(0);
  });

  it("keeps bullet that does not hit an obstacle", () => {
    const { enemyBullets } = stepEnemyBullets({
      enemyBullets: [eb({ x: 50, y: 50 })],
      obstacles: [{ x: 200, y: 200, w: 20, h: 20 }],
      timeDilationTimer: 0, W, H,
    });
    expect(enemyBullets).toHaveLength(1);
  });
});
