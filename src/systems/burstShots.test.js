import { describe, expect, it } from "vitest";
import { advanceBurstShots, queueBurstShots } from "./burstShots.js";

function run() {
  return { player: { x: 100, y: 200 }, bullets: [] };
}

describe("simulation-owned burst continuations", () => {
  it("emits at the first active frame reaching each 90 ms offset", () => {
    const gs = run();
    queueBurstShots(gs, [{ x: 125, y: 200, damage: 32 }, { x: 125, y: 200, damage: 32 }]);
    for (let frame = 1; frame <= 11; frame++) {
      advanceBurstShots(gs);
      expect(gs.bullets).toHaveLength(frame < 6 ? 0 : frame < 11 ? 1 : 2);
    }
    advanceBurstShots(gs);
    expect(gs.bullets).toHaveLength(2);
    expect(gs.pendingBurstShots).toEqual([]);
  });

  it("retains trigger damage and direction while using the current muzzle position", () => {
    const gs = run();
    queueBurstShots(gs, [{ x: 115, y: 220, damage: 96, vx: 3, vy: 4 }]);
    gs.player.x = 300; gs.player.y = 400;
    for (let frame = 0; frame < 6; frame++) advanceBurstShots(gs);
    expect(gs.bullets).toEqual([{ x: 315, y: 420, damage: 96, vx: 3, vy: 4 }]);
  });

  it("keeps overlapping bursts and replacement runs independent", () => {
    const gs = run(), replacement = run();
    queueBurstShots(gs, [{ x: 125, y: 200, damage: 32 }]);
    for (let frame = 0; frame < 3; frame++) advanceBurstShots(gs);
    queueBurstShots(gs, [{ x: 125, y: 200, damage: 64 }]);
    for (let frame = 0; frame < 6; frame++) { advanceBurstShots(gs); advanceBurstShots(replacement); }
    expect(gs.bullets.map(bullet => bullet.damage)).toEqual([32, 64]);
    expect(replacement.bullets).toEqual([]);
  });
});
