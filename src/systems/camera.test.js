import { describe, it, expect } from "vitest";
import {
  clampCamera,
  createCamera,
  isCameraActive,
  resolveArenaSize,
  screenToWorld,
  updateCamera,
  viewCenter,
  worldToScreen,
} from "./camera.js";

const VIEW = { viewW: 1280, viewH: 720 };

describe("resolveArenaSize", () => {
  it("returns the viewport for a mode that declares no scale", () => {
    expect(resolveArenaSize(null, 1280, 720)).toEqual({ arenaW: 1280, arenaH: 720 });
    expect(resolveArenaSize({ arena: {} }, 1280, 720)).toEqual({ arenaW: 1280, arenaH: 720 });
  });

  it("never lets a mode shrink the arena below the viewport", () => {
    expect(resolveArenaSize({ arena: { scale: 0.5 } }, 1280, 720)).toEqual({ arenaW: 1280, arenaH: 720 });
    expect(resolveArenaSize({ arena: { scale: -3 } }, 1280, 720)).toEqual({ arenaW: 1280, arenaH: 720 });
    expect(resolveArenaSize({ arena: { scale: NaN } }, 1280, 720)).toEqual({ arenaW: 1280, arenaH: 720 });
  });

  it("scales up and caps at 4×", () => {
    expect(resolveArenaSize({ arena: { scale: 2 } }, 1280, 720)).toEqual({ arenaW: 2560, arenaH: 1440 });
    expect(resolveArenaSize({ arena: { scale: 99 } }, 100, 100)).toEqual({ arenaW: 400, arenaH: 400 });
  });
});

describe("camera identity for unscaled arenas", () => {
  it("is inactive and pinned at the origin", () => {
    const cam = createCamera({ arenaW: 1280, arenaH: 720, ...VIEW });
    expect(isCameraActive(cam, 1280, 720)).toBe(false);
    updateCamera(cam, { x: 4000, y: 4000 }, VIEW);
    expect(cam).toMatchObject({ x: 0, y: 0 });
    expect(worldToScreen(cam, 300, 200)).toEqual({ x: 300, y: 200 });
    expect(screenToWorld(cam, 300, 200)).toEqual({ x: 300, y: 200 });
    expect(viewCenter(cam, 1280, 720)).toEqual({ x: 640, y: 360 });
  });
});

describe("camera follow on a scrolled arena", () => {
  const make = () => createCamera({ arenaW: 2560, arenaH: 1440, ...VIEW });

  it("reports itself active", () => {
    expect(isCameraActive(make(), 1280, 720)).toBe(true);
  });

  it("snaps the player to the centre and clamps to arena bounds", () => {
    const cam = make();
    updateCamera(cam, { x: 1280, y: 720 }, { ...VIEW, snap: true });
    expect(cam.x).toBe(640);
    expect(cam.y).toBe(360);

    updateCamera(cam, { x: 0, y: 0 }, { ...VIEW, snap: true });
    expect(cam.x).toBe(0);
    expect(cam.y).toBe(0);

    updateCamera(cam, { x: 2560, y: 1440 }, { ...VIEW, snap: true });
    expect(cam.x).toBe(2560 - 1280);
    expect(cam.y).toBe(1440 - 720);
  });

  it("does not move at all while the player stays inside the dead zone", () => {
    const cam = make();
    updateCamera(cam, { x: 1280, y: 720 }, { ...VIEW, snap: true });
    const before = { x: cam.x, y: cam.y };
    // 100px of drift is inside the 0.22 × 1280 / 2 ≈ 140px horizontal slack.
    updateCamera(cam, { x: 1380, y: 720 }, VIEW);
    expect(cam.x).toBe(before.x);
    expect(cam.y).toBe(before.y);
  });

  it("eases toward the player once the drift leaves the dead zone", () => {
    const cam = make();
    updateCamera(cam, { x: 1280, y: 720 }, { ...VIEW, snap: true });
    const start = cam.x;
    updateCamera(cam, { x: 1900, y: 720 }, VIEW);
    expect(cam.x).toBeGreaterThan(start);
    // Eased, not snapped: one frame must not arrive at the target.
    expect(cam.x).toBeLessThan(1900 - 1280 / 2);
  });

  it("converges on the target under repeated frames and never leaves the arena", () => {
    const cam = make();
    for (let i = 0; i < 400; i += 1) updateCamera(cam, { x: 2400, y: 1300 }, VIEW);
    expect(cam.x).toBe(1280);
    expect(cam.y).toBe(720);
  });

  it("round-trips world and screen coordinates", () => {
    const cam = make();
    updateCamera(cam, { x: 1280, y: 720 }, { ...VIEW, snap: true });
    const screen = worldToScreen(cam, 1280, 720);
    expect(screen).toEqual({ x: 640, y: 360 });
    expect(screenToWorld(cam, screen.x, screen.y)).toEqual({ x: 1280, y: 720 });
  });
});

describe("clampCamera", () => {
  it("pins a camera that was pushed out of bounds", () => {
    const cam = createCamera({ arenaW: 2000, arenaH: 1000, viewW: 1000, viewH: 500 });
    cam.x = -50; cam.y = 9999;
    clampCamera(cam, 1000, 500);
    expect(cam).toMatchObject({ x: 0, y: 500 });
  });
});
