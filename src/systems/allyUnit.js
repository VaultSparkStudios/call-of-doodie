// allyUnit — CPU teammates (S163).
//
// Allies are flat entities in `gs.allies`, shaped like enemies so the draw
// path, projectile hit tests, and target selection can treat every unit the
// same way. All decisions consume the seeded "allies" stream so a run with
// allies replays identically.
//
// Orders: follow | hold | attack | revive | carry
//   follow — stay within FOLLOW_RANGE of the player, shoot nearest enemy
//   hold   — stay put, shoot nearest enemy
//   attack — chase the nearest enemy
//   revive — move to a downed ally and revive (auto when idle and one is down)
//   carry  — move along `waypoints` (ESCORT primitive); never shoots

import { WEAPONS } from "../constants.js";
import { getRunRng } from "./runRng.js";
import { addParticles, addText } from "./transientPresentation.js";

export const ALLY_ORDERS = Object.freeze(["follow", "hold", "attack", "revive", "carry"]);
export const ALLY_BLEEDOUT_FRAMES = 8 * 60;
export const ALLY_REVIVE_RANGE = 40;
export const ALLY_REVIVE_FRAMES = 90;
const FOLLOW_RANGE = 90;
const FOLLOW_TOO_CLOSE = 40;
const ARRIVE = 6;

/**
 * Personalities are comedy *and* mechanics: each changes something a player
 * can feel within ten seconds.
 */
export const ALLY_PERSONALITIES = Object.freeze({
  intern: {
    id: "intern",
    name: "The Intern",
    emoji: "🧑‍💻",
    color: "#9CFF8A",
    health: 60,
    speed: 4.2,
    size: 26,
    weaponIndex: 0,
    followRange: 55,
    panicHealthPct: 0.3,
    pickupRadiusMult: 2,
    lines: {
      spawn: "I brought snacks? No? Okay.",
      panic: "SORRY SORRY SORRY",
      revive: "I'm fine! I'm fine. I'm not fine.",
      kill: "Was that on my task list?",
    },
  },
  sergeant: {
    id: "sergeant",
    name: "Plunger Sergeant",
    emoji: "🪖",
    color: "#FFB347",
    health: 140,
    speed: 3.2,
    size: 32,
    weaponIndex: 3,
    followRange: 120,
    preferredOrder: "hold",
    callsFormations: true,
    lines: {
      spawn: "FORM UP. THE BOWL IS OURS.",
      formation: "THEY'RE FLANKING — WATCH LEFT!",
      revive: "Get up, private. Rent's not paid.",
      kill: "THAT'S A CLOG CLEARED.",
    },
  },
  roomba: {
    id: "roomba",
    name: "The Roomba",
    emoji: "🤖",
    color: "#BEEFFF",
    health: 45,
    speed: 3.6,
    size: 20,
    weaponIndex: null,       // cannot shoot
    untargetable: true,      // enemies ignore it
    vacuums: true,           // delivers pickups to the player
    lines: {
      spawn: "*beep* obstacle detected: everything",
      pickup: "*whirr* acquired",
      downed: "*sad beep*",
    },
  },
});

export function listAllyPersonalities() {
  return Object.values(ALLY_PERSONALITIES);
}

export function spawnAlly(gs, personalityId, { x, y } = {}) {
  const spec = ALLY_PERSONALITIES[personalityId] || ALLY_PERSONALITIES.intern;
  const p = gs.player || { x: 0, y: 0 };
  const rng = getRunRng(gs, "allies");
  const ang = rng() * Math.PI * 2;
  const ally = {
    id: `ally-${spec.id}-${(gs._allySerial = (gs._allySerial || 0) + 1)}`,
    faction: "ally",
    personality: spec.id,
    name: spec.name,
    emoji: spec.emoji,
    color: spec.color,
    x: Number.isFinite(x) ? x : p.x + Math.cos(ang) * 60,
    y: Number.isFinite(y) ? y : p.y + Math.sin(ang) * 60,
    angle: 0,
    health: spec.health,
    maxHealth: spec.health,
    speed: spec.speed,
    size: spec.size,
    weaponIndex: spec.weaponIndex,
    fireTimer: 0,
    order: spec.preferredOrder || "follow",
    holdX: null, holdY: null,
    target: null,
    waypoints: null, waypointIndex: 0,
    downed: false, bleedout: 0, reviveProgress: 0,
    untargetable: !!spec.untargetable,
    kills: 0,
    invincible: 0,
    wobble: 0,
    hitFlash: 0,
  };
  gs.allies = gs.allies || [];
  gs.allies.push(ally);
  if (spec.lines?.spawn) addText(gs, ally.x, ally.y - ally.size, spec.lines.spawn, ally.color);
  return ally;
}

