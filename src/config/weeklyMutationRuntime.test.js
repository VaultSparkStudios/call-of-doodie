import { planEnemyDefeatScore } from "../systems/defeatEconomy.js";
import { spawnAlly, stepAllies } from "../systems/allyUnit.js";
import { describe, expect, it, vi } from "vitest";
import { WEEKLY_MUTATIONS, WEAPONS, ENEMY_TYPES } from "../constants.js";
import { applyWeeklyMutationWithAffinity } from "./upgradeFacts.js";
import { getRunXpGain, getPlayerProjectileSpeed, getPickupCollectionRange, shouldDropStandardPickup } from "./weeklyMutationRuntime.js";
import { spawnBoss } from "../gameHelpers.js";
import { BOT_ROYALE } from "../modes/botRoyale.js";

function mutation(id, affinity = false) {
  const gs = {};
  applyWeeklyMutationWithAffinity(gs, WEEKLY_MUTATIONS.find((item) => item.id === id), new Set(affinity ? ["cha1"] : []));
  return gs;
}

describe("weekly mutation runtime effects", () => {
  it("doubles Jackpot XP and composes with perk/meta XP before rounding", () => {
    expect(getRunXpGain(31, { xpMult: 1.75 }, {})).toBe(54);
    expect(getRunXpGain(31, { xpMult: 1.75 }, mutation("jackpot"))).toBe(108);
    expect(getRunXpGain(31, { xpMult: 1.75 }, mutation("jackpot", true))).toBe(122);
  });

  it("raises ordinary pickup probability from 25% to 75%, or 87.5% with affinity", () => {
    const drops = (gs) => Array.from({ length: 1000 }, (_, i) => shouldDropStandardPickup(gs, false, () => i / 1000)).filter(Boolean).length;
    expect(drops({})).toBe(250);
    expect(drops(mutation("jackpot"))).toBe(750);
    expect(drops(mutation("jackpot", true))).toBe(875);
    expect(drops({ mutPickupRate: 10 })).toBe(1000);
  });

  it("preserves boss guarantees without consuming a new random draw", () => {
    const rng = vi.fn(() => 0.9999);
    expect(shouldDropStandardPickup({}, true, rng)).toBe(true);
    expect(rng).not.toHaveBeenCalled();
    expect(shouldDropStandardPickup({}, false, rng)).toBe(false);
    expect(rng).toHaveBeenCalledTimes(1);
  });

  it("applies the Magnetism floor without lowering stronger perk/settings ranges", () => {
    expect(getPickupCollectionRange({}, {})).toBe(30);
    expect(getPickupCollectionRange({}, mutation("magnet_world"))).toBe(90);
    expect(getPickupCollectionRange({}, mutation("magnet_world", true))).toBe(105);
    expect(getPickupCollectionRange({ pickupRange: 120 }, mutation("magnet_world"))).toBe(120);
    expect(getPickupCollectionRange({ pickupRange: 150 }, mutation("magnet_world", true))).toBe(150);
  });

  it("doubles every weapon's projectile speed, or boosts its favorable delta with affinity", () => {
    for (const weapon of WEAPONS) {
      const baseline = getPlayerProjectileSpeed(weapon);
      expect(getPlayerProjectileSpeed(weapon, mutation("speed_bullets"))).toBe(baseline * 2);
      expect(getPlayerProjectileSpeed(weapon, mutation("speed_bullets", true))).toBe(baseline * 2.25);
    }
  });

  it.each([4, 9, 17, 18, 20, 21])("applies enemy projectile speed to boss type %i without affinity amplifying the penalty", (typeIndex) => {
    const gs = { enemies: [], currentWave: 5, runSeed: 44, ...mutation("speed_bullets", true) };
    spawnBoss(gs, 1280, 720, "normal", typeIndex);
    expect(gs.enemies[0].projSpeed).toBeCloseTo((ENEMY_TYPES[typeIndex].projSpeed || 0) * 1.3 * 2);
  });

  it("applies Bullet Blitz to every Royale bot", () => {
    const gs = { enemies: [], player: {}, runSeed: 44, ...mutation("speed_bullets") };
    BOT_ROYALE.init(gs, { W: 1280, H: 720 });
    expect(gs.enemies).toHaveLength(BOT_ROYALE.botCount);
    for (const bot of gs.enemies) expect(bot.projSpeed).toBe(10.4);
  });
  it.each(["intern", "sergeant"])("applies Bullet Blitz to %s ally shots", (personality) => {
    const gs = {
      player: { x: 100, y: 100 }, enemies: [{ x: 200, y: 100, size: 32, health: 100 }],
      bullets: [], enemyBullets: [], obstacles: [], pickups: [], runSeed: 44,
      ...mutation("speed_bullets"),
    };
    const ally = spawnAlly(gs, personality, { x: 100, y: 100 });
    stepAllies(gs);
    expect(gs.bullets).toHaveLength(1);
    expect(Math.hypot(gs.bullets[0].vx, gs.bullets[0].vy)).toBeCloseTo((WEAPONS[ally.weaponIndex].bulletSpeed || 12) * 2);
  });
  it.each([[false, 3, 2], [true, 3.5, 2.25]])("keeps Jackpot score separate from XP with affinity=%s", (affinity, scoreFactor, xpFactor) => {
    const gs = { killScoreMult: 2 };
    applyWeeklyMutationWithAffinity(gs, WEEKLY_MUTATIONS.find((item) => item.id === "jackpot"), new Set(affinity ? ["cha1"] : []));
    const input = {
      enemy: { points: 100 }, comboMult: 2, killScoreMult: 2, routeKillScoreMult: 1.5,
      activeObjective: { type: "hot_zone", scoreMult: 3, contains: () => true },
      playerPos: { x: 0, y: 0 },
    };
    const baseline = planEnemyDefeatScore(input);
    const boosted = planEnemyDefeatScore({ ...input, killScoreMult: gs.killScoreMult, weeklyKillScoreMult: gs._weeklyKillScoreMult });
    expect(baseline.points).toBe(1800);
    expect(baseline.xpPoints).toBe(baseline.points);
    expect(boosted.points).toBe(baseline.points * scoreFactor);
    expect(boosted.xpPoints).toBe(baseline.xpPoints);
    expect(getRunXpGain(boosted.xpPoints, { xpMult: 1.5 }, gs)).toBe(1800 * 1.5 * xpFactor);
  });

  it("removes weekly score before rounding the underlying kill XP", () => {
    const gs = mutation("jackpot");
    const input = { enemy: { points: 11 }, comboMult: 1.15, routeKillScoreMult: 1.15 };
    const baseline = planEnemyDefeatScore(input);
    const boosted = planEnemyDefeatScore({ ...input, killScoreMult: gs.killScoreMult, weeklyKillScoreMult: gs._weeklyKillScoreMult });
    expect(boosted.xpPoints).toBe(baseline.points);
    expect(getRunXpGain(boosted.xpPoints, {}, gs)).toBe(baseline.points * 2);
  });
});
