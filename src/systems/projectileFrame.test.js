import { describe, expect, it, vi } from "vitest";
import { stepProjectileFrame } from "./projectileFrame.js";

function runtime(overrides = {}) {
  const gs = {
    bullets: [],
    enemyBullets: [],
    grenades: [],
    enemies: [],
    obstacles: [],
    totalDamage: 0,
    screenShake: 0,
    coins: 0,
    weaponUpgrades: [],
    runSeed: 17,
    currentWave: 1,
    player: { x: 50, y: 50, health: 100, maxHealth: 100 },
    ...overrides,
  };
  return {
    gs,
    player: gs.player,
    world: { W: 200, H: 120 },
    weaponIndex: 0,
    frame: 1,
    perkMods: {},
    stats: { crits: 0, totalHits: 0, bestPrecisionStreak: 0 },
    combo: { count: 0 },
    lastHitSoundRef: { current: 0 },
    setHealth: vi.fn(),
    handlePlayerDeath: vi.fn(),
    drainEnemyDefeats: vi.fn(),
    addXp: vi.fn(),
    checkAchievements: vi.fn(),
    checkDailyMissions: vi.fn(),
    achievementCheckRef: { current: false },
  };
}

describe("stepProjectileFrame", () => {
  const enemyAt = (extra = {}) => ({ x: 80, y: 60, size: 30, health: 10000, maxHealth: 10000, color: "#fff", ...extra });
  const shot = (extra = {}) => ({ x: 80, y: 60, vx: 0, vy: 0, life: 100, size: 5, damage: 10, color: "#fff", ...extra });

  it.each(["rail", "bullet"])("wears down and breaks Juggernaut armor with %s, then deals full damage", source => {
    const enemy = enemyAt({ typeIndex: 17, jugShield: 100 });
    const ctx = runtime({ enemies: [enemy], floatingTexts: [] });
    ctx.perkMods.critBonus = -1;
    const fire = damage => {
      if (source === "rail") ctx.gs.pendingBeam = { ox: 0, oy: 60, cos: 1, sin: 0, maxT: 180, weaponIdx: 9, damage };
      else ctx.gs.bullets = [shot({ damage })];
      stepProjectileFrame(ctx);
    };
    fire(40);
    expect(enemy.jugShield).toBe(60);
    expect(enemy.health).toBe(9994);
    fire(60);
    expect(enemy.jugShield).toBe(0);
    expect(enemy.jugShieldRegenDelay).toBe(240);
    expect(enemy.health).toBe(9985); // Breaking hit still sees the pre-hit armor.
    fire(40);
    expect(enemy.health).toBe(9945);
    expect(ctx.gs.totalDamage).toBe(55);
    expect(ctx.gs.floatingTexts.filter(t => t.text.includes("SHIELD BROKEN"))).toHaveLength(1);
    expect(ctx.gs.floatingTexts.find(t => t.text.includes("SHIELD SHATTERED"))).toMatchObject({ screen: true, x: 100, y: 40 });
  });

  it.each([0, 1, 500])("handles rail armor durability %i without negative shield or false break", shield => {
    const enemy = enemyAt({ typeIndex: 17, jugShield: shield });
    const ctx = runtime({ enemies: [enemy], pendingBeam: { ox: 0, oy: 60, cos: 1, sin: 0, maxT: 180, weaponIdx: 9, damage: 160 } });
    ctx.perkMods.critBonus = -1;
    stepProjectileFrame(ctx);
    expect(enemy.jugShield).toBe(Math.max(0, shield - 160));
    expect(enemy.health).toBe(shield ? 9976 : 9840);
    expect(enemy.jugShieldRegenDelay).toBe(shield === 1 ? 240 : undefined);
  });

  it("retains raw bullet shield math for rail despite health-only bonuses and armor", () => {
    const enemy = enemyAt({ typeIndex: 17, jugShield: 5000, dmgMult: 0.5 });
    const ctx = runtime({ enemies: [enemy], pendingBeam: { ox: 0, oy: 60, cos: 1, sin: 0, maxT: 180, weaponIdx: 9, damage: 160 }, critBonus: 1, critMultBonus: 0.5, rageTimer: 10 });
    ctx.player.health = 24;
    ctx.combo.count = 4;
    ctx.perkMods.lastResort = true;
    stepProjectileFrame(ctx);
    expect(enemy.jugShield).toBeCloseTo(5000 - 160 * 1.4 * 2);
    expect(ctx.gs.totalDamage).toBeCloseTo(160 * 1.4 * 2.5 * 3 * 0.5 * 1.75 * 0.15);
  });

  it("does not wear armor or announce a break during Shield Pulse", () => {
    const enemy = enemyAt({ typeIndex: 17, jugShield: 10, shieldPulseActive: true });
    const ctx = runtime({ enemies: [enemy], pendingBeam: { ox: 0, oy: 60, cos: 1, sin: 0, maxT: 180, weaponIdx: 9, damage: 160 } });
    stepProjectileFrame(ctx);
    expect(enemy.jugShield).toBe(10);
    expect(enemy.health).toBe(10000);
    expect(enemy.jugShieldRegenDelay).toBeUndefined();
    expect(ctx.gs.floatingTexts || []).toHaveLength(0);
  });

  it.each(["bullet", "grenade", "rail"])("derives %s protection from living guards despite a stale flag", source => {
    const boss = enemyAt({ typeIndex: 18, summonerId: "owner", summonerInvuln: false });
    const guard = enemyAt({ x: 180, y: 110, summonedBy: "owner" });
    const ctx = runtime({ enemies: [boss, guard] });
    ctx.perkMods = { critBonus: -1 };
    if (source === "bullet") ctx.gs.bullets = [shot()];
    if (source === "grenade") ctx.gs.grenades = [{ x: 80, y: 60, vx: 0, vy: 0, life: 1 }];
    if (source === "rail") ctx.gs.pendingBeam = { ox: 0, oy: 60, cos: 1, sin: 0, maxT: 100, weaponIdx: 9, damage: 10 };
    stepProjectileFrame(ctx);
    expect(boss.health).toBe(10000);
  });

  it.each(["bullet", "rail"])("releases %s protection after a grenade defeats the last guard in the same frame", source => {
    const boss = enemyAt({ typeIndex: 18, summonerId: "owner", summonerInvuln: true });
    const guard = enemyAt({ x: 180, y: 110, health: 1, summonedBy: "owner" });
    const ctx = runtime({ enemies: [boss, guard], grenades: [{ x: 180, y: 110, vx: 0, vy: 0, life: 1 }] });
    ctx.perkMods = { critBonus: -1 };
    if (source === "bullet") ctx.gs.bullets = [shot()];
    if (source === "rail") ctx.gs.pendingBeam = { ox: 0, oy: 60, cos: 1, sin: 0, maxT: 100, weaponIdx: 9, damage: 10 };
    stepProjectileFrame(ctx);
    expect(guard.health).toBeLessThanOrEqual(0);
    expect(boss.health).toBe(9990);
  });

  it("chains to a Summoner after its last living guard is defeated", () => {
    const primary = enemyAt();
    const boss = enemyAt({ x: 120, typeIndex: 18, summonerId: "owner", summonerInvuln: true });
    const guard = enemyAt({ x: 180, y: 110, health: 1, summonedBy: "owner" });
    const ctx = runtime({ chainLightning: true, enemies: [primary, boss, guard], bullets: [shot()], grenades: [{ x: 180, y: 110, vx: 0, vy: 0, life: 1 }], _runRngSeed: 17, _runRngStreams: new Map([["1:combat", () => 0]]) });
    ctx.perkMods.critBonus = -1;
    stepProjectileFrame(ctx);
    expect(boss.health).toBe(9995);
  });

  it("releases protection for a later grenade in the same projectile frame", () => {
    const boss = enemyAt({ typeIndex: 18, summonerId: "owner", summonerInvuln: true });
    const guard = enemyAt({ x: 180, y: 110, health: 1, summonedBy: "owner" });
    const ctx = runtime({ enemies: [boss, guard], grenades: [
      { x: 180, y: 110, vx: 0, vy: 0, life: 1 },
      { x: 80, y: 60, vx: 0, vy: 0, life: 1 },
    ] });
    stepProjectileFrame(ctx);
    expect(boss.health).toBe(9930);
  });

  it("keeps protection while another owned guard survives the first guard's defeat", () => {
    const boss = enemyAt({ typeIndex: 18, summonerId: "owner", summonerInvuln: true });
    const dying = enemyAt({ x: 180, y: 110, health: 1, summonedBy: "owner" });
    const living = enemyAt({ x: 180, y: 110, summonedBy: "owner" });
    const ctx = runtime({ enemies: [boss, dying, living], bullets: [shot()], grenades: [{ x: 180, y: 110, vx: 0, vy: 0, life: 1 }] });
    stepProjectileFrame(ctx);
    expect(dying.health).toBeLessThanOrEqual(0);
    expect(living.health).toBeGreaterThan(0);
    expect(boss.health).toBe(10000);
  });

  it.each(["bullet", "grenade", "rail"])("blocks %s damage and rewards during Shield Pulse, then releases protection", source => {
    const boss = enemyAt({ shieldPulseActive: true, health: 50 });
    const ctx = runtime({ enemies: [boss] });
    ctx.perkMods = { critBonus: 1, lifesteal: 0.1, critGrantsXp: true };
    ctx.player.health = 40;
    const fire = () => {
      if (source === "bullet") ctx.gs.bullets = [shot()];
      if (source === "grenade") ctx.gs.grenades = [{ x: 80, y: 60, vx: 0, vy: 0, life: 1 }];
      if (source === "rail") ctx.gs.pendingBeam = { ox: 0, oy: 60, cos: 1, sin: 0, maxT: 180, weaponIdx: 9, damage: 70 };
      stepProjectileFrame(ctx);
    };
    fire();
    expect(boss.health).toBe(50);
    expect(boss._defeatPending).toBeUndefined();
    expect(ctx.gs.totalDamage).toBe(0);
    expect(ctx.player.health).toBe(40);
    expect(ctx.stats.crits).toBe(0);
    expect(ctx.addXp).not.toHaveBeenCalled();
    boss.shieldPulseActive = false;
    ctx.perkMods.critBonus = -1;
    fire();
    expect(boss.health).toBe(source === "bullet" ? 40 : -20);
    expect(ctx.gs.totalDamage).toBe(source === "bullet" ? 10 : 70);
    expect(boss._defeatPending?.source).toBe(source === "bullet" ? undefined : source);
  });

  it.each(["fallback", "protected-only", "expired"])("chains around Shield Pulse: %s", kind => {
    const primary = enemyAt();
    const shielded = enemyAt({ x: 120, health: 3, shieldPulseActive: kind !== "expired" });
    const fallback = enemyAt({ x: 160 });
    const ctx = runtime({ chainLightning: true, enemies: kind === "fallback" ? [primary, shielded, fallback] : [primary, shielded], bullets: [shot()], _runRngSeed: 17, _runRngStreams: new Map([["1:combat", () => 0]]) });
    ctx.perkMods.critBonus = -1;
    stepProjectileFrame(ctx);
    expect(primary.health).toBe(9990);
    expect(shielded.health).toBe(kind === "expired" ? -2 : 3);
    expect(shielded._defeatPending?.source).toBe(kind === "expired" ? "chain-lightning" : undefined);
    expect(fallback.health).toBe(kind === "fallback" ? 9995 : 10000);
    expect(ctx.gs.totalDamage).toBe(kind === "protected-only" ? 10 : 15);
    expect(ctx.gs.lightningArcs || []).toHaveLength(kind === "protected-only" ? 0 : 1);
  });

  it.each([["front", 100, -10, 4], ["rear", 60, 10, 32]])("resolves a moving shot through the Shield Guy's %s with matching damage", (_side, x, vx, damage) => {
    const target = enemyAt({ typeIndex: 11 });
    const bullet = shot({ x, vx, damage: 20 });
    const ctx = runtime({ player: { x: 150, y: 60, health: 100, maxHealth: 100 }, bullets: [bullet], enemies: [target] });
    ctx.perkMods.critBonus = -1;
    stepProjectileFrame(ctx);
    expect(target.health).toBeCloseTo(10000 - damage);
    expect(ctx.gs.totalDamage).toBeCloseTo(damage);
    expect(ctx.stats.totalHits).toBe(1);
    expect(bullet.life).toBe(0);
  });

  it.each(["ordinary", "shield", "summoner"])("stops a consumed %s shot before the next overlapping target", kind => {
    const first = enemyAt(kind === "shield" ? { shieldPulseActive: true } : kind === "summoner" ? { typeIndex: 18, summonerInvuln: true } : {});
    const second = enemyAt();
    const ctx = runtime({ bullets: [shot()], enemies: [first, second] });
    stepProjectileFrame(ctx);
    expect(ctx.gs.bullets[0].life).toBe(0);
    expect(second.health).toBe(10000);
    expect(ctx.gs.totalDamage > 0).toBe(kind === "ordinary");
  });

  it("limits a piercing shot to its remaining distinct-target capacity", () => {
    const targets = [enemyAt(), enemyAt(), enemyAt()];
    const ctx = runtime({ bullets: [shot({ pierceLeft: 1 })], enemies: targets });
    stepProjectileFrame(ctx);
    expect(targets.map(enemy => enemy.health < 10000)).toEqual([true, true, false]);
  });

  it("does not repeat damage, rewards or pierce spending on overlap or reentry", () => {
    const first = enemyAt();
    const second = enemyAt({ x: 160 });
    const ctx = runtime({ bullets: [shot({ pierceLeft: 3 })], enemies: [first, second] });
    stepProjectileFrame(ctx);
    const healthAfterHit = first.health;
    const damageAfterHit = ctx.gs.totalDamage;
    const coinsAfterHit = ctx.gs.coins;
    stepProjectileFrame({ ...ctx, frame: 2 });
    first.x = 10;
    stepProjectileFrame({ ...ctx, frame: 3 });
    first.x = 80;
    stepProjectileFrame({ ...ctx, frame: 4 });
    expect(first.health).toBe(healthAfterHit);
    expect(ctx.gs.totalDamage).toBe(damageAfterHit);
    expect(ctx.gs.coins).toBe(coinsAfterHit);
    expect(ctx.gs.bullets[0].pierceLeft).toBe(2);
    second.x = 80;
    stepProjectileFrame({ ...ctx, frame: 5 });
    expect(second.health).toBeLessThan(10000);
    expect(ctx.gs.bullets[0].pierceLeft).toBe(1);
  });

  it("lets independent shots hit the same enemy", () => {
    const target = enemyAt();
    const ctx = runtime({ bullets: [shot(), shot()], enemies: [target] });
    stepProjectileFrame(ctx);
    expect(ctx.gs.bullets.every(bullet => bullet.life === 0)).toBe(true);
    expect(ctx.gs.totalDamage).toBeGreaterThanOrEqual(20);
  });

  it("lets a boomerang hit once outbound and once returning", () => {
    const target = enemyAt();
    const bullet = shot({ boomerang: true, returning: false, outboundLife: 98, pierceLeft: 99 });
    const ctx = runtime({ bullets: [bullet], enemies: [target] });
    stepProjectileFrame(ctx);
    const outboundHealth = target.health;
    stepProjectileFrame({ ...ctx, frame: 2 });
    expect(target.health).toBe(outboundHealth);
    stepProjectileFrame({ ...ctx, frame: 3 });
    expect(bullet.returning).toBe(true);
    expect(target.health).toBeLessThan(outboundHealth);
    const returnHealth = target.health;
    stepProjectileFrame({ ...ctx, frame: 4 });
    expect(target.health).toBe(returnHealth);
  });

  it("advances and compacts player and enemy projectiles", () => {
    const ctx = runtime({
      bullets: [{ x: 10, y: 10, vx: 2, vy: 0, life: 2, color: "#fff" }],
      enemyBullets: [{ x: 190, y: 10, vx: 20, vy: 0, life: 2 }],
    });
    const receipt = stepProjectileFrame(ctx);
    expect(receipt.ok).toBe(true);
    expect(ctx.gs.bullets[0].x).toBe(12);
    expect(ctx.gs.enemyBullets).toHaveLength(0);
  });

  it("resolves an expiring grenade through the shared enemy damage boundary", () => {
    const ctx = runtime({
      grenades: [{ x: 50, y: 50, vx: 0, vy: 0, life: 1 }],
      enemies: [{ x: 60, y: 50, health: 100, maxHealth: 100, size: 20 }],
    });
    stepProjectileFrame(ctx);
    expect(ctx.gs.grenades).toHaveLength(0);
    expect(ctx.gs.enemies[0].health).toBeLessThan(100);
    expect(ctx.drainEnemyDefeats).toHaveBeenCalled();
  });

  it("keeps a summon-protected boss safe from grenades until its protection ends", () => {
    const boss = enemyAt({ typeIndex: 18, summonerInvuln: true, health: 50 });
    const guard = enemyAt({ health: 50 });
    const grenade = () => ({ x: 80, y: 60, vx: 0, vy: 0, life: 1 });
    const ctx = runtime({ grenades: [grenade()], enemies: [boss, guard] });
    stepProjectileFrame(ctx);
    expect(boss.health).toBe(50);
    expect(boss._defeatPending).toBeUndefined();
    expect(guard.health).toBe(-20);
    expect(guard._defeatPending?.source).toBe("grenade");
    expect(ctx.gs.totalDamage).toBe(70);
    expect(ctx.gs.grenades).toHaveLength(0);
    boss.summonerInvuln = false;
    ctx.gs.enemies = [boss];
    ctx.gs.grenades = [grenade()];
    stepProjectileFrame(ctx);
    expect(boss.health).toBe(-20);
    expect(boss._defeatPending?.source).toBe("grenade");
    expect(ctx.gs.totalDamage).toBe(140);
  });

  it.each(["fallback", "protected-only", "vulnerable"])("honors summon protection for chain lightning: %s", kind => {
    const primary = enemyAt();
    const boss = enemyAt({ x: 120, health: 3, typeIndex: 18, summonerInvuln: kind !== "vulnerable" });
    const fallback = enemyAt({ x: 160 });
    const ctx = runtime({
      chainLightning: true,
      enemies: kind === "fallback" ? [primary, boss, fallback] : [primary, boss],
      bullets: [shot()],
      _runRngSeed: 17,
      _runRngStreams: new Map([["1:combat", () => 0]]),
    });
    ctx.perkMods.critBonus = -1;
    stepProjectileFrame(ctx);
    expect(primary.health).toBe(9990);
    expect(boss.health).toBe(kind === "vulnerable" ? -2 : 3);
    expect(boss._defeatPending?.source).toBe(kind === "vulnerable" ? "chain-lightning" : undefined);
    expect(fallback.health).toBe(kind === "fallback" ? 9995 : 10000);
    expect(ctx.gs.totalDamage).toBe(kind === "protected-only" ? 10 : 15);
    expect(ctx.gs.lightningArcs || []).toHaveLength(kind === "protected-only" ? 0 : 1);
    expect(ctx.stats.totalHits).toBe(1);
  });

  it("handles a pending rail beam without the former undefined combo multiplier", () => {
    const ctx = runtime({
      pendingBeam: { ox: 0, oy: 50, cos: 1, sin: 0, maxT: 180, weaponIdx: 0 },
      enemies: [{ x: 80, y: 50, health: 100, maxHealth: 100, size: 20, dmgMult: 1 }],
    });
    ctx.combo.count = 4;
    expect(() => stepProjectileFrame(ctx)).not.toThrow();
    expect(ctx.gs.pendingBeam).toBeNull();
    expect(ctx.gs.enemies[0].health).toBeLessThan(100);
  });

  it("uses the trigger's damage snapshot with rail combo, crit, rage and shield rules", () => {
    const ctx = runtime({
      pendingBeam: { ox: 0, oy: 50, cos: 1, sin: 0, maxT: 180, weaponIdx: 9, damage: 480 },
      enemies: [enemyAt({ y: 50, typeIndex: 17, jugShield: 100, dmgMult: 0.5 })],
      rageTimer: 10,
      critBonus: 1,
      critMultBonus: 0.5,
      weaponUpgrades: { 9: 3 },
    });
    ctx.perkMods.damageMult = 9; // Must not apply the current build a second time.
    ctx.combo.count = 4;
    stepProjectileFrame(ctx);
    expect(ctx.gs.totalDamage).toBeCloseTo(480 * 1.4 * 2.5 * 0.5 * 1.75 * 0.15);
    expect(ctx.stats.totalHits).toBe(1);
  });

  it.each([[24, true, 480], [25, true, 160], [26, true, 160], [24, false, 160]])("applies rail Last Resort at health %i with perk %s", (health, enabled, damage) => {
    const ctx = runtime({
      player: { x: 0, y: 50, health, maxHealth: 100 },
      pendingBeam: { ox: 0, oy: 50, cos: 1, sin: 0, maxT: 180, weaponIdx: 9, damage: 160 },
      enemies: [enemyAt({ y: 50 }), enemyAt({ x: 130, y: 50, typeIndex: 11 })],
      critBonus: -1,
    });
    ctx.perkMods.lastResort = enabled;
    stepProjectileFrame(ctx);
    expect(ctx.gs.enemies.map(e => 10000 - e.health)).toEqual([damage, damage]);
    expect(ctx.gs.totalDamage).toBe(damage * 2);
    expect(ctx.stats.totalHits).toBe(1);
  });

  it("stacks rail Last Resort once with snapshot, crit, combo, rage, armor and lifesteal", () => {
    const ctx = runtime({
      player: { x: 0, y: 50, health: 24, maxHealth: 100 },
      pendingBeam: { ox: 0, oy: 50, cos: 1, sin: 0, maxT: 180, weaponIdx: 9, damage: 480 },
      enemies: [enemyAt({ y: 50, typeIndex: 17, jugShield: 100, dmgMult: 0.5 })],
      critBonus: 1, critMultBonus: 0.5, rageTimer: 10,
    });
    ctx.combo.count = 4;
    ctx.perkMods = { lastResort: true, damageMult: 9, lifesteal: 0.01 };
    const damage = 480 * 3 * 1.4 * 2.5 * 0.5 * 1.75 * 0.15;
    stepProjectileFrame(ctx);
    expect(ctx.gs.totalDamage).toBeCloseTo(damage);
    expect(ctx.player.health).toBeCloseTo(24 + damage * 0.01);
  });

  it.each([[24, true, 480], [25, true, 160], [24, false, 160]])("keeps one beam's health bonus stable while healing from %iHP (perk %s)", (health, lastResort, damage) => {
    for (const reverse of [false, true]) {
      const targets = [enemyAt({ x: 80, y: 50 }), enemyAt({ x: 130, y: 50, dmgMult: 0.5 })];
      const ctx = runtime({
        player: { x: 0, y: 50, health, maxHealth: 100 },
        pendingBeam: { ox: 0, oy: 50, cos: 1, sin: 0, maxT: 180, weaponIdx: 9, damage: 160 },
        enemies: reverse ? [...targets].reverse() : targets,
        critBonus: -1,
      });
      ctx.perkMods = { lastResort, lifesteal: 0.01 };
      stepProjectileFrame(ctx);
      expect(targets.map(e => 10000 - e.health)).toEqual([damage, damage * 0.5]);
      expect(ctx.player.health).toBeCloseTo(health + damage * 1.5 * 0.01);
      expect(ctx.gs.totalDamage).toBe(damage * 1.5);
      expect(ctx.setHealth).toHaveBeenCalledTimes(2);
    }
  });

  it.each(["miss", "dead", "summoner", "multiple"])("counts rail %s contacts once per fired beam", kind => {
    const enemies = kind === "miss" ? [enemyAt({ y: 100 })]
      : kind === "dead" ? [enemyAt({ y: 50, health: 0 })]
        : kind === "summoner" ? [enemyAt({ y: 50, typeIndex: 18, summonerInvuln: true })]
          : [enemyAt({ y: 50 }), enemyAt({ x: 130, y: 50 })];
    const ctx = runtime({ pendingBeam: { ox: 0, oy: 50, cos: 1, sin: 0, maxT: 180, weaponIdx: 9, damage: 160 }, enemies });
    stepProjectileFrame(ctx);
    expect(ctx.stats.totalHits).toBe(["summoner", "multiple"].includes(kind) ? 1 : 0);
    stepProjectileFrame(ctx);
    expect(ctx.stats.totalHits).toBe(["summoner", "multiple"].includes(kind) ? 1 : 0);
  });
});

