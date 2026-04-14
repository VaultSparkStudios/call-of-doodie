// ── Pure game-loop helpers ────────────────────────────────────────────────────
// These functions operate directly on the mutable `gs` object and require no
// React refs or setters, making them safe to call from the game loop and easy
// to test in isolation.

import { ENEMY_TYPES, DIFFICULTIES, BOSS_ABILITY_POOL } from "./constants.js";

// Boss type rotation: wave 5→Karen, 10→Splitter, 15→Juggernaut, 20→Summoner, 25→Landlord, 30→Algorithm, repeats
export const BOSS_ROTATION = [4, 16, 17, 18, 9, 20];
export const ELITE_TYPES = ["armored", "fast", "explosive"];

export function getRandomEliteType(random = Math.random) {
  return ELITE_TYPES[Math.floor(random() * ELITE_TYPES.length)];
}

export function applyEliteType(enemy, eliteType) {
  if (!enemy || enemy.isBossEnemy || enemy.eliteType) return enemy;
  enemy.eliteType = eliteType;
  if (eliteType === "fast") {
    enemy.speed *= 2;
    enemy.size *= 0.75;
  } else if (eliteType === "armored") {
    enemy.dmgMult = 0.45;
    enemy.health *= 1.5;
    enemy.maxHealth = enemy.health;
  }
  return enemy;
}

// ── spawnEnemy ────────────────────────────────────────────────────────────────
export function spawnEnemy(gs, W, H, difficultyId) {
  const wv = gs.currentWave;
  let ti = 0;
  const r = Math.random();
  if      (wv >= 15 && r < 0.05) ti = 13;
  else if (wv >= 13 && r < 0.10) ti = 12;
  else if (wv >= 10 && r < 0.15) ti = 11;
  else if (wv >= 12 && r < 0.21) ti = 9;
  else if (wv >= 10 && r < 0.27) ti = 4;
  else if (wv >= 9  && r < 0.33) ti = 10;
  else if (wv >= 9  && r < 0.39) ti = 19; // Doomscroller
  else if (wv >= 8  && r < 0.44) ti = 3;
  else if (wv >= 7  && r < 0.49) ti = 8;
  else if (wv >= 6  && r < 0.55) ti = 7;
  else if (wv >= 5  && r < 0.61) ti = 6;
  else if (wv >= 4  && r < 0.67) ti = 2;
  else if (wv >= 3  && r < 0.73) ti = 5;
  else if (wv >= 2  && r < 0.80) ti = 1;

  const side = Math.floor(Math.random() * 4);
  let x, y;
  if (side === 0) { x = Math.random() * W; y = -30; }
  else if (side === 1) { x = W + 30; y = Math.random() * H; }
  else if (side === 2) { x = Math.random() * W; y = H + 30; }
  else { x = -30; y = Math.random() * H; }

  const type = ENEMY_TYPES[ti];
  const diff = DIFFICULTIES[difficultyId] || DIFFICULTIES.normal;
  const pm = gs.prestigeMult || 1;
  const sizeMut = gs.mutEnemySizeMult || 1;
  const hpMut   = gs.mutEnemyHPMult  || 1;
  const eHealth = type.health * (1 + wv * 0.12) * diff.healthMult * pm * (gs.settEnemyHealthMult || 1) * hpMut;
  const projRateMut = gs.mutEnemyFireRateMult || 1;
  gs.enemies.push({
    x, y, health: eHealth, maxHealth: eHealth,
    speed: type.speed * (1 + wv * 0.05) * diff.speedMult * pm * (gs.settEnemySpeedMult || 1) * (gs.waveEventSpeedMult || 1) * (gs.mutEnemySpeedExtra || 1) * (gs.hyperspeedActive ? 1.4 : 1),
    size: type.size * sizeMut, color: type.color, name: type.name, points: type.points,
    deathQuotes: type.deathQuotes, emoji: type.emoji, typeIndex: ti,
    wobble: Math.random() * Math.PI * 2, hitFlash: 0,
    ranged: type.ranged || false, projSpeed: (type.projSpeed || 0) * (gs.mutEnemyProjSpeed || 1),
    projRate: type.projRate ? Math.floor(type.projRate * projRateMut) : 999,
    shootTimer: Math.floor(Math.random() * 60), isBossEnemy: false,
    // Weekly mutation: spawn frozen
    freezeTimer: gs.mutSpawnFrozen || 0,
  });
  // Elite variants (wave 10+, regular enemies only)
  if (wv >= 10) {
    const elite = gs.enemies[gs.enemies.length - 1];
    const er = Math.random();
    // Weekly mutation overrides
    if (gs.mutAlwaysEnraged)  { elite.enrageTriggered = true; elite.speed *= 1.8; }
    if (gs.mutAllExplosive)   { applyEliteType(elite, "explosive"); }
    if (wv >= 40 && er < (wv >= 50 ? 0.25 : 0.15) && !gs.mutAllExplosive) {
      // Berserker: fast + armored combined (15% wave 40-49, 25% wave 50+)
      elite.eliteType = "berserker";
      elite.speed    *= 1.7;
      elite.size     *= 0.8;
      elite.dmgMult   = 0.5;
      elite.health   *= 1.3;
      elite.maxHealth = elite.health;
    } else if (wv >= 15 && er < 0.10) {
      applyEliteType(elite, "explosive");
    } else if (wv >= 12 && er < 0.25) {
      applyEliteType(elite, "fast");
    } else if (er < 0.20) {
      applyEliteType(elite, "armored");
    }
  }
}

