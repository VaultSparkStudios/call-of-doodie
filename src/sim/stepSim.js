// stepSim — headless simulation kernel (S163).
//
// Composes the extracted pure systems (movement, projectiles, enemies, allies,
// transients, spawn/wave tick) into one deterministic step that runs in Node
// with no DOM, canvas, React, or audio. The live game in App.jsx still drives
// its own richer frame (reward modals, announcements, analytics); this kernel
// is the contract that mode definitions, allied units, replay resimulation,
// and lockstep netcode build on.
//
// Honest boundary: weapon firing here is a single-projectile model driven by
// `input.fire`; App's spread/burst/hitscan/reload flow is not replicated yet.
// Wave rewards (perks, shop, routes) are host concerns and are emitted as
// `events` for the host to resolve.

import { DIFFICULTIES, WEAPONS } from "../constants.js";
import { spawnEnemy as defaultSpawnEnemy } from "../gameHelpers.js";
import { applyPlayerMovement } from "../systems/gameStep.js";
import { stepProjectileFrame } from "../systems/projectileFrame.js";
import { stepEnemyFrame } from "../systems/enemyFrame.js";
import { stepAllies } from "../systems/allyUnit.js";
import { stepTransientEffectsInPlace } from "../systems/transientLifecycle.js";
import { compactTruthyInPlace } from "../systems/frameIndex.js";
import { takeQueuedEnemyDefeat, collectQueuedEnemyDefeats } from "../systems/enemyDefeatLifecycle.js";
import { createPressureArc } from "../systems/pressureArc.js";
import { createDamageSequence } from "../systems/damageSequence.js";
import { RUN_PHASE } from "../systems/runTermination.js";
import { buildArenaEnvironment } from "../systems/arenaEnvironment.js";

export const SIM_SCHEMA_VERSION = "sim-state-v1";

export function createSimInput(overrides = {}) {
  return {
    move: { dx: 0, dy: 0 },
    aim: null,           // radians, or null to keep the current angle
    fire: false,
    order: null,         // ally order id (follow|hold|attack) or null
    ...overrides,
  };
}

/**
 * Build a minimal deterministic sim state. Mirrors the load-bearing fields of
 * App.jsx's `gs` construction; anything the extracted systems read defaults
 * here so a partial state never produces NaN.
 */
export function createSimState({
  seed = 1,
  W = 1280,
  H = 720,
  difficulty = "normal",
  mode = "standard",
  weaponIndex = 0,
  arena = true,
} = {}) {
  const diff = DIFFICULTIES[difficulty] || DIFFICULTIES.normal;
  const gs = {
    schemaVersion: SIM_SCHEMA_VERSION,
    runPhase: RUN_PHASE.PLAYING,
    runEndCause: null,
    mode,
    difficulty,
    runSeed: Number(seed) >>> 0,
    frame: 0,
    player: { x: W / 2, y: H / 2, angle: 0, health: diff.playerHP, maxHealth: diff.playerHP, speed: 4, invincible: 0 },
    enemies: [], bullets: [], particles: [], pickups: [], grenades: [], enemyBullets: [],
    dyingEnemies: [], obstacles: [], terrain: [], floorZones: [], props: [], hazards: [], mapTheme: 0,
    allies: [], zones: [], structures: [], flood: null, alarm: 0,
    spawnTimer: 0, enemiesThisWave: 0, maxEnemiesThisWave: 5,
    currentWave: 1, score: 0, kills: 0, killstreakCount: 0, damageThisWave: 0,
    floatingTexts: [], screenShake: 0, muzzleFlash: 0, ammoCount: WEAPONS[weaponIndex].ammo,
    weaponAmmos: WEAPONS.map((w) => w.ammo),
    weaponMods: {},
    weaponUpgrades: WEAPONS.map(() => 0),
    damageFlash: 0, killFlash: 0, totalDamage: 0, trail: [],
    bossWave: false,
    coinStreakKills: 0, coinStreakTimer: 0, coinMultActive: false, coinMultTimer: 0,
    waveDirector: null, waveDirectorStage: -1, waveTelemetryBand: null, wavePlanLedger: [],
    pressureArc: createPressureArc(), damageSequence: createDamageSequence(),
    precisionStreak: 0,
    killScoreMult: 1,
    _fireTimer: 0,
    _weaponIndex: weaponIndex,
    _W: W, _H: H,
  };
  if (arena) {
    try {
      const env = buildArenaEnvironment({ seed: gs.runSeed, width: W, height: H });
      Object.assign(gs, env);
    } catch { /* arena is optional for kernel tests */ }
  }
  return gs;
}