describe("enemy bullet boss lifesteal integration", () => {
  const makeBoss = (overrides = {}) => ({ isBossEnemy: true, hasLifesteal: true, health: 50, maxHealth: 100,
    x: 150, y: 100, size: 32, ...overrides });
  const bullet = (overrides = {}) => ({ x: 50, y: 50, vx: 0, vy: 0, life: 10, damage: 8, ...overrides });

  it("awards healing for one actual damaging hit and consumes the bullet without a second heal", () => {
    const ctx = runtime({ enemies: [makeBoss(), makeBoss({ health: 99 }), makeBoss({ _defeatPending: {} })], enemyBullets: [bullet(), bullet()] });
    stepProjectileFrame(ctx);
    expect(ctx.player.health).toBe(92);
    expect(ctx.gs.enemies.map((enemy) => enemy.health)).toEqual([52, 100, 50]);
    stepProjectileFrame(ctx);
    expect(ctx.gs.enemies[0].health).toBe(52);
  });

  it.each(["dash", "invincible", "miss", "zero", "wall", "already-dead"])("does not heal for %s", (kind) => {
    const ctx = runtime({ enemies: [makeBoss()], enemyBullets: [bullet()] });
    if (kind === "dash") ctx.dashActive = true;
    if (kind === "invincible") ctx.player.invincible = 5;
    if (kind === "miss") ctx.gs.enemyBullets[0].x = 100;
    if (kind === "zero") ctx.gs.enemyBullets[0].damage = 0;
    if (kind === "wall") ctx.gs.obstacles = [{ x: 40, y: 40, w: 20, h: 20 }];
    if (kind === "already-dead") ctx.player.health = 0;
    stepProjectileFrame(ctx);
    expect(ctx.gs.enemies[0].health).toBe(50);
  });

  it("does not collide player bullets with a boss's separate decoy", () => {
    const ctx = runtime({ enemies: [makeBoss({ cloneDecoy: { x: 30, y: 30, size: 32, remainingFrames: 100 } })],
      bullets: [{ x: 30, y: 30, vx: 0, vy: 0, life: 10, size: 5, damage: 25, color: "#FFF" }] });
    stepProjectileFrame(ctx);
    expect(ctx.gs.bullets[0].life).toBe(9);
    expect(ctx.gs.enemies[0].health).toBe(50);
    expect(ctx.stats.totalHits).toBe(0);
  });
});