export function issueAllyOrder(gs, order, { allyId = null } = {}) {
  if (!ALLY_ORDERS.includes(order)) return 0;
  let applied = 0;
  for (const a of gs.allies || []) {
    if (a.downed || (allyId && a.id !== allyId)) continue;
    if (a.personality === "roomba" || a.order === "carry") continue;
    a.order = order;
    if (order === "hold") { a.holdX = a.x; a.holdY = a.y; }
    applied += 1;
  }
  return applied;
}

function nearestEnemy(gs, x, y, maxDist = Infinity) {
  let best = null;
  let bestD = maxDist;
  for (const e of gs.enemies || []) {
    if (!e || e._defeatResolved || (e.eliteType === "phantom" && e.phantomVisible === false)) continue;
    const d = Math.hypot(e.x - x, e.y - y);
    if (d < bestD) { best = e; bestD = d; }
  }
  return best;
}

function moveToward(a, tx, ty, speed, gs) {
  const dx = tx - a.x, dy = ty - a.y;
  const d = Math.hypot(dx, dy);
  if (d <= ARRIVE) return d;
  const sx = dx / d, sy = dy / d;
  a.x += sx * speed;
  a.y += sy * speed;
  a.angle = Math.atan2(sy, sx);
  // Obstacle push-out (same rule as enemies)
  for (const ob of gs.obstacles || []) {
    const cx = Math.max(ob.x, Math.min(a.x, ob.x + ob.w));
    const cy = Math.max(ob.y, Math.min(a.y, ob.y + ob.h));
    const od = Math.hypot(a.x - cx, a.y - cy);
    const r = a.size / 2 + 2;
    if (od < r) {
      const ang = od > 0 ? Math.atan2(a.y - cy, a.x - cx) : getRunRng(gs, "allies")() * Math.PI * 2;
      a.x = cx + Math.cos(ang) * (r + 1);
      a.y = cy + Math.sin(ang) * (r + 1);
    }
  }
  return d;
}

function allyFire(gs, a, target) {
  if (a.weaponIndex === null || a.weaponIndex === undefined) return;
  const weapon = WEAPONS[a.weaponIndex] || WEAPONS[0];
  if (a.fireTimer > 0) { a.fireTimer -= 1; return; }
  const rateFrames = Math.max(6, Math.round((weapon.fireRate || 200) / (1000 / 60)) * 2); // allies fire at half player cadence
  a.fireTimer = rateFrames;
  const rng = getRunRng(gs, "allies");
  const base = Math.atan2(target.y - a.y, target.x - a.x);
  const spread = (weapon.spread || 0.03) * 2;
  const ang = base + (rng() - 0.5) * spread;
  a.angle = ang;
  const speed = weapon.bulletSpeed || 12;
  gs.bullets.push({
    x: a.x, y: a.y,
    vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed,
    life: weapon.bulletLife || 60,
    damage: Math.round((weapon.damage || 10) * 0.7),
    size: weapon.bulletSize || 5,
    color: a.color,
    wpnIdx: a.weaponIndex,
    pierceLeft: 0,
    owner: "ally",
    ownerId: a.id,
  });
}

