import { describe, it, expect } from "vitest";
import { stepPlayerBullet, stepEnemyBullet } from "./bulletUpdate.js";

// ─── helpers ──────────────────────────────────────────────────────────────────

function makeBullet(overrides = {}) {
  return {
    x: 400, y: 300, vx: 5, vy: 0, life: 60,
    boomerang: false, returning: false, outboundLife: 30,
    bouncesLeft: 0, trail: false, color: "#FFD700", size: 4,
    ...overrides,
  };
}

function makeEnemyBullet(overrides = {}) {
  return { x: 200, y: 200, vx: 3, vy: 2, life: 40, ...overrides };
}

const PLAYER = { x: 400, y: 300 };
const BOUNDS = { W: 800, H: 600 };

// ─── stepPlayerBullet ─────────────────────────────────────────────────────────

describe("stepPlayerBullet — normal movement", () => {
  it("advances x/y by vx/vy", () => {
    const b = makeBullet({ x: 100, y: 100, vx: 4, vy: 3 });
    stepPlayerBullet(b, PLAYER, [], BOUNDS);
    expect(b.x).toBe(104);
    expect(b.y).toBe(103);
  });

  it("decrements life each frame", () => {
    const b = makeBullet({ life: 10 });
    stepPlayerBullet(b, PLAYER, [], BOUNDS);
    expect(b.life).toBe(9);
  });

  it("returns alive:true when life > 0 and in bounds", () => {
    const b = makeBullet({ x: 400, y: 300, vx: 1, vy: 0, life: 5 });
    const { alive } = stepPlayerBullet(b, PLAYER, [], BOUNDS);
    expect(alive).toBe(true);
  });

  it("returns alive:false when life reaches 0", () => {
    const b = makeBullet({ life: 1 });
    const { alive } = stepPlayerBullet(b, PLAYER, [], BOUNDS);
    expect(alive).toBe(false);
  });

  it("returns alive:false when bullet leaves right bound", () => {
    const b = makeBullet({ x: 805, vx: 5, life: 60 });
    const { alive } = stepPlayerBullet(b, PLAYER, [], BOUNDS);
    expect(alive).toBe(false);
  });

  it("returns alive:false when bullet leaves left bound", () => {
    const b = makeBullet({ x: -15, vx: -5, life: 60 });
    const { alive } = stepPlayerBullet(b, PLAYER, [], BOUNDS);
    expect(alive).toBe(false);
  });

  it("returns alive:false when bullet leaves bottom bound", () => {
    const b = makeBullet({ x: 400, y: 610, vx: 0, vy: 5, life: 60 });
    const { alive } = stepPlayerBullet(b, PLAYER, [], BOUNDS);
    expect(alive).toBe(false);
  });
});

describe("stepPlayerBullet — trail events", () => {
  it("emits trailEvent on even frame when trail:true", () => {
    const b = makeBullet({ trail: true, color: "#FF0000" });
    const { trailEvent } = stepPlayerBullet(b, PLAYER, [], { ...BOUNDS, frame: 2 });
    expect(trailEvent).not.toBeNull();
    expect(trailEvent?.color).toBe("#FF0000");
  });

  it("does not emit trailEvent on odd frame", () => {
    const b = makeBullet({ trail: true });
    const { trailEvent } = stepPlayerBullet(b, PLAYER, [], { ...BOUNDS, frame: 3 });
    expect(trailEvent).toBeNull();
  });

  it("does not emit trailEvent when trail:false", () => {
    const b = makeBullet({ trail: false });
    const { trailEvent } = stepPlayerBullet(b, PLAYER, [], { ...BOUNDS, frame: 2 });
    expect(trailEvent).toBeNull();
  });
});

describe("stepPlayerBullet — obstacle bounce", () => {
  it("bounces bullet off obstacle and returns bounceEvent.bounced", () => {
    const ob = { x: 200, y: 100, w: 50, h: 50 };
    // Place bullet inside obstacle with bouncesLeft=1
    const b = makeBullet({ x: 225, y: 125, vx: 5, vy: 0, bouncesLeft: 1 });
    const { bounceEvent } = stepPlayerBullet(b, PLAYER, [ob], BOUNDS);
    expect(bounceEvent).not.toBeNull();
    expect(bounceEvent?.bounced).toBe(true);
    expect(bounceEvent?.consumed).toBe(false);
  });

  it("consumes bullet when hitting obstacle with bouncesLeft=0", () => {
    const ob = { x: 200, y: 100, w: 50, h: 50 };
    const b = makeBullet({ x: 225, y: 125, vx: 5, vy: 0, bouncesLeft: 0 });
    const { alive, bounceEvent } = stepPlayerBullet(b, PLAYER, [ob], BOUNDS);
    expect(alive).toBe(false);
    expect(bounceEvent?.consumed).toBe(true);
  });
});