function fireOnce(gs, ctx) {
  const idx = gs._weaponIndex || 0;
  const weapon = WEAPONS[idx];
  if (!weapon) return false;
  const rateFrames = Math.max(1, Math.round((weapon.fireRate || 200) / (1000 / 60)));
  if (gs._fireTimer > 0) return false;
  if (gs.ammoCount <= 0) return false;
  gs._fireTimer = rateFrames;
  gs.ammoCount -= 1;
  gs.weaponAmmos[idx] = gs.ammoCount;
  const p = gs.player;
  const speed = weapon.bulletSpeed || 12;
  gs.bullets.push({
    x: p.x, y: p.y,
    vx: Math.cos(p.angle) * speed, vy: Math.sin(p.angle) * speed,
    life: weapon.bulletLife || 60,
    damage: weapon.damage || 10,
    size: weapon.bulletSize || 5,
    color: weapon.color || "#FFD700",
    wpnIdx: idx,
    pierceLeft: weapon.pierce || 0,
    owner: "player",
  });
  ctx.events.push({ type: "shot", frame: gs.frame, weapon: idx });
  return true;
}

function spawnTick(gs, ctx) {
  if (gs.bossWave) return;
  gs.spawnTimer += 1;
  const diff = DIFFICULTIES[gs.difficulty] || DIFFICULTIES.normal;
  const baseSpawnRate = Math.max(6, Math.floor((100 - gs.currentWave * 7) * (diff.spawnMult || 1)));
  if (gs.spawnTimer >= baseSpawnRate && gs.enemiesThisWave < gs.maxEnemiesThisWave) {
    gs.spawnTimer = 0;
    gs.enemiesThisWave += 1;
    ctx.spawnEnemy(gs, gs._W, gs._H, gs.difficulty);
    ctx.events.push({ type: "spawn", frame: gs.frame, wave: gs.currentWave });
  }
}

function resolveDefeats(gs, ctx) {
  const queued = collectQueuedEnemyDefeats(gs.enemies);
  for (const enemy of queued) {
    const meta = takeQueuedEnemyDefeat(enemy);
    gs.kills += 1;
    gs.score += Math.round(10 * (gs.killScoreMult || 1) * (meta?.owner === "ally" ? 0.5 : 1));
    ctx.events.push({ type: "kill", frame: gs.frame, typeIndex: enemy.typeIndex, owner: meta?.owner || "player" });
    ctx.hooks.onEnemyKilled?.(gs, enemy, meta);
  }
  if (queued.length) gs.enemies = gs.enemies.filter((e) => !e._defeatResolved);
}

function waveTick(gs, ctx) {
  if (gs.enemiesThisWave >= gs.maxEnemiesThisWave && gs.enemies.length === 0) {
    gs.currentWave += 1;
    gs.enemiesThisWave = 0;
    gs.maxEnemiesThisWave = 5 + gs.currentWave * 2;
    gs.spawnTimer = 0;
    ctx.events.push({ type: "wave", frame: gs.frame, wave: gs.currentWave });
    ctx.hooks.onWaveStart?.(gs, gs.currentWave);
  }
}

/**
 * Advance the simulation by exactly one 60Hz step.
 *
 * @param {object} gs   simulation state from createSimState (mutated in place)
 * @param {object} input createSimInput()
 * @param {object} ctx  optional { spawnEnemy, hooks: {beforeStep, afterEnemies, onEnemyKilled, onWaveStart, winCondition} }
 * @returns {{ ok: boolean, events: object[], verdict: null|"win"|"lose" }}
 */
