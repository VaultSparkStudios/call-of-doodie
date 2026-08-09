import { describe, expect, it } from "vitest";
import { motionPhaseSeed, resolveSpriteDeath, resolveSpriteMotion } from "./spriteMotion.js";

describe("sprite motion microsystem (S145)", () => {
  it("returns identity transform under reduced motion", () => {
    const m = resolveSpriteMotion({ frame: 100, speed: 4, hitFlash: 12, reduced: true });
    expect(m).toEqual({ rotation: 0, scaleX: 1, scaleY: 1, offsetY: 0 });
  });

  it("bounds every output against hostile input", () => {
    const m = resolveSpriteMotion({ frame: NaN, facingAngle: Infinity, speed: 1e9, hitFlash: -50, spawnAge: NaN, phase: NaN });
    expect(Math.abs(m.rotation)).toBeLessThanOrEqual(0.10);
    expect(m.scaleX).toBeGreaterThanOrEqual(0.6);
    expect(m.scaleX).toBeLessThanOrEqual(1.4);
    expect(m.scaleY).toBeGreaterThanOrEqual(0.6);
    expect(m.scaleY).toBeLessThanOrEqual(1.4);
    expect(Number.isFinite(m.offsetY)).toBe(true);
  });

  it("squashes on a fresh hit and recovers as the flash decays", () => {
    const fresh = resolveSpriteMotion({ frame: 0, hitFlash: 12, phase: 0 });
    const recovering = resolveSpriteMotion({ frame: 0, hitFlash: 3, phase: 0 });
    expect(fresh.scaleX).toBeGreaterThan(recovering.scaleX);
    expect(fresh.scaleY).toBeLessThan(recovering.scaleY);
  });

  it("leans toward horizontal travel and not vertical", () => {
    const right = resolveSpriteMotion({ facingAngle: 0, speed: 4, phase: 0 });
    const down = resolveSpriteMotion({ facingAngle: Math.PI / 2, speed: 4, phase: 0 });
    expect(Math.abs(right.rotation)).toBeGreaterThan(Math.abs(down.rotation));
  });

  it("spawn pop overshoots then settles to steady scale", () => {
    const mid = resolveSpriteMotion({ spawnAge: 4, phase: 0, frame: 0 });
    const settled = resolveSpriteMotion({ spawnAge: 8, phase: 0, frame: 0 });
    expect(mid.scaleX).toBeGreaterThan(0);
    expect(settled.scaleX).toBeCloseTo(resolveSpriteMotion({ phase: 0, frame: 0 }).scaleX, 5);
  });

  it("death choreography fades, squashes, and stays bounded across progress", () => {
    const start = resolveSpriteDeath(0);
    const end = resolveSpriteDeath(1);
    expect(start.alpha).toBe(1);
    expect(end.alpha).toBe(0);
    expect(end.scaleY).toBeGreaterThan(0);
    expect(resolveSpriteDeath(NaN).alpha).toBe(1);
    expect(resolveSpriteDeath(99).alpha).toBe(0);
  });

  it("phase seed is deterministic and varies by position", () => {
    expect(motionPhaseSeed(100, 200)).toBe(motionPhaseSeed(100, 200));
    expect(motionPhaseSeed(100, 200)).not.toBe(motionPhaseSeed(101, 200));
  });
});
