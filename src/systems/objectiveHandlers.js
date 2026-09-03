// objectiveHandlers — behavioral objective verbs (S163).
//
// Each handler is { start(gs, spec, ctx) -> state, tick(gs, state, ctx) ->
// "active" | "done" | "failed", hud(state) }. The seven Operation verbs and
// the shared zone/bounty/escape primitives live here so Operations, HOLD THE
// THRONE, and SEWER EXTRACTION all resolve objectives through one contract.
//
// State lives on `gs.activeVerbObjective` so it survives resimulation.

import { createZone, stepZones, ZONE_STATE } from "./zones.js";
import { spawnAlly } from "./allyUnit.js";
import { getRunRng } from "./runRng.js";
import { addParticles, addText } from "./transientPresentation.js";

export const OBJECTIVE_VERBS = Object.freeze(["BREACH", "HOLD", "ESCORT", "HUNT", "SABOTAGE", "ESCAPE", "BOSS"]);

function pickEnemy(gs, predicate = () => true) {
  return (gs.enemies || []).find((e) => e && !e._defeatResolved && predicate(e)) || null;
}

function worldOf(gs, ctx) {
  return { W: ctx?.W || gs._W || 1280, H: ctx?.H || gs._H || 720 };
}

const HANDLERS = {
  // BREACH — a door with HP; player bullets chip it. Reinforcements at 50%.
  BREACH: {
    start(gs, spec = {}, ctx) {
      const { W, H } = worldOf(gs, ctx);
      const door = { id: spec.targetId || "breach-door", x: spec.x ?? W * 0.85, y: spec.y ?? H * 0.5, w: 28, h: 120, hp: spec.hp || 600, maxHp: spec.hp || 600, kind: "door", alive: true };
      gs.structures = (gs.structures || []).filter((s) => s.id !== door.id).concat(door);
      addText(gs, door.x, door.y - 80, "🚪 BREACH THE DOOR", "#FFB347", true);
      return { verb: "BREACH", doorId: door.id, reinforced: false };
    },
    tick(gs, state) {
      const door = (gs.structures || []).find((s) => s.id === state.doorId);
      if (!door) return "failed";
      // Bullets that overlap the door damage it.
      const bullets = gs.bullets || [];
      for (let i = bullets.length - 1; i >= 0; i -= 1) {
        const b = bullets[i];
        if (b.x > door.x - door.w / 2 && b.x < door.x + door.w / 2 && b.y > door.y - door.h / 2 && b.y < door.y + door.h / 2) {
          door.hp -= b.damage || 5;
          bullets.splice(i, 1);
          addParticles(gs, b.x, b.y, "#FFB347", 3);
        }
      }
      if (!state.reinforced && door.hp <= door.maxHp * 0.5) {
        state.reinforced = true;
        gs.maxEnemiesThisWave = (gs.maxEnemiesThisWave || 5) + 4;
        addText(gs, door.x, door.y - 80, "⚠ REINFORCEMENTS", "#FF4444", true);
      }
      if (door.hp <= 0) {
        door.alive = false;
        gs.structures = gs.structures.filter((s) => s.id !== door.id);
        addParticles(gs, door.x, door.y, "#FFB347", 24);
        addText(gs, door.x, door.y - 80, "💥 BREACHED", "#FFD700", true);
        return "done";
      }
      return "active";
    },
    hud(gs, state) {
      const door = (gs.structures || []).find((s) => s.id === state.doorId);
      return { label: "BREACH", pct: door ? 1 - door.hp / door.maxHp : 1, color: "#FFB347" };
    },
  },

  // HOLD — occupy a zone for N seconds. Leaving decays progress.
  HOLD: {
    start(gs, spec = {}, ctx) {
      const { W, H } = worldOf(gs, ctx);
      const zone = createZone({ id: spec.zoneId || "hold-zone", x: spec.x ?? W * 0.5, y: spec.y ?? H * 0.5, radius: spec.radius || 120, captureFrames: spec.seconds ? spec.seconds * 60 : 45 * 60, label: spec.label || "HOLD POINT" });
      gs.zones = (gs.zones || []).filter((z) => z.id !== zone.id).concat(zone);
      addText(gs, zone.x, zone.y - zone.radius - 20, "🛡 HOLD THE POINT", "#88CCFF", true);
      return { verb: "HOLD", zoneId: zone.id };
    },
    tick(gs, state) {
      const events = stepZones(gs);
      const zone = (gs.zones || []).find((z) => z.id === state.zoneId);
      if (!zone) return "failed";
      if (events.some((e) => e.type === "lost" && e.zone.id === zone.id)) return "failed";
      if (zone.state === ZONE_STATE.CAPTURED) return "done";
      return "active";
    },
    hud(gs, state) {
      const zone = (gs.zones || []).find((z) => z.id === state.zoneId);
      return { label: "HOLD", pct: zone ? zone.progress / zone.captureFrames : 0, color: "#88CCFF", pressure: zone ? zone.pressure / 100 : 0 };
    },
  },

  // ESCORT — a cart ally carries along waypoints; protect it.
  ESCORT: {
    start(gs, spec = {}, ctx) {
      const { W, H } = worldOf(gs, ctx);
      const waypoints = spec.waypoints || [{ x: W * 0.2, y: H * 0.5 }, { x: W * 0.5, y: H * 0.25 }, { x: W * 0.8, y: H * 0.5 }];
      const cart = spawnAlly(gs, "roomba", { x: waypoints[0].x, y: waypoints[0].y });
      Object.assign(cart, { name: "Plunger Cart", emoji: "🛒", color: "#AA44FF", personality: "cart", untargetable: false, health: 220, maxHealth: 220, speed: 1.6, size: 30, order: "carry", waypoints, waypointIndex: 1 });
      addText(gs, cart.x, cart.y - 40, "🚚 ESCORT THE CART", "#AA44FF", true);
      return { verb: "ESCORT", cartId: cart.id };
    },
    tick(gs, state) {
      const cart = (gs.allies || []).find((a) => a.id === state.cartId);
      if (!cart) return "failed";
      if (cart.downed) return "failed";
      if (cart.carryComplete) { addText(gs, cart.x, cart.y - 40, "✅ CART DELIVERED", "#FFD700", true); return "done"; }
      return "active";
    },
    hud(gs, state) {
      const cart = (gs.allies || []).find((a) => a.id === state.cartId);
      const pct = cart && cart.waypoints ? cart.waypointIndex / Math.max(1, cart.waypoints.length - 1) : 0;
      return { label: "ESCORT", pct, color: "#AA44FF", health: cart ? cart.health / cart.maxHealth : 0 };
    },
  },

  // HUNT — a marked elite that flees; kill it.
  HUNT: {
    start(gs, _spec = {}, ctx) {
      const { W, H } = worldOf(gs, ctx);
      let target = pickEnemy(gs, (e) => !e.isBossEnemy);
      if (!target && typeof ctx?.spawnEnemy === "function") { ctx.spawnEnemy(gs); target = gs.enemies[gs.enemies.length - 1]; }
      if (!target) return { verb: "HUNT", targetId: null };
      const rng = getRunRng(gs, "director");
      target.x = rng() < 0.5 ? W * 0.1 : W * 0.9;
      target.y = H * (0.2 + rng() * 0.6);
      target.fleeing = true;
      target.huntMark = true;
      target.health = Math.round((target.maxHealth || target.health) * 2.5);
      target.maxHealth = target.health;
      target.speed *= 1.15;
      target._huntId = `hunt-${gs.frame || 0}`;
      addText(gs, target.x, target.y - 40, "🎯 HUNT TARGET", "#FFD700", true);
      return { verb: "HUNT", targetId: target._huntId };
    },
    tick(gs, state) {
      if (!state.targetId) return "failed";
      const target = (gs.enemies || []).find((e) => e._huntId === state.targetId);
      if (!target) return "done";
      if (target._defeatResolved) return "done";
      return "active";
    },
    hud(gs, state) {
      const target = (gs.enemies || []).find((e) => e._huntId === state.targetId);
      return { label: "HUNT", pct: target ? 1 - target.health / target.maxHealth : 1, color: "#FFD700", target: target ? { x: target.x, y: target.y } : null };
    },
  },

  // SABOTAGE — hold interact for 3s while a surge attacks.
  SABOTAGE: {
    start(gs, spec = {}, ctx) {
      const { W, H } = worldOf(gs, ctx);
      const pump = { id: spec.targetId || "sabotage-pump", x: spec.x ?? W * 0.5, y: spec.y ?? H * 0.8, w: 60, h: 60, kind: "pump", alive: true, channel: 0, channelFrames: spec.seconds ? spec.seconds * 60 : 180 };
      gs.structures = (gs.structures || []).filter((s) => s.id !== pump.id).concat(pump);
      gs.maxEnemiesThisWave = (gs.maxEnemiesThisWave || 5) + 6;
      addText(gs, pump.x, pump.y - 60, "🔧 SABOTAGE THE PUMP · hold E", "#FF6600", true);
      return { verb: "SABOTAGE", pumpId: pump.id };
    },
    tick(gs, state) {
      const pump = (gs.structures || []).find((s) => s.id === state.pumpId);
      if (!pump) return "failed";
      const p = gs.player;
      const near = Math.hypot(p.x - pump.x, p.y - pump.y) < 70;
      if (near && gs._interactHeld) pump.channel += 1;
      else pump.channel = Math.max(0, pump.channel - 2);
      if (pump.channel >= pump.channelFrames) {
        pump.alive = false;
        gs.structures = gs.structures.filter((s) => s.id !== pump.id);
        addParticles(gs, pump.x, pump.y, "#FF6600", 24);
        addText(gs, pump.x, pump.y - 60, "💥 SABOTAGED", "#FFD700", true);
        return "done";
      }
      return "active";
    },
    hud(gs, state) {
      const pump = (gs.structures || []).find((s) => s.id === state.pumpId);
      return { label: "SABOTAGE", pct: pump ? pump.channel / pump.channelFrames : 1, color: "#FF6600" };
    },
  },

  // ESCAPE — alarm rises; reach the exit before it hits 100.
  ESCAPE: {
    start(gs, spec = {}, ctx) {
      const { W, H } = worldOf(gs, ctx);
      const exit = { id: "escape-exit", x: spec.x ?? W * 0.92, y: spec.y ?? H * 0.12, w: 60, h: 60, kind: "exit", alive: true };
      gs.structures = (gs.structures || []).filter((s) => s.id !== exit.id).concat(exit);
      gs.alarm = Math.max(0, Number(spec.alarmStart) || 0);
      addText(gs, gs.player.x, gs.player.y - 50, "🚨 ALARM — GET TO THE EXIT", "#FF4444", true);
      return { verb: "ESCAPE", exitId: exit.id, alarmRate: spec.alarmRate || 100 / (45 * 60) };
    },
    tick(gs, state) {
      const exit = (gs.structures || []).find((s) => s.id === state.exitId);
      if (!exit) return "failed";
      gs.alarm = Math.min(100, (gs.alarm || 0) + state.alarmRate);
      if (gs.alarm >= 100) return "failed";
      const p = gs.player;
      if (Math.hypot(p.x - exit.x, p.y - exit.y) < 40) {
        addText(gs, exit.x, exit.y - 50, "🚽 FLUSHED OUT", "#FFD700", true);
        return "done";
      }
      return "active";
    },
    hud(gs, state) {
      const exit = (gs.structures || []).find((s) => s.id === state.exitId);
      return { label: "ESCAPE", pct: (gs.alarm || 0) / 100, color: "#FF4444", target: exit ? { x: exit.x, y: exit.y } : null };
    },
  },

  // BOSS — completion is the boss defeat; the host's boss flow already owns it.
  BOSS: {
    start() { return { verb: "BOSS" }; },
    tick(gs) { return gs.bossWave && (gs.enemies || []).some((e) => e.isBossEnemy && !e._defeatResolved) ? "active" : "done"; },
    hud() { return { label: "BOSS", pct: 0, color: "#FF3333" }; },
  },
};

export function getObjectiveHandler(verb) {
  return HANDLERS[String(verb || "").toUpperCase()] || null;
}

/** Begin a verb objective on gs. Returns the state or null when the verb is unknown. */
export function startVerbObjective(gs, verb, spec = {}, ctx = {}) {
  const handler = getObjectiveHandler(verb);
  if (!handler) return null;
  const state = handler.start(gs, spec, ctx);
  state.status = "active";
  state.startedFrame = gs.frame || 0;
  gs.activeVerbObjective = state;
  return state;
}

/** Advance the active verb objective. Returns "active" | "done" | "failed" | null. */
export function tickVerbObjective(gs, ctx = {}) {
  const state = gs.activeVerbObjective;
  if (!state || state.status !== "active") return state?.status || null;
  const handler = getObjectiveHandler(state.verb);
  if (!handler) return null;
  const status = handler.tick(gs, state, ctx);
  state.status = status;
  if (status !== "active") state.resolvedFrame = gs.frame || 0;
  return status;
}

export function getVerbObjectiveHud(gs) {
  const state = gs.activeVerbObjective;
  if (!state) return null;
  const handler = getObjectiveHandler(state.verb);
  return handler ? { ...handler.hud(gs, state), status: state.status, verb: state.verb } : null;
}
