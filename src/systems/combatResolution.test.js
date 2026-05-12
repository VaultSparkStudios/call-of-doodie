import { describe, expect, it } from "vitest";
import {
  bulletEnemyCollision,
  computeBulletDamage,
  computeJuggernautShieldDamage,
  findLightningChainTarget,
  resolveObstacleBounce,
  resolvePierce,
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

  it("selects the nearest valid lightning chain target", () => {
    const source = { x: 0, y: 0, health: 10 };
    const far = { x: 190, y: 0, health: 10 };
    const near = { x: 60, y: 0, health: 10 };
    expect(findLightningChainTarget([source, far, near], source)).toBe(near);
    expect(findLightningChainTarget([source, { x: 10, y: 0, health: 0 }], source)).toBeNull();
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
});
