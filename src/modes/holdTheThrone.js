// HOLD THE THRONE — king-of-the-hill with a CPU squad (S163).
//
// Three thrones. Capture each by holding it for 30 seconds while waves press
// on the point instead of on you. Enemies target the throne; your squad
// (Intern, Plunger Sergeant, Roomba) holds with you. Capture all three to
// win. A throne whose pressure hits 100 is lost; lose two and the run ends.

import { createZone, getActiveZone, stepZones, throneLayout, ZONE_STATE } from "../systems/zones.js";
import { issueAllyOrder } from "../systems/allyUnit.js";

const CAPTURE_SECONDS = 30;

export const HOLD_THE_THRONE = Object.freeze({
  id: "hold_the_throne",
  kind: "mode",
  label: "HOLD THE THRONE",
  replayEligible: false,
  rulesetId: "standard",
  allies: ["sergeant", "intern", "roomba"],
  arena: { themePool: [0, 3, 4] },
  hud: { squad: true, zones: true, parTimer: false, verbObjective: false },
  usesDirectorObjectives: false,
  captureSeconds: CAPTURE_SECONDS,

  init(gs, ctx) {
    const W = ctx.W || gs._W || 1280, H = ctx.H || gs._H || 720;
    gs.zones = throneLayout(W, H).map((z, i) => ({ ...createZone({ ...z, radius: 115, captureFrames: CAPTURE_SECONDS * 60 }), active: i === 0 }));
    gs._thronesCaptured = 0;
    gs._thronesLost = 0;
    issueAllyOrder(gs, "follow");
  },

  // Throne waves are continuous pressure: bosses only every 6th wave.
  isBossWave(gs) { return gs.currentWave > 0 && gs.currentWave % 6 === 0; },

  waveEnemyCount(gs, computed) { return Math.min(70, Math.floor(computed * 1.15)); },

  onWaveStart(gs, ctx) {
    const zone = getActiveZone(gs);
    if (zone) ctx.addText?.(gs, zone.x, zone.y - zone.radius - 36, `⚔ DEFEND ${zone.label}`, "#FFD34F", true);
  },

  step(gs, ctx) {
    const events = stepZones(gs);
    for (const ev of events) {
      if (ev.type === "captured") {
        gs._thronesCaptured += 1;
        gs.score += 1500;
        ev.zone.active = false;
        ctx.addText?.(gs, ev.zone.x, ev.zone.y - 40, `👑 ${ev.zone.label} CAPTURED`, "#FFD700", true);
        ctx.addParticles?.(gs, ev.zone.x, ev.zone.y, "#FFD700", 30);
        const next = (gs.zones || []).find((z) => z.state === ZONE_STATE.IDLE && !z.active);
        if (next) { next.active = true; ctx.addText?.(gs, next.x, next.y - next.radius - 36, `➡ NEXT: ${next.label}`, "#88CCFF", true); }
      } else if (ev.type === "lost") {
        gs._thronesLost += 1;
        ev.zone.active = false;
        ctx.addText?.(gs, ev.zone.x, ev.zone.y - 40, `💀 ${ev.zone.label} LOST`, "#FF4444", true);
        ctx.addParticles?.(gs, ev.zone.x, ev.zone.y, "#FF4444", 24);
        const next = (gs.zones || []).find((z) => z.state === ZONE_STATE.IDLE && !z.active);
        if (next) next.active = true;
      } else if (ev.type === "contested" && (gs.frame || 0) % 120 === 0) {
        ctx.addText?.(gs, ev.zone.x, ev.zone.y - 40, "⚠ CONTESTED", "#FF8800");
      }
    }
    // Score trickle while holding.
    const zone = getActiveZone(gs);
    if (zone && zone.state === ZONE_STATE.HELD && (gs.frame || 0) % 60 === 0) gs.score += 25;
  },

  winCondition(gs) {
    if ((gs._thronesCaptured || 0) >= 3) return "win";
    if ((gs._thronesLost || 0) >= 2) return "lose";
    return null;
  },

  banner(gs) {
    const zone = getActiveZone(gs);
    const held = Math.floor((zone?.progress || 0) / 60);
    return zone ? `${gs._thronesCaptured || 0}/3 THRONES · ${zone.label} ${held}s/${CAPTURE_SECONDS}s` : `${gs._thronesCaptured || 0}/3 THRONES`;
  },

  progress(gs) {
    const zone = getActiveZone(gs);
    return zone ? { label: zone.label, value: zone.progress / 60, pct: zone.progress / zone.captureFrames, unit: "s", pressure: zone.pressure / 100 } : null;
  },
});