export function stepSim(gs, input = createSimInput(), ctx = {}) {
  if (!gs || !gs.player) return { ok: false, events: [], verdict: null };
  if ((gs.runPhase || RUN_PHASE.PLAYING) !== RUN_PHASE.PLAYING) return { ok: false, events: [], verdict: gs.runEndCause };
  const context = {
    spawnEnemy: ctx.spawnEnemy || defaultSpawnEnemy,
    hooks: ctx.hooks || {},
    events: [],
  };
  const W = gs._W, H = gs._H, p = gs.player;

  gs.enemies = compactTruthyInPlace(gs.enemies);
  gs.enemyBullets = compactTruthyInPlace(gs.enemyBullets);
  gs.bullets = compactTruthyInPlace(gs.bullets);
  gs.grenades = compactTruthyInPlace(gs.grenades);
  gs.pickups = compactTruthyInPlace(gs.pickups);

  context.hooks.beforeStep?.(gs, input);

  // Player
  applyPlayerMovement(p, input.move || { dx: 0, dy: 0 }, {
    dashActive: false,
    adrenalineRushTimer: gs.adrenalineRushTimer || 0,
    rubbleSlowed: !!gs._rubbleSlowed,
    W, H,
    obstacles: gs.obstacles || [],
  });
  if (Number.isFinite(input.aim)) p.angle = input.aim;
  if (p.invincible > 0) p.invincible -= 1;
  if (gs._fireTimer > 0) gs._fireTimer -= 1;
  if (input.fire) fireOnce(gs, context);
  if (input.order) gs._pendingAllyOrder = input.order;

  spawnTick(gs, context);

  let dead = false;
  const handlePlayerDeath = () => { dead = true; };
  const stats = gs._stats || (gs._stats = { totalHits: 0, crits: 0, bestPrecisionStreak: 0, objectiveChains: {} });
  const combo = gs._combo || (gs._combo = { count: 0 });
  const lastHitSoundRef = { current: 0 };

  stepProjectileFrame({
    gs, player: p, world: { W, H }, weaponIndex: gs._weaponIndex || 0, frame: gs.frame,
    dashActive: false, perkMods: gs._perkMods || {}, stats, combo, lastHitSoundRef,
    handlePlayerDeath,
  });
  stepEnemyFrame({ gs, player: p, world: { W, H }, frame: gs.frame, dashActiveFrames: 0, spawnEnemy: (g) => context.spawnEnemy(g, W, H, gs.difficulty), handlePlayerDeath });
  stepAllies(gs, { W, H, frame: gs.frame, handlePlayerDeath });
  context.hooks.afterEnemies?.(gs);
  resolveDefeats(gs, context);
  stepTransientEffectsInPlace(gs);
  waveTick(gs, context);

  gs.frame += 1;

  let verdict = null;
  if (dead || p.health <= 0) verdict = "lose";
  else if (context.hooks.winCondition) verdict = context.hooks.winCondition(gs) || null;
  if (verdict) {
    gs.runPhase = RUN_PHASE.ENDED;
    gs.runEndCause = verdict;
    context.events.push({ type: "end", frame: gs.frame, verdict });
  }
  return { ok: true, events: context.events, verdict };
}

/** Run N steps with a fixed or per-frame input generator. */
export function runSim(gs, frames, inputFor = () => createSimInput(), ctx = {}) {
  const events = [];
  let verdict = null;
  for (let i = 0; i < frames; i += 1) {
    const input = typeof inputFor === "function" ? inputFor(i, gs) : inputFor;
    const r = stepSim(gs, input, ctx);
    if (r.events.length) events.push(...r.events);
    if (r.verdict) { verdict = r.verdict; break; }
    if (!r.ok) break;
  }
  return { gs, events, verdict };
}
