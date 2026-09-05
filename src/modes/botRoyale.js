// BOT ROYALE — offline battle royale (S163 tranche 3).
//
// Sixteen bots with internet-archetype sprites fight you and each other while
// the sewer floods inward. Bots are enemies (so the existing AI, projectile,
// and defeat paths apply) with a bot id; bot-versus-bot hits are resolved
// here from the enemy bullet stream. Outside the flood ring everyone takes
// damage. Last one flushing wins. No netcode, no wave spawns.
//
// The arena is 1.8× the viewport in each dimension with a scrolling camera
// (gs._camX / gs._camY) that follows the player; drawGame.js reads these to
// tile the background and apply a world→screen translate.

import { ENEMY_TYPES } from "../constants.js";
import { getRunRng } from "../systems/runRng.js";
import { retireEnemyWithoutDefeat } from "../systems/enemyDefeatLifecycle.js";

const BOT_COUNT = 16;
const WORLD_SCALE = 1.8; // arena is WORLD_SCALE × the viewport in each dimension
const BOT_TYPES = [0, 1, 2, 3, 5, 6, 7, 8]; // non-boss archetypes with sprites
const HANDLES = ["xX_PlungerLord_Xx", "KarenSlayer99", "rentfree", "definitely_not_a_bot", "sewer_sommelier", "mom_said_no", "ratioed", "flushgod", "porcelain_prince", "wifi_password", "LowBatteryLarry", "clogmaster", "NPC_Slayer", "ToxicYeet42", "TouchGrassBro", "DrainMasterFlex"];
const FLOOD_PHASE_FRAMES = 20 * 60;
const FLOOD_MIN_R = 120;
const FLOOD_DOT = 0.35;
const DROP_FRAMES = 4 * 60; // everyone holds position while the sewer floods in

function spawnBot(gs, index, ctx) {
  const rng = getRunRng(gs, "royale");
  const W = ctx.W || gs._W || 1280, H = ctx.H || gs._H || 720;
  const worldW = W * WORLD_SCALE, worldH = H * WORLD_SCALE;
  const typeIndex = BOT_TYPES[Math.floor(rng() * BOT_TYPES.length)];
  const type = ENEMY_TYPES[typeIndex];
  const angle = (index / BOT_COUNT) * Math.PI * 2 + rng() * 0.3;
  const radius = Math.min(worldW, worldH) * 0.38;
  const bot = {
    id: `bot-${index}`,
    isBot: true,
    x: worldW / 2 + Math.cos(angle) * radius, y: worldH / 2 + Math.sin(angle) * radius,
    health: 140, maxHealth: 140,
    speed: 1.9 + rng() * 0.6, size: 36, color: type.color, name: HANDLES[index % HANDLES.length], points: 250,
    deathQuotes: ["gg ez", "lag", "my controller died", "reported", "this is rigged", "brb mom"],
    emoji: type.emoji, typeIndex,
    wobble: rng() * Math.PI * 2, hitFlash: 0,
    ranged: true, projSpeed: 5.2, projRate: 95 + Math.floor(rng() * 50), shootTimer: -DROP_FRAMES,
    _spawnX: 0, _spawnY: 0,
    isBossEnemy: false, freezeTimer: 0,
  };
  bot._spawnX = bot.x; bot._spawnY = bot.y;
  gs.enemies.push(bot);
  return bot;
}

function aliveBots(gs) {
  return (gs.enemies || []).filter((e) => e && e.isBot && !e._defeatResolved);
}

