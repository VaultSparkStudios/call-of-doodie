import { stepEnemyFrame } from "./enemyFrame.js";
import { describe, expect, it } from "vitest";
import { describeZombieOutbreak, getZombieOutbreakPlan, getZombieWaveEnemyCount, mutateEnemyForZombieMode, stepZombieEnemy } from "./zombieMode.js";
const source = () => ({ x: 120, y: 120, name: "Influencer", ranged: true, eliteType: "armored", splitOnDeath: true, health: 9999, speed: 8, size: 50, points: 50 });
describe("rebuilt Sewer Zombies", () => {
  it("owns sewer bodies and prevents classic AI traits from leaking in", () => {
    const e = mutateEnemyForZombieMode(source(), { wave: 7, ordinal: 4 });
    expect(e).toEqual(mutateEnemyForZombieMode(source(), { wave: 7, ordinal: 4 }));
    expect(e).toMatchObject({ isZombie: true, ranged: false, eliteType: null, splitOnDeath: false });
    expect(e.health).toBeLessThan(200);
    expect(getZombieWaveEnemyCount(100, 3)).toBe(64);
    expect(getZombieOutbreakPlan(3).surge).toBe(true);
    expect(describeZombieOutbreak(3)).toContain("power the three pumps");
  });
  it("locks a rush aim before activation so a player can dodge its telegraph", () => {
    const e = { ...source(), isZombie: true, zombieVariant: "sprinter", zombieClock: 149, speed: 1, size: 34 };
    const gs = { obstacles: [], enemyBullets: [] }, world = { W: 1000, H: 800 };
    stepZombieEnemy(e, { gs, world, target: { x: 900, y: 120 } });
    expect(e.zombieState).toBe("windup"); expect(e.zombieAim).toBe(0);
    e.zombieClock = 209;
    const x = e.x, y = e.y;
    stepZombieEnemy(e, { gs, world, target: { x: 120, y: 700 } });
    expect(e.zombieState).toBe("attack"); expect(e.x - x).toBe(5); expect(e.y).toBe(y);
  });
  it("burps only once after the complete warning, with its own damage source", () => {
    const e = { ...source(), name: "Septic Burp Department", zombieVariant: "bloater", zombieClock: 226, speed: 1, size: 48 };
    const gs = { obstacles: [], enemyBullets: [] }, world = { W: 1000, H: 800 }, target = { x: 900, y: 120 };
    for (let i = 0; i < 72; i++) stepZombieEnemy(e, { gs, world, target });
    expect(gs.enemyBullets).toHaveLength(0);
    stepZombieEnemy(e, { gs, world, target }); expect(gs.enemyBullets).toHaveLength(3);
    expect(gs.enemyBullets[0].sourceName).toContain("burp");
    stepZombieEnemy(e, { gs, world, target }); expect(gs.enemyBullets).toHaveLength(3);
  });
  it("rushes stop at walls instead of clipping through them", () => {
    const e = { ...source(), x: 160, y: 150, zombieVariant: "sprinter", zombieClock: 209, zombieAim: 0, speed: 3, size: 34 };
    stepZombieEnemy(e, { gs: { obstacles: [{ x: 180, y: 100, w: 50, h: 100 }] }, world: { W: 1000, H: 800 }, target: { x: 900, y: 150 } });
    expect(e.x).toBeLessThan(180); expect(e.zombieClock).toBe(0);
  });
});

it("runs zombie combat without inherited classic boss abilities", () => {
  const player = { x: 900, y: 150, health: 100, maxHealth: 100, invincible: 0 };
  const enemy = mutateEnemyForZombieMode({ ...source(), typeIndex: 9, isBossEnemy: true, hasRentNuke: true, rentNukeTimer: 599, summonTimer: 359, hasEnrage: true }, { wave: 4, ordinal: 0 });
  enemy.health = enemy.maxHealth * 0.2;
  const gs = { player, enemies: [enemy], enemyBullets: [], bullets: [], particles: [], floatingTexts: [], obstacles: [], hazards: [], currentWave: 4, _ffTimer: -1000, _ffPx: 900, _ffPy: 150 };
  let summoned = 0;
  stepEnemyFrame({ gs, player, world: { W: 1280, H: 720 }, frame: 1, spawnEnemy: () => { summoned++; } });
  expect(summoned).toBe(0); expect(enemy.rentNukeTimer).toBe(599); expect(enemy.enrageTriggered).toBeUndefined(); expect(enemy.bossPhase2).toBeUndefined();
});