function stepDowned(gs, a, p, allies) {
  a.bleedout -= 1;
  const reviverNear = Math.hypot(p.x - a.x, p.y - a.y) < ALLY_REVIVE_RANGE
    || allies.some((o) => o !== a && !o.downed && o.order === "revive" && Math.hypot(o.x - a.x, o.y - a.y) < ALLY_REVIVE_RANGE);
  if (reviverNear) {
    a.reviveProgress += 1;
    if (a.reviveProgress >= ALLY_REVIVE_FRAMES) {
      a.downed = false; a.bleedout = 0; a.reviveProgress = 0;
      a.health = Math.round(a.maxHealth * 0.5);
      a.invincible = 60;
      const line = ALLY_PERSONALITIES[a.personality]?.lines?.revive;
      if (line) addText(gs, a.x, a.y - a.size, line, a.color, true);
      addParticles(gs, a.x, a.y, a.color, 10);
      for (const o of allies) if (o.order === "revive") o.order = "follow";
      return true;
    }
  } else {
    a.reviveProgress = Math.max(0, a.reviveProgress - 2);
  }
  return a.bleedout > 0;
}

/** Apply damage to an ally from an enemy source. Returns true if it went down. */
export function damageAlly(gs, a, amount) {
  if (!a || a.downed || a.invincible > 0) return false;
  a.health -= amount;
  a.hitFlash = 6;
  a.invincible = 12;
  if (a.health <= 0) {
    a.health = 0;
    a.downed = true;
    a.bleedout = ALLY_BLEEDOUT_FRAMES;
    a.reviveProgress = 0;
    const line = ALLY_PERSONALITIES[a.personality]?.lines?.downed || "DOWN! REVIVE ME!";
    addText(gs, a.x, a.y - a.size, line, "#FF4444", true);
    addParticles(gs, a.x, a.y, "#FF4444", 12);
    gs._allyDownEvents = (gs._allyDownEvents || 0) + 1;
    return true;
  }
  const spec = ALLY_PERSONALITIES[a.personality];
  if (spec?.panicHealthPct && a.health < a.maxHealth * spec.panicHealthPct && !a._panicked) {
    a._panicked = true;
    if (spec.lines?.panic) addText(gs, a.x, a.y - a.size, spec.lines.panic, a.color, true);
  }
  return false;
}

/**
 * Advance every ally one frame. Deterministic given `gs` and the seeded
 * "allies" stream. Enemy bullets/contact hitting allies are resolved here so
 * the projectile module stays untouched.
 */
