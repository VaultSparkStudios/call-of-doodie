// SEWER EXTRACTION — loot, alarm, evac (S163 tranche 3).
//
// Loot crates drop across the arena. Every crate you grab and every kill raises
// the alarm. At 60 the evac toilet opens; reach it to bank your loot into a
// persistent stash. Die and the loot goes down the drain. At 100 the alarm
// locks the exit and the run is over. Reuses the ESCAPE structure shape, the
// pickup system, and the stash in storage.js.

import { getRunRng } from "../systems/runRng.js";
import { loadStash, saveStash } from "../storage.js";

const ALARM_EVAC = 60;
const ALARM_LOCK = 100;
const ALARM_PER_KILL = 1.6;
const ALARM_PER_CRATE = 4;
const ALARM_PER_SECOND = 0.35;
const CRATES_PER_WAVE = 3;

function spawnCrate(gs, ctx) {
  const rng = getRunRng(gs, "loot");
  const W = ctx.W || gs._W || 1280, H = ctx.H || gs._H || 720;
  const x = 60 + rng() * (W - 120), y = 60 + rng() * (H - 120);
  const value = 25 + Math.floor(rng() * 50) + Math.floor((gs.currentWave || 1) * 5);
  gs.pickups.push({ x, y, type: "loot", value, life: 60 * 45, emoji: "📦" });
}

export const SEWER_EXTRACTION = Object.freeze({
  id: "sewer_extraction",
  kind: "mode",
  label: "SEWER EXTRACTION",
  replayEligible: false,
  rulesetId: "standard",
  allies: null,
  arena: { themePool: [2, 3, 5] },
  hud: { squad: false, zones: false, parTimer: false, verbObjective: false },
  usesDirectorObjectives: false,
  alarmEvac: ALARM_EVAC,
  alarmLock: ALARM_LOCK,

  init(gs, ctx) {
    gs.alarm = 0;
    gs._extractLoot = 0;
    gs._extractCrates = 0;
    gs._extractOpen = false;
    gs._extractLocked = false;
    gs._extractBanked = null;
    for (let i = 0; i < CRATES_PER_WAVE; i += 1) spawnCrate(gs, ctx);
  },

  isBossWave() { return false; },

  waveEnemyCount(gs, computed) {
    const pressure = 1 + (gs.alarm || 0) / 100;
    return Math.min(70, Math.floor(computed * pressure));
  },

  onWaveStart(gs, ctx) {
    for (let i = 0; i < CRATES_PER_WAVE; i += 1) spawnCrate(gs, ctx);
    ctx.addText?.(gs, ctx.W / 2, ctx.H / 2 - 120, "📦 CRATES DROPPED", "#FFD34F", true);
  },

  onEnemyKilled(gs) {
    if (!gs._extractLocked) gs.alarm = Math.min(ALARM_LOCK, (gs.alarm || 0) + ALARM_PER_KILL);
  },

  step(gs, ctx) {
    const p = gs.player;
    const W = ctx.W || gs._W || 1280, H = ctx.H || gs._H || 720;
    if (!gs._extractLocked) gs.alarm = Math.min(ALARM_LOCK, (gs.alarm || 0) + ALARM_PER_SECOND / 60);

    // Crate collection.
    const pickups = gs.pickups || [];
    for (let i = pickups.length - 1; i >= 0; i -= 1) {
      const pk = pickups[i];
      if (!pk || pk.type !== "loot") continue;
      if (Math.hypot(p.x - pk.x, p.y - pk.y) < 34) {
        gs._extractLoot += pk.value;
        gs._extractCrates += 1;
        gs.alarm = Math.min(ALARM_LOCK, (gs.alarm || 0) + ALARM_PER_CRATE);
        gs.score += pk.value;
        ctx.addText?.(gs, pk.x, pk.y - 24, `+${pk.value} LOOT`, "#FFD34F", true);
        ctx.addParticles?.(gs, pk.x, pk.y, "#FFD34F", 10);
        pickups.splice(i, 1);
      }
    }

    // Evac opens at the alarm threshold, on the far edge from the player.
    if (!gs._extractOpen && gs.alarm >= ALARM_EVAC) {
      gs._extractOpen = true;
      const x = p.x < W / 2 ? W * 0.92 : W * 0.08;
      const y = p.y < H / 2 ? H * 0.88 : H * 0.12;
      gs.structures = (gs.structures || []).filter((s) => s.id !== "evac-toilet").concat({ id: "evac-toilet", x, y, w: 64, h: 64, kind: "exit", alive: true });
      ctx.addText?.(gs, p.x, p.y - 60, "🚽 EVAC OPEN — GET TO THE TOILET", "#33E6FF", true);
    }
    if (gs._extractOpen && !gs._extractLocked) {
      const exit = (gs.structures || []).find((s) => s.id === "evac-toilet");
      if (exit && Math.hypot(p.x - exit.x, p.y - exit.y) < 42) {
        const stash = loadStash();
        const banked = { loot: gs._extractLoot, crates: gs._extractCrates, wave: gs.currentWave, at: Date.now() };
        saveStash({ total: (stash.total || 0) + banked.loot, runs: (stash.runs || 0) + 1, best: Math.max(stash.best || 0, banked.loot), last: banked });
        gs._extractBanked = banked;
        gs.score += banked.loot * 2;
        ctx.addText?.(gs, exit.x, exit.y - 60, `🚽 EXTRACTED · ${banked.loot} LOOT BANKED`, "#FFD34F", true);
        gs._modeWon = true;
      }
    }
    if (gs.alarm >= ALARM_LOCK && !gs._extractLocked) {
      gs._extractLocked = true;
      gs.structures = (gs.structures || []).filter((s) => s.id !== "evac-toilet");
      ctx.addText?.(gs, p.x, p.y - 60, "🚨 LOCKDOWN — THE EXIT IS SEALED", "#FF3B3B", true);
      gs.maxEnemiesThisWave = (gs.maxEnemiesThisWave || 5) + 12;
    }
  },

  winCondition(gs) {
    return gs._modeWon ? "win" : null;
  },

  banner(gs) {
    const state = gs._extractLocked ? "LOCKDOWN" : gs._extractOpen ? "EVAC OPEN" : `EVAC AT ${ALARM_EVAC}`;
    return `LOOT ${gs._extractLoot || 0} · ALARM ${Math.floor(gs.alarm || 0)} · ${state}`;
  },

  progress(gs) {
    return { label: "ALARM", value: gs.alarm || 0, pct: Math.min(1, (gs.alarm || 0) / ALARM_LOCK), unit: "", pressure: (gs.alarm || 0) / ALARM_LOCK };
  },
});