describe("stepPlayerBullet — boomerang", () => {
  it("curves outbound boomerang (rotates velocity)", () => {
    const b = makeBullet({
      boomerang: true, returning: false,
      vx: 5, vy: 0, life: 50, outboundLife: 60,
    });
    const origVx = b.vx;
    stepPlayerBullet(b, PLAYER, [], BOUNDS);
    // Velocity should have rotated
    expect(Math.round(Math.hypot(b.vx, b.vy) * 100)).toBe(Math.round(Math.hypot(origVx, 0) * 100));
  });

  it("flips to returning when life <= outboundLife", () => {
    const b = makeBullet({
      boomerang: true, returning: false,
      vx: 5, vy: 0, life: 30, outboundLife: 30,
    });
    stepPlayerBullet(b, PLAYER, [], BOUNDS);
    expect(b.returning).toBe(true);
  });

  it("steers returning boomerang toward player", () => {
    const b = makeBullet({
      boomerang: true, returning: true,
      x: 200, y: 300, vx: -5, vy: 0, life: 20,
    });
    stepPlayerBullet(b, { x: 400, y: 300 }, [], BOUNDS);
    // Should now be moving in positive x direction (toward player at x=400)
    expect(b.vx).toBeGreaterThan(0);
  });

  it("destroys returning boomerang when caught (dist < 24)", () => {
    const b = makeBullet({
      boomerang: true, returning: true,
      x: 400, y: 300, vx: 0, vy: 0, life: 20,
    });
    const { alive } = stepPlayerBullet(b, { x: 400, y: 300 }, [], BOUNDS);
    expect(alive).toBe(false);
  });
});

// ─── stepEnemyBullet ──────────────────────────────────────────────────────────

describe("stepEnemyBullet — normal movement", () => {
  it("advances x/y by vx/vy", () => {
    const eb = makeEnemyBullet({ x: 100, y: 100, vx: 3, vy: 2 });
    stepEnemyBullet(eb, [], BOUNDS);
    expect(eb.x).toBe(103);
    expect(eb.y).toBe(102);
  });

  it("decrements life each frame", () => {
    const eb = makeEnemyBullet({ life: 10 });
    stepEnemyBullet(eb, [], BOUNDS);
    expect(eb.life).toBe(9);
  });

  it("returns alive:true while in bounds and life > 0", () => {
    const eb = makeEnemyBullet({ x: 400, y: 300, life: 5 });
    const { alive } = stepEnemyBullet(eb, [], BOUNDS);
    expect(alive).toBe(true);
  });

  it("returns alive:false when life expires", () => {
    const eb = makeEnemyBullet({ life: 1 });
    const { alive } = stepEnemyBullet(eb, [], BOUNDS);
    expect(alive).toBe(false);
  });

  it("returns alive:false when bullet leaves bounds", () => {
    const eb = makeEnemyBullet({ x: -20, y: 300, vx: -5, life: 20 });
    const { alive } = stepEnemyBullet(eb, [], BOUNDS);
    expect(alive).toBe(false);
  });
});

describe("stepEnemyBullet — time dilation", () => {
  it("moves at full speed when no time dilation active", () => {
    const eb = makeEnemyBullet({ x: 100, vx: 10 });
    stepEnemyBullet(eb, [], { ...BOUNDS, timeDilationTimer: 0 });
    expect(eb.x).toBe(110);
  });

  it("moves at 20% speed when time dilation active (timeDilationTimer > 0)", () => {
    const eb = makeEnemyBullet({ x: 100, vx: 10 });
    stepEnemyBullet(eb, [], { ...BOUNDS, timeDilationTimer: 30 });
    expect(eb.x).toBeCloseTo(102); // 100 + 10 * 0.2
  });
});

describe("stepEnemyBullet — obstacle wall hit", () => {
  it("destroys enemy bullet that enters an obstacle", () => {
    const ob = { x: 200, y: 100, w: 60, h: 60 };
    const eb = makeEnemyBullet({ x: 230, y: 130, vx: 3, vy: 0, life: 20 });
    const { alive } = stepEnemyBullet(eb, [ob], BOUNDS);
    expect(alive).toBe(false);
  });

  it("survives when bullet misses all obstacles", () => {
    const ob = { x: 500, y: 500, w: 60, h: 60 };
    const eb = makeEnemyBullet({ x: 100, y: 100, vx: 2, vy: 0, life: 10 });
    const { alive } = stepEnemyBullet(eb, [ob], BOUNDS);
    expect(alive).toBe(true);
  });
});
