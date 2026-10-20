import { describe, expect, it } from "vitest";
import {
  bulletEnemyCollision,
  computeBulletDamage,
  computeIncomingDamage,
  computeJuggernautShieldDamage,
  enemyProjectilePlayerCollision,
  findLightningChainTarget,
  getShieldFacingMultiplier,
  isPrecisionHit,
  resolveEnemyContactPlayerHit,
  resolveEnemyProjectilePlayerHit,
  resolveGrenadeEnemyDamage,
  resolveObstacleBounce,
  resolvePierce,
  resolvePlayerDamage,
  rollCrit,
} from "./combatResolution.js";

describe("combatResolution", () => {
  it("uses squared-distance bullet/enemy collision with an AABB fast reject", () => {
    expect(bulletEnemyCollision({ x: 10, y: 10, size: 5 }, { x: 18, y: 10, size: 20 }).hit).toBe(true);
    expect(bulletEnemyCollision({ x: 100, y: 100, size: 5 }, { x: 18, y: 10, size: 20 }).hit).toBe(false);
  });

  it("rolls crits from an injected rng for deterministic tests", () => {
    expect(rollCrit({ baseCrit: 0.1, perkCrit: 0.2, runCrit: 0.1, rng: () => 0.39 }).isCrit).toBe(true);
    expect(rollCrit({ baseCrit: 0.1, perkCrit: 0.2, runCrit: 0.1, rng: () => 0.41 }).isCrit).toBe(false);
  });

  it("computes stacked bullet damage without side effects", () => {
    const r = computeBulletDamage({
      bullet: { damage: 10, vx: 1, vy: 0 },
      enemy: { typeIndex: 0, dmgMult: 1.5 },
      player: { x: 0, y: 0, health: 20, maxHealth: 100 },
      comboCount: 2,
      critMult: 2,
      critMultBonus: 0.5,
      isCrit: true,
      lastResort: true,
      rageActive: true,
    });
    expect(r.damage).toBeCloseTo(10 * 1.2 * 2.5 * 3 * 1.5 * 1.75, 4);
  });

  it("keeps juggernaut shield drain separate from post-mitigation damage", () => {
    expect(computeJuggernautShieldDamage({ bulletDamage: 10, comboCount: 3, isCrit: true, critMult: 2 })).toBe(26);
  });

  it.each([
    ["east", 1, 0],
    ["west", -1, 0],
    ["south", 0, 1],
    ["north", 0, -1],
  ])("protects the visible %s shield face and exposes the rear", (_heading, dx, dy) => {
    const enemy = { typeIndex: 11, x: 100, y: 100 };
    const player = { x: 100 + dx * 80, y: 100 + dy * 80 };
    expect(getShieldFacingMultiplier({ enemy, player, bullet: { vx: -dx * 12, vy: -dy * 12 } })).toBe(0.2);
    expect(getShieldFacingMultiplier({ enemy, player, bullet: { vx: dx * 12, vy: dy * 12 } })).toBe(1.6);
  });

  it("keeps perpendicular contacts on the existing unshielded boundary", () => {
    const enemy = { typeIndex: 11, x: 100, y: 100 };
    const player = { x: 180, y: 100 };
    for (const vy of [-12, 12]) {
      expect(getShieldFacingMultiplier({ enemy, player, bullet: { vx: 0, vy } })).toBe(1.6);
    }
    expect(getShieldFacingMultiplier({ enemy: { ...enemy, typeIndex: 0 }, player, bullet: { vx: -12, vy: 0 } })).toBe(1);
  });

  it.each([["front", -12, 0.2], ["rear", 12, 1.6]])("stacks %s shield damage with earned combat multipliers", (_side, vx, shieldMult) => {
    const result = computeBulletDamage({
      bullet: { damage: 20, vx, vy: 0 },
      enemy: { typeIndex: 11, x: 100, y: 100, dmgMult: 1.5 },
      player: { x: 180, y: 100, health: 20, maxHealth: 100 },
      comboCount: 2,
      critMult: 2,
      critMultBonus: 0.5,
      isCrit: true,
      lastResort: true,
      rageActive: true,
    });
    expect(result.shieldMult).toBe(shieldMult);
    expect(result.damage).toBeCloseTo(20 * 1.2 * 2.5 * 3 * shieldMult * 1.5 * 1.75);
  });

  it("computes incoming player damage with glassjaw and armor modifiers", () => {
    expect(computeIncomingDamage({ baseDamage: 10, glassjaw: true, glassjawMult: 1.5, armorMult: 0.8 })).toBe(12);
    expect(resolvePlayerDamage({ player: { health: 20 }, baseDamage: 25 })).toMatchObject({ health: 0, dead: true });
  });

  it("resolves enemy projectile hits without mutating player state", () => {
    const player = { x: 10, y: 10, health: 30, invincible: 0 };
    const projectile = { x: 20, y: 10, damage: 8 };
    expect(enemyProjectilePlayerCollision(projectile, player).hit).toBe(true);
    const result = resolveEnemyProjectilePlayerHit({ projectile, player, armorMult: 0.5 });
    expect(result).toMatchObject({ hit: true, projectileLife: 0, damage: 4, health: 26, invincibleFrames: 20 });
    expect(player.health).toBe(30);
  });

  it("skips projectile and contact hits during dash or invincibility", () => {
    expect(resolveEnemyProjectilePlayerHit({ projectile: { x: 0, y: 0 }, player: { x: 0, y: 0, invincible: 3 } }).hit).toBe(false);
    expect(resolveEnemyContactPlayerHit({ enemy: { x: 0, y: 0, size: 30, typeIndex: 2 }, player: { x: 0, y: 0, invincible: 0 }, dashActive: true }).hit).toBe(false);
  });

  it("resolves enemy contact and grenade blast damage from geometry", () => {
    const contact = resolveEnemyContactPlayerHit({
      enemy: { x: 0, y: 0, size: 20, typeIndex: 3 },
      player: { x: 5, y: 0, health: 100, invincible: 0 },
    });
    expect(contact).toMatchObject({ hit: true, damage: 25, health: 75, invincibleFrames: 30 });

    const blast = resolveGrenadeEnemyDamage({
      grenade: { x: 0, y: 0 },
      enemy: { x: 65, y: 0 },
      radius: 130,
      baseDamage: 70,
      damageMult: 2,
    });
    expect(blast.hit).toBe(true);
    expect(blast.damage).toBeCloseTo(70, 4);
  });

  it("selects the nearest valid lightning chain target", () => {
    const source = { x: 0, y: 0, health: 10 };
    const far = { x: 190, y: 0, health: 10 };
    const near = { x: 60, y: 0, health: 10 };
    expect(findLightningChainTarget([source, far, near], source)).toBe(near);
    expect(findLightningChainTarget([source, { x: 10, y: 0, health: 0 }], source)).toBeNull();
  });

  it("skips summon-protected bosses without hiding vulnerable or ordinary targets", () => {
    const source = { x: 0, y: 0, health: 10 };
    const boss = { x: 20, y: 0, health: 10, typeIndex: 18, summonerInvuln: true };
    const fallback = { x: 60, y: 0, health: 10 };
    expect(findLightningChainTarget([source, boss, fallback], source)).toBe(fallback);
    expect(findLightningChainTarget([source, boss], source)).toBeNull();
    boss.summonerInvuln = false;
    expect(findLightningChainTarget([source, boss, fallback], source)).toBe(boss);
    expect(findLightningChainTarget([source, { ...boss, typeIndex: 0, summonerInvuln: true }], source)).not.toBeNull();
  });

  it("resolves pierce consumption deterministically", () => {
    expect(resolvePierce({ pierceLeft: 2 })).toEqual({ nextPierceLeft: 1, consumeBullet: false });
    expect(resolvePierce({ pierceLeft: 0 })).toEqual({ nextPierceLeft: 0, consumeBullet: true });
  });

  it("resolves obstacle ricochets without mutating the bullet", () => {
    const bullet = { x: 10, y: 5, vx: 3, vy: 0, bouncesLeft: 2, life: 10 };
    const result = resolveObstacleBounce(bullet, { x: 8, y: 0, w: 8, h: 10 });
    expect(result.bounced).toBe(true);
    expect(result.vx).toBe(-3);
    expect(result.bouncesLeft).toBe(1);
    expect(result.life).toBe(35);
    expect(bullet.vx).toBe(3);
  });

  describe("isPrecisionHit", () => {
    const enemy = { x: 100, y: 100, size: 40 }; // core radius threshold = 20 * 0.35 = 7

    it("returns true when bullet is within 35% of enemy core radius", () => {
      expect(isPrecisionHit({ x: 103, y: 102 }, enemy)).toBe(true);  // dist ~3.6 < 7
    });

    it("returns false when bullet is outside core but still hitting the enemy", () => {
      expect(isPrecisionHit({ x: 115, y: 100 }, enemy)).toBe(false); // dist 15 > 7
    });

    it("returns false for boss enemies guard (handled at call site)", () => {
      // isPrecisionHit itself is agnostic to boss flag — caller skips bosses
      expect(isPrecisionHit({ x: 103, y: 102 }, { ...enemy, isBossEnemy: true })).toBe(true);
    });

    it("returns false for missing inputs", () => {
      expect(isPrecisionHit(null, enemy)).toBe(false);
      expect(isPrecisionHit({ x: 100, y: 100 }, null)).toBe(false);
      expect(isPrecisionHit({ x: 100, y: 100 }, { x: 100, y: 100, size: 0 })).toBe(false);
    });
  });
});