// ── spawnBoss ─────────────────────────────────────────────────────────────────
export function spawnBoss(gs, W, H, difficultyId, typeIndex) {
  const type = ENEMY_TYPES[typeIndex];
  const diff = DIFFICULTIES[difficultyId] || DIFFICULTIES.normal;
  const pm = gs.prestigeMult || 1;
  const wv = gs.currentWave;
  const bossHealth = type.health * (1 + wv * 0.12) * diff.healthMult * pm * 2.5;
  const side = Math.floor(Math.random() * 4);
  let x, y;
  if (side === 0) { x = W / 2; y = -50; }
  else if (side === 1) { x = W + 50; y = H / 2; }
  else if (side === 2) { x = W / 2; y = H + 50; }
  else { x = -50; y = H / 2; }
  gs.enemies.push({
    x, y, health: bossHealth, maxHealth: bossHealth,
    speed: type.speed * (1 + wv * 0.05) * diff.speedMult * pm * 0.8,
    size: type.size * 1.5, color: type.color,
    name: "☠ " + type.name, points: type.points * 3,
    deathQuotes: type.deathQuotes, emoji: type.emoji,
    typeIndex, wobble: 0, hitFlash: 0,
    ranged: type.ranged || false,
    projSpeed: (type.projSpeed || 0) * 1.3,
    projRate: type.projRate ? Math.floor(type.projRate * 0.65) : 999,
    shootTimer: 0, isBossEnemy: true,
    chargeTimer: 0, chargeActive: false, chargeDx: 0, chargeDy: 0, chargeDuration: 0,
    summonTimer: 0,
    // mutBossEarly: abilities unlock N waves sooner (mutation "Boss Party")
    hasShieldPulse: typeIndex === 4 && wv >= 20 - (gs.mutBossEarly || 0),
    shieldPulseActive: false, shieldPulseCooldown: 300, shieldPulseTimer: 0,
    hasEnrage: wv >= 30 - (gs.mutBossEarly || 0), enrageTriggered: false,
    hasTeleport: typeIndex === 4 && wv >= 35 - (gs.mutBossEarly || 0), teleportTimer: 0,
    hasMinionSurge: typeIndex === 9 && wv >= 25 - (gs.mutBossEarly || 0),
    hasRentNuke: typeIndex === 9 && wv >= 40 - (gs.mutBossEarly || 0), rentNukeTimer: 0,
    hasBulletRing: wv >= 10 - (gs.mutBossEarly || 0), bulletRingTimer: 0,
    hasGroundSlam: wv >= 15 - (gs.mutBossEarly || 0),
    groundSlamTimer: Math.floor(Math.random() * 180),
    groundSlamActive: false, groundSlamRadius: 0,
    sharedAbilityCooldown: 0,
    bulletRingWarning: false, groundSlamWarning: false,
  });
  const boss = gs.enemies[gs.enemies.length - 1];
  // ── Splitter (16): splits into 3 mini-bosses on death ──
  if (typeIndex === 16) {
    boss.splitOnDeath = true;
    boss.splitDone = false;
  }
  // ── Juggernaut (17): shield + charge ──
  if (typeIndex === 17) {
    const shieldHP = bossHealth * 0.45;
    boss.jugShield = shieldHP;
    boss.jugShieldMax = shieldHP;
    boss.jugShieldRegenDelay = 0;  // frames until shield starts recharging
    boss.jugChargeWindup = 0;       // frames of windup remaining
    boss.jugCharging = false;
    boss.jugChargeDx = 0; boss.jugChargeDy = 0;
    boss.jugChargeFrames = 0;
    boss.jugChargeCooldown = 220;   // start with a brief cooldown
    boss.jugStunned = 0;            // frames stunned after wall-hit
  }
  // ── Summoner (18): summons elites, invulnerable while summons live ──
  if (typeIndex === 18) {
    boss.summonerTimer = 180;         // frames until first summon
    boss.summonerCount = 0;           // currently alive summons
    boss.summonerMaxCount = 3;
    boss.summonerVulnTimer = 0;       // frames of vulnerability remaining
    boss.summonerId = Date.now() + Math.random(); // unique ID
    boss.summonerInvuln = false;      // true while summons alive
    boss.summonerFirstSummon = true;  // portal VFX shown before first summon
  }
  // ── The Algorithm (20): viral surge — triples spawn rate briefly every ~360 frames ──
  if (typeIndex === 20) {
    boss.viralSurgeCooldown = 420;    // frames until first surge
    boss.viralSurgeTimer = 420;
    boss.viralSurgeActive = 0;        // frames remaining in current surge
    boss.algoSpreadTimer = 0;         // for 3-shot burst spread
  }
  // ── The Developer (21): debug mode, hotfix, merge conflict ──
  if (typeIndex === 21) {
    boss.hasDebugMode = true;
    boss.debugModeTimer = 0;
    boss.debugModeCooldown = 480; // 8s
    boss.hasHotfix = true;
    boss.hotfixUsed = false;
    boss.hasMergeConflict = true;
    boss.mergeConflictTimer = 0;
    boss.mergeConflictCooldown = 360;
  }
  // ── Assign 2 random bonus abilities from the pool ──
  // Developer boss (21) already has complex abilities; skip pool for him
  if (typeIndex !== 21) {
    const _usedIds = new Set();
    let _attempts = 0;
    while ((!boss._bonusAbilities || boss._bonusAbilities.length < 2) && _attempts < 20) {
      _attempts++;
      const _idx = Math.floor(Math.random() * BOSS_ABILITY_POOL.length);
      const _ab = BOSS_ABILITY_POOL[_idx];
      if (!_usedIds.has(_ab.id)) {
        _usedIds.add(_ab.id);
        _ab.apply(boss, gs.currentWave || 1);
        if (!boss._bonusAbilities) boss._bonusAbilities = [];
        boss._bonusAbilities.push(_ab.id);
      }
    }
  }
}
