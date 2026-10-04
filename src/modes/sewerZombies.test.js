import { describe, expect, it } from "vitest";
import { createSewerRun, SEWER_ZOMBIES, stepSewerRun } from "./sewerZombies.js";
function run() { return { player: { x: 0, y: 0, health: 50, maxHealth: 100 }, kills: 0, score: 0, enemies: [], sewerRun: createSewerRun() }; }
describe("sewer pump and escape campaign", () => {
  it("queues an experimental entrance after earned pump completion without pausing combat", () => {
    const gs = run(), pump = gs.sewerRun.pumps[0];
    gs.sewerRun.pacing = "pumps"; gs.sewerRun.sludge = 1; pump.charge = 359;
    Object.assign(gs.player, { x: pump.x, y: pump.y });
    expect(stepSewerRun(gs).map(event => event.type)).toEqual(["pump"]);
    expect(gs.sewerRun.pendingEntrance).toBe("sprinter");
    expect(gs.sewerRun.phase).toBe("pumps");
  });
  it("requires earned fuel and prevents enemies contesting a pump", () => {
    const gs = run(), p = gs.sewerRun.pumps[0]; Object.assign(gs.player, { x: p.x, y: p.y });
    stepSewerRun(gs); expect(p.charge).toBe(0);
    gs.kills = 6; gs.enemies = [{ x: p.x, y: p.y, size: 30, health: 10 }];
    stepSewerRun(gs); expect(p.charge).toBe(0); expect(gs.sewerRun.sludge).toBe(6);
    gs.enemies = []; for (let i = 0; i < 360; i++) stepSewerRun(gs);
    expect(p.complete).toBe(true); expect(gs.sewerRun.sludge).toBe(0); expect(gs.player.health).toBe(65);
  });
  it("ends only after three pumps and a contested-proof hatch hold", () => {
    const gs = run(); gs.kills = 18;
    for (const p of gs.sewerRun.pumps) { Object.assign(gs.player, { x: p.x, y: p.y }); for (let i = 0; i < 360; i++) stepSewerRun(gs); }
    expect(gs.sewerRun.phase).toBe("extraction"); expect(SEWER_ZOMBIES.winCondition(gs)).toBe(null);
    Object.assign(gs.player, { x: gs.sewerRun.hatch.x, y: gs.sewerRun.hatch.y });
    for (let i = 0; i < 299; i++) stepSewerRun(gs);
    expect(SEWER_ZOMBIES.winCondition(gs)).toBe(null);
    stepSewerRun(gs); expect(SEWER_ZOMBIES.winCondition(gs)).toBe("win");
  });
  it("flood deadline ends a stalled run", () => {
    const gs = run(); gs.sewerRun.frames = 240 * 60 - 1;
    expect(stepSewerRun(gs)).toEqual([{ type: "flooded" }]); expect(SEWER_ZOMBIES.winCondition(gs)).toBe("lose");
  });
});

it("owns continuous capped spawning and depth progression without classic wave clears", () => {
  const gs = run(); gs.currentWave = 1; gs.sewerSpawnTimer = 1;
  let spawned = 0;
  const ctx = { spawnEnemy: () => { spawned++; gs.enemies.push({ x: 1, y: 1, health: 50, size: 30 }); } };
  SEWER_ZOMBIES.step(gs, ctx); expect(spawned).toBe(1);
  gs.sewerRun.frames = 3600; gs.sewerSpawnTimer = 1;
  SEWER_ZOMBIES.step(gs, ctx); expect(gs.currentWave).toBe(3); expect(gs.zombieOutbreak.surge).toBe(true);
  gs.enemies = Array.from({ length: 36 }, () => ({ x: 1, y: 1, health: 50, size: 30 })); gs.sewerSpawnTimer = 1;
  SEWER_ZOMBIES.step(gs, ctx); expect(spawned).toBe(2);
  expect(SEWER_ZOMBIES.isBossWave(gs)).toBe(false);
  expect(SEWER_ZOMBIES.rulesetId).toBe("zombies");
});