export function stepAllies(gs, { W = 1280, H = 720 } = {}) {
  const allies = gs.allies;
  if (!Array.isArray(allies) || allies.length === 0) return { ok: true, count: 0 };
  const p = gs.player;
  if (!p) return { ok: false, reason: "no-player" };

  if (gs._pendingAllyOrder) { issueAllyOrder(gs, gs._pendingAllyOrder); gs._pendingAllyOrder = null; }

  const anyDown = allies.some((a) => a.downed);

  for (let i = allies.length - 1; i >= 0; i -= 1) {
    const a = allies[i];
    if (!a) { allies.splice(i, 1); continue; }
    a.wobble += 0.1;
    if (a.hitFlash > 0) a.hitFlash -= 1;
    if (a.invincible > 0) a.invincible -= 1;

    if (a.downed) {
      if (!stepDowned(gs, a, p, allies)) {
        addText(gs, a.x, a.y - a.size, `${a.name} flushed.`, "#FF4444", true);
        allies.splice(i, 1);
      }
      continue;
    }

    const spec = ALLY_PERSONALITIES[a.personality] || {};
    const panicking = spec.panicHealthPct && a.health < a.maxHealth * spec.panicHealthPct;
    const speed = a.speed * (panicking ? 1.6 : 1);

    // Auto-revive: an idle non-roomba ally goes to help a downed teammate.
    if (anyDown && a.order !== "revive" && a.order !== "carry" && !spec.untargetable) {
      const down = allies.find((o) => o.downed);
      if (down && Math.hypot(down.x - a.x, down.y - a.y) < 220) a.order = "revive";
    }

    if (spec.vacuums) {
      // Roomba: seek nearest pickup, then bring it to the player.
      let target = null, bestD = Infinity;
      for (const pk of gs.pickups || []) {
        if (!pk || pk.type === "mine") continue;
        const d = Math.hypot(pk.x - a.x, pk.y - a.y);
        if (d < bestD) { target = pk; bestD = d; }
      }
      if (a.carrying) {
        const d = moveToward(a, p.x, p.y, speed, gs);
        if (d < 28) { a.carrying.x = p.x; a.carrying.y = p.y; a.carrying = null; }
        else { a.carrying.x = a.x; a.carrying.y = a.y; }
      } else if (target) {
        const d = moveToward(a, target.x, target.y, speed, gs);
        if (d < 16) { a.carrying = target; if (spec.lines?.pickup) addText(gs, a.x, a.y - a.size, spec.lines.pickup, a.color); }
      } else {
        // Idle orbit around the player
        const orbit = gs.frame * 0.02 + i;
        moveToward(a, p.x + Math.cos(orbit) * 70, p.y + Math.sin(orbit) * 70, speed * 0.8, gs);
      }
    } else if (a.order === "carry" && Array.isArray(a.waypoints) && a.waypoints.length) {
      const wp = a.waypoints[Math.min(a.waypointIndex, a.waypoints.length - 1)];
      const d = moveToward(a, wp.x, wp.y, speed * 0.6, gs);
      if (d <= ARRIVE && a.waypointIndex < a.waypoints.length - 1) a.waypointIndex += 1;
      else if (d <= ARRIVE) a.carryComplete = true;
    } else if (a.order === "revive") {
      const down = allies.find((o) => o.downed);
      if (down) moveToward(a, down.x, down.y, speed, gs);
      else a.order = "follow";
    } else {
      const enemy = nearestEnemy(gs, a.x, a.y);
      if (a.order === "attack" && enemy) {
        moveToward(a, enemy.x, enemy.y, speed, gs);
      } else if (a.order === "hold") {
        if (a.holdX === null) { a.holdX = a.x; a.holdY = a.y; }
        moveToward(a, a.holdX, a.holdY, speed, gs);
      } else {
        // follow
        const range = spec.followRange || FOLLOW_RANGE;
        const dp = Math.hypot(p.x - a.x, p.y - a.y);
        if (panicking) moveToward(a, p.x, p.y, speed, gs);
        else if (dp > range) moveToward(a, p.x, p.y, speed, gs);
        else if (dp < FOLLOW_TOO_CLOSE) moveToward(a, a.x + (a.x - p.x), a.y + (a.y - p.y), speed * 0.5, gs);
      }
      if (enemy && Math.hypot(enemy.x - a.x, enemy.y - a.y) < 420) allyFire(gs, a, enemy);
      else if (a.fireTimer > 0) a.fireTimer -= 1;
    }

    // Clamp to arena
    a.x = Math.max(a.size / 2, Math.min(W - a.size / 2, a.x));
    a.y = Math.max(a.size / 2, Math.min(H - a.size / 2, a.y));

    // Enemy contact and projectile damage against this ally.
    if (!a.untargetable) {
      for (const e of gs.enemies || []) {
        if (!e || e._defeatResolved) continue;
        if (Math.hypot(e.x - a.x, e.y - a.y) < e.size / 2 + a.size / 2 && a.invincible <= 0) {
          damageAlly(gs, a, 6 + (e.typeIndex || 0) * 2);
          break;
        }
      }
      const bullets = gs.enemyBullets || [];
      for (let b = bullets.length - 1; b >= 0; b -= 1) {
        const eb = bullets[b];
        if (!eb) continue;
        if (Math.hypot(eb.x - a.x, eb.y - a.y) < (eb.size || 4) + a.size / 2) {
          damageAlly(gs, a, eb.damage || 6);
          bullets.splice(b, 1);
          if (a.downed) break;
        }
      }
    }
  }
  return { ok: true, count: allies.length };
}

/** Compact summary for HUD / receipts. */
export function summarizeSquad(gs) {
  return (gs.allies || []).map((a) => ({
    id: a.id,
    name: a.name,
    emoji: a.emoji,
    color: a.color,
    healthPct: a.maxHealth ? Math.max(0, Math.min(1, a.health / a.maxHealth)) : 0,
    downed: !!a.downed,
    bleedoutPct: a.downed ? a.bleedout / ALLY_BLEEDOUT_FRAMES : 0,
    revivePct: a.downed ? a.reviveProgress / ALLY_REVIVE_FRAMES : 0,
    order: a.order,
  }));
}
