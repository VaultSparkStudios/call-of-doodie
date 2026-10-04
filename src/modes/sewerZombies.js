import { getZombieOutbreakPlan } from "../systems/zombieMode.js";
import { DIFFICULTIES } from "../constants.js";
const PUMP_FRAMES = 360;
const FLOOD_FRAMES = 240 * 60;
export function createSewerRun(W = 1280, H = 720) {
  return { phase: "pumps", frames: 0, sludge: 0, lastKills: 0, pumps: [{ x: W * 0.23, y: H * 0.28 }, { x: W * 0.77, y: H * 0.28 }, { x: W * 0.5, y: H * 0.72 }].map((p, i) => ({ ...p, label: `PUMP ${i + 1}`, charge: 0, complete: false, radius: 66 })), activePump: 0, hatch: { x: W * 0.5, y: H * 0.14, radius: 66, charge: 0 }, completedPumps: 0, holdBlocked: false, fuelTick: 0, extractionFrames: 0 };
}
export function stepSewerRun(gs) {
  const s = gs.sewerRun;
  if (!s || s.phase === "escaped" || s.phase === "flooded") return [];
  const events = [];
  s.frames++;
  const kills = Math.max(0, gs.kills || 0);
  s.sludge = Math.min(99, s.sludge + Math.max(0, kills - s.lastKills)); s.lastKills = kills;
  if (s.frames >= FLOOD_FRAMES) { s.phase = "flooded"; return [{ type: "flooded" }]; }
  const target = s.phase === "pumps" ? s.pumps[s.activePump] : s.hatch;
  const near = Math.hypot(gs.player.x - target.x, gs.player.y - target.y) < target.radius;
  const contested = (gs.enemies || []).some(e => e.health > 0 && Math.hypot(e.x - target.x, e.y - target.y) < target.radius + e.size / 2);
  s.holdBlocked = contested;
  s.holding = near && !contested;
  if (s.phase === "pumps" && s.holding && (s.sludge > 0 || s.fuelTick > 0)) {
    if (s.fuelTick <= 0) { s.sludge--; s.fuelTick = 60; }
    s.fuelTick--; target.charge++;
    if (target.charge >= PUMP_FRAMES) {
      target.complete = true; s.completedPumps++; s.activePump++; s.fuelTick = 0;
      gs.score = (gs.score || 0) + 1500;
      events.push({ type: "pump", pump: target });
      if (s.pacing === "pumps" && s.completedPumps < 3) s.pendingEntrance = s.completedPumps === 1 ? "sprinter" : "screecher";
      // Each pump restores some health immediately, with no reward modal.
      gs.player.health = Math.min(gs.player.maxHealth || 100, gs.player.health + 15);
      if (s.completedPumps === 3) { s.phase = "extraction"; events.push({ type: "hatch" }); }
    }
  } else if (s.phase === "extraction") {
    s.extractionFrames++;
    if (s.holding) s.hatch.charge++;
    // Progress holds when forced out: pressure never erases earned escape time.
    if (s.hatch.charge >= 300) { s.phase = "escaped"; gs.score = (gs.score || 0) + 4000; events.push({ type: "escaped" }); }
  }
  return events;
}
export const SEWER_ZOMBIES = Object.freeze({
  id: "zombies", kind: "mode", label: "SEWER ZOMBIES", replayEligible: false, rulesetId: "zombies", allies: [],
  arena: { themePool: [8] }, hud: { squad: false, zones: false, parTimer: false, verbObjective: false }, usesDirectorObjectives: false,
  init(gs, ctx = {}) {
    gs.runDifficulty = ctx.difficulty || gs.runDifficulty || "normal";
    gs.zombiesMode = true;
    gs.sewerRun = createSewerRun(ctx.W || gs._W || 1280, ctx.H || gs._H || 720);
    gs.sewerRun.lastKills = gs.kills || 0;
    gs._targetables = [];
    // Three lanes connect pump stations; sewer obstacles are mode-owned.
    const W = ctx.W || gs._W || 1280, H = ctx.H || gs._H || 720;
    gs.obstacles = [{ x: W * 0.38, y: H * 0.32, w: W * 0.09, h: H * 0.16 }, { x: W * 0.53, y: H * 0.32, w: W * 0.09, h: H * 0.16 }];
    gs.hazards = []; gs.floorZones = []; gs.terrain = []; gs.props = [];
    gs.player.x = W / 2; gs.player.y = H * 0.55;
    gs.bossWave = false;
    gs.sewerSpawnTimer = 45;
    gs.zombieOutbreak = getZombieOutbreakPlan(1);
    ctx.announce?.(gs, "KILL FOR SLUDGE · POWER THREE PUMPS · ESCAPE THE BACKFLOW", "#a8df82", true);
  },
  isBossWave() { return false; },
  waveEnemyCount(gs, computed) { return Math.min(50, Math.max(12, Math.round(computed * 0.9))); },
  onWaveStart(gs, ctx) { ctx.announce?.(gs, gs.sewerRun?.phase === "extraction" ? "HATCH OPEN · GET OUT BEFORE THE BACKFLOW" : "KILL FOR SLUDGE · STAND ON THE MARKED PUMP", "#a8df82", true); },
  step(gs, ctx = {}) {
    const s = gs.sewerRun;
    if (!s || s.phase === "escaped" || s.phase === "flooded") return;
    // This is a continuous pursuit, never a classic clear-wave intermission.
    // Every 30 seconds the sewer goes one depth lower and adds new creatures.
    const depth = 1 + Math.floor(s.frames / 1800);
    if (gs.currentWave !== depth) {
      gs.currentWave = depth;
      gs.zombieOutbreak = getZombieOutbreakPlan(depth);
      ctx.announce?.(gs, depth % 3 === 0 ? "BACKFLOW HORDE · KEEP THE PUMPS MOVING" : `SEWER DEPTH ${depth} · THEY LEARNED TO SWIM`, "#dfae60", true);
    }
    gs.sewerSpawnTimer = (gs.sewerSpawnTimer || 0) - 1;
    const cap = s.phase === "extraction" ? 28 : Math.min(36, 14 + depth * 3);
    if (gs.sewerSpawnTimer <= 0) {
      gs.sewerSpawnTimer = Math.max(35, 90 - depth * 6) * (depth % 3 === 0 ? 0.75 : 1) * (DIFFICULTIES[gs.runDifficulty] || DIFFICULTIES.normal).spawnMult;
      if ((gs.enemies || []).filter(e => e.health > 0).length < cap) {
        ctx.spawnEnemy?.(gs);
      }
    }
    for (const ev of stepSewerRun(gs)) {
      if (ev.type === "pump") { ctx.addText?.(gs, ev.pump.x, ev.pump.y - 85, "PUMP ONLINE · +15 HEALTH", "#a8df82", true); ctx.setHealth?.(gs.player.health); ctx.setMusicObjective?.(s.completedPumps < 3 ? `pump-${s.completedPumps}` : "hatch"); }
      if (ev.type === "hatch") ctx.announce?.(gs, "ALL PUMPS ONLINE · HOLD THE HATCH FOR 5 SECONDS", "#f6d178", true);
    }
  },
  winCondition(gs) { return gs.sewerRun?.phase === "escaped" ? "win" : gs.sewerRun?.phase === "flooded" ? "lose" : null; },
  banner(gs) {
    const s = gs.sewerRun; if (!s) return "SEWER ZOMBIES";
    const remaining = Math.max(0, Math.ceil((FLOOD_FRAMES - s.frames) / 60));
    return s.phase === "extraction" ? `HOLD HATCH ${Math.floor(s.hatch.charge / 60)}/5s · FLOOD ${remaining}s` : `${s.completedPumps}/3 PUMPS · ${s.sludge} SLUDGE · FLOOD ${remaining}s`;
  },
  progress(gs) {
    const s = gs.sewerRun; if (!s) return null;
    const hatch = s.phase === "extraction", point = hatch ? s.hatch : s.pumps[s.activePump];
    if (!point) return null;
    return { label: s.holdBlocked ? "CLEAR CREATURES FROM THE RING" : hatch ? "HOLD THE HATCH" : s.sludge === 0 && s.fuelTick === 0 ? "KILL TO GET SLUDGE" : `HOLD ${point.label}`, value: point.charge / 60, pct: point.charge / (hatch ? 300 : PUMP_FRAMES), unit: "s", pressure: s.frames / FLOOD_FRAMES };
  },
  outcome(gs) {
    const s = gs.sewerRun;
    return { headline: s?.phase === "escaped" ? "THE SEWER HAS BEEN OUTSMARTED" : "THE PLUMBING WON", detail: `${s?.completedPumps || 0}/3 pumps online · ${Math.floor((s?.frames || 0) / 60)} seconds underground`, stat: s?.completedPumps || 0 };
  },
});