export const BOT_ROYALE = Object.freeze({
  id: "bot_royale",
  kind: "mode",
  label: "BOT ROYALE",
  replayEligible: false,
  rulesetId: "standard",
  allies: null,
  arena: { themePool: [1, 4, 6] },
  hud: { squad: false, zones: false, parTimer: false, verbObjective: false, floodRing: true },
  usesDirectorObjectives: false,
  botCount: BOT_COUNT,

  init(gs, ctx) {
    const W = ctx.W || gs._W || 1280, H = ctx.H || gs._H || 720;
    const worldW = W * WORLD_SCALE, worldH = H * WORLD_SCALE;
    // Scrolling camera: store world dimensions and initial camera position.
    gs._royaleWorld = { W: worldW, H: worldH };
    gs._camX = 0;
    gs._camY = 0;
    for (let i = 0; i < BOT_COUNT; i += 1) spawnBot(gs, i, ctx);
    gs.flood = { cx: worldW / 2, cy: worldH / 2, r: Math.hypot(worldW, worldH) / 2, targetR: Math.hypot(worldW, worldH) / 2, phase: 0, nextShrinkFrame: FLOOD_PHASE_FRAMES };
    gs._royaleAlive = BOT_COUNT;
    gs._royaleKills = 0;
    gs._royalePlacement = null;
    gs.maxEnemiesThisWave = 0;
    gs.enemiesThisWave = 0;
    // The flood is the only hazard; static acid pools at spawn made the drop unfair.
    gs.hazards = [];
    gs.player.invincible = DROP_FRAMES + 30;
    // Place player at world center for the drop.
    gs.player.x = worldW / 2;
    gs.player.y = worldH / 2 + 80;
    ctx.addText?.(gs, worldW / 2, worldH / 2 - 120, "🌊 DROP IN · 4s", "#33E6FF", true);
  },

  isBossWave() { return false; },
  waveEnemyCount() { return 0; },

  step(gs, ctx) {
    const p = gs.player;
    const W = ctx.W || gs._W || 1280, H = ctx.H || gs._H || 720;
    const worldW = (gs._royaleWorld?.W) || W * WORLD_SCALE;
    const worldH = (gs._royaleWorld?.H) || H * WORLD_SCALE;
    const frame = gs.frame || 0;
    const bots = aliveBots(gs);
    gs._royaleAlive = bots.length;

    // Update scrolling camera: center on player, clamped to world bounds.
    gs._camX = Math.max(0, Math.min(p.x - W / 2, worldW - W));
    gs._camY = Math.max(0, Math.min(p.y - H / 2, worldH - H));

    // Drop phase: bots hold their landing spots; nobody fires yet.
    if (frame < DROP_FRAMES) {
      for (const b of bots) { b.x = b._spawnX; b.y = b._spawnY; }
      if (frame % 60 === 0 && frame > 0) ctx.addText?.(gs, worldW / 2, worldH / 2 - 120, `🌊 DROP IN · ${Math.ceil((DROP_FRAMES - frame) / 60)}s`, "#33E6FF", true);
    }

    // Free-for-all: every bot sees every other bot as a target candidate.
    gs._targetables = bots.map((b) => ({ x: b.x, y: b.y, alive: true, kind: "bot", id: b.id }));

    // Bot-versus-bot hits from the enemy bullet stream.
    const bullets = gs.enemyBullets || [];
    for (let i = bullets.length - 1; i >= 0; i -= 1) {
      const eb = bullets[i];
      if (!eb || !eb.sourceId) continue;
      for (const b of bots) {
        if (b.id === eb.sourceId) continue;
        if (Math.hypot(eb.x - b.x, eb.y - b.y) < b.size / 2 + (eb.size || 4)) {
          b.health -= eb.damage || 6;
          b.hitFlash = 6;
          bullets.splice(i, 1);
          if (b.health <= 0) {
            retireEnemyWithoutDefeat(b, "flushed-by-bot");
            ctx.addText?.(gs, b.x, b.y - 30, `${b.name} flushed by ${(gs.enemies.find((e) => e.id === eb.sourceId) || {}).name || "the sewer"}`, "#7CFFB8");
            ctx.addParticles?.(gs, b.x, b.y, b.color, 14);
          }
          break;
        }
      }
    }

    // Flood ring shrinks in phases.
    const flood = gs.flood;
    if (flood) {
      if (frame >= flood.nextShrinkFrame) {
        flood.phase += 1;
        flood.targetR = Math.max(FLOOD_MIN_R, flood.targetR * 0.62);
        flood.nextShrinkFrame = frame + FLOOD_PHASE_FRAMES;
        const rng = getRunRng(gs, "royale");
        flood.cx = Math.max(flood.targetR, Math.min(worldW - flood.targetR, flood.cx + (rng() - 0.5) * 320));
        flood.cy = Math.max(flood.targetR, Math.min(worldH - flood.targetR, flood.cy + (rng() - 0.5) * 220));
        ctx.addText?.(gs, worldW / 2, worldH / 2 - 120, `🌊 THE SEWER FLOODS · PHASE ${flood.phase}`, "#33E6FF", true);
      }
      if (flood.r > flood.targetR) flood.r = Math.max(flood.targetR, flood.r - 1.2);
      // Damage outside the ring.
      if (Math.hypot(p.x - flood.cx, p.y - flood.cy) > flood.r && p.invincible <= 0) {
        p.health -= FLOOD_DOT;
        if (frame % 45 === 0) ctx.addText?.(gs, p.x, p.y - 30, "🌊 FLOODING", "#33E6FF");
        ctx.setHealth?.(Math.max(0, Math.floor(p.health)));
        if (p.health <= 0) ctx.handlePlayerDeath?.(gs);
      }
      for (const b of bots) {
        if (Math.hypot(b.x - flood.cx, b.y - flood.cy) > flood.r) {
          b.health -= FLOOD_DOT * 1.5;
          if (b.health <= 0) { retireEnemyWithoutDefeat(b, "flooded"); ctx.addText?.(gs, b.x, b.y - 30, `${b.name} drowned`, "#33E6FF"); }
        }
      }
    }

    // Supply drops keep the fight moving.
    if (frame > 0 && frame % (12 * 60) === 0) {
      const rng = getRunRng(gs, "royale");
      const type = rng() < 0.5 ? "health" : "ammo";
      gs.pickups.push({ x: flood ? flood.cx + (rng() - 0.5) * flood.r : worldW / 2, y: flood ? flood.cy + (rng() - 0.5) * flood.r : worldH / 2, type, life: 60 * 20 });
    }
  },

  onEnemyKilled(gs, enemy) {
    if (enemy?.isBot) gs._royaleKills = (gs._royaleKills || 0) + 1;
  },

  winCondition(gs) {
    return gs._royaleAlive === 0 ? "win" : null;
  },

  placement(gs) {
    return (gs._royaleAlive || 0) + 1;
  },

  banner(gs) {
    return `${gs._royaleAlive ?? BOT_COUNT} BOTS LEFT · ${gs._royaleKills || 0} FLUSHED · PHASE ${gs.flood?.phase || 0}`;
  },

  progress(gs) {
    const f = gs.flood;
    const untilShrink = f ? Math.max(0, f.nextShrinkFrame - (gs.frame || 0)) / 60 : 0;
    return { label: "FLOOD", value: untilShrink, pct: f ? 1 - untilShrink / (FLOOD_PHASE_FRAMES / 60) : 0, unit: "s", pressure: f ? Math.max(0, 1 - f.r / 400) : 0 };
  },
});
