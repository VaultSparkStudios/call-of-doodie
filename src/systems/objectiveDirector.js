// objectiveDirector.js — picks and resolves dynamic mid-wave objectives.
//
// Five objective types (the founder's "circle concept", generalized):
//   hot_zone   — stand inside ring for N seconds → score multiplier window
//   bounty     — single named elite enemy with unique drop
//   sniper     — N seconds where ranged kills score 3x
//   lockdown   — shrinking safe pocket; survive entire timer = perk reroll
//   escort     — protect a doodie-cart along a path → coin payout
//
// Spawns at most ONE objective per non-boss wave, weighted by player weakness
// from metaClarity. Director runs once per wave start (cheap — pure fn) +
// each frame to update timers/geometry.
//
// Wires into App.jsx via:
//   - on wave start:  gs.activeObjective = pickObjective({ wave, weakness, gs })
//   - per frame:      tickObjective(gs); → may set gs.activeObjective = null
//   - on objective complete: callback fires bonus payout

import { pointInCircle } from "./combatResolution.js";

const OBJECTIVE_DEFS = {
  hot_zone: {
    label: "🔥 HOT ZONE",
    color: "#FF6600",
    description: "Stand inside the ring · score x2 for kills",
    minWave: 3,
  },
  bounty: {
    label: "🎯 BOUNTY",
    color: "#FFD700",
    description: "Eliminate the marked target",
    minWave: 5,
  },
  sniper: {
    label: "🎯 SNIPER WINDOW",
    color: "#5CE6FF",
    description: "Long-range kills score x3 · 15s",
    minWave: 4,
  },
  lockdown: {
    label: "🛡 LOCKDOWN",
    color: "#88CCFF",
    description: "Survive the shrinking safe zone · perk reward",
    minWave: 6,
  },
  escort: {
    label: "🚚 ESCORT",
    color: "#AA44FF",
    description: "Defend the doodie-cart · coin payout",
    minWave: 8,
  },
};

/**
 * Returns weights {type → weight} biased by player weakness.
 * Defense-weak players see more lockdowns (gives breathing room).
 * Offense-weak players see more bounties (focused single-target value).
 * Utility-weak players see more sniper windows (rewards positioning).
 * Chaos players (good) see more hot_zones + escorts (high-skill upside).
 */
export function getObjectiveWeights(weakness) {
  const base = { hot_zone: 5, bounty: 3, sniper: 3, lockdown: 2, escort: 1 };
  switch (weakness) {
    case "defense":  return { ...base, lockdown: 6, hot_zone: 3 };
    case "offense":  return { ...base, bounty: 7, sniper: 5 };
    case "utility":  return { ...base, sniper: 6, hot_zone: 5 };
    case "chaos":    return { ...base, hot_zone: 6, escort: 4 };
    default:         return base;
  }
}

function rand(rng) { return typeof rng === "function" ? rng() : Math.random(); }

function weightedPick(weights, rng) {
  const entries = Object.entries(weights);
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let r = rand(rng) * total;
  for (const [k, w] of entries) {
    if ((r -= w) <= 0) return k;
  }
  return entries[entries.length - 1][0];
}

/**
 * Pick an objective for the upcoming wave. Returns null if none should spawn
 * (boss waves, very early waves, or random skip for variance).
 *
 * @param {object} ctx
 * @param {number} ctx.wave         - upcoming wave number
 * @param {string|null} ctx.weakness - from metaClarity.identifyWeakness()
 * @param {boolean} ctx.bossWave    - true if upcoming wave is a boss wave
 * @param {{x:number,y:number,W:number,H:number}} ctx.world - playfield
 * @param {function} [ctx.rng]      - optional seeded RNG for replay determinism
 * @returns {object|null} active objective, or null
 */
export function pickObjective({ wave, weakness = null, bossWave = false, world = { W: 1280, H: 720 }, rng } = {}) {
  if (bossWave) return null;
  if (wave < 3) return null;
  // 35% of eligible waves get an objective. Tune for pacing.
  if (rand(rng) > 0.35) return null;

  // Filter eligible types by minWave
  const eligible = {};
  const weights = getObjectiveWeights(weakness);
  for (const [k, w] of Object.entries(weights)) {
    if ((OBJECTIVE_DEFS[k].minWave || 0) <= wave) eligible[k] = w;
  }
  if (Object.keys(eligible).length === 0) return null;

  const type = weightedPick(eligible, rng);
  return buildObjective(type, world, rng);
}

function buildObjective(type, world, rng) {
  const def = OBJECTIVE_DEFS[type];
  const margin = 140;
  const cx = margin + rand(rng) * (world.W - margin * 2);
  const cy = margin + rand(rng) * (world.H - margin * 2);

  switch (type) {
    case "hot_zone": {
      const r = 90;
      return {
        type, label: def.label, color: def.color, description: def.description,
        cx, cy, r, scoreMult: 2,
        timeLeft: 15 * 60, // 15 seconds in frames
        contains: (p) => pointInCircle(p.x, p.y, cx, cy, r),
        completed: false, expired: false, reward: "score",
      };
    }
    case "sniper": {
      return {
        type, label: def.label, color: def.color, description: def.description,
        timeLeft: 15 * 60, scoreMult: 3, minRangeSq: 320 * 320,
        completed: false, expired: false, reward: "score",
      };
    }
    case "lockdown": {
      const r0 = 220, rEnd = 80;
      return {
        type, label: def.label, color: def.color, description: def.description,
        cx, cy, r: r0, rEnd, r0,
        timeLeft: 18 * 60,
        contains: (p) => pointInCircle(p.x, p.y, cx, cy, r0),
        completed: false, expired: false, reward: "perk_reroll",
      };
    }
    case "bounty": {
      // The marked enemy is assigned by the game loop on next spawn.
      return {
        type, label: def.label, color: def.color, description: def.description,
        targetId: null, timeLeft: 30 * 60,
        completed: false, expired: false, reward: "coins",
      };
    }
    case "escort": {
      // Cart travels left → right; player must stay close enough.
      const startX = 80, endX = world.W - 80, y = world.H * (0.4 + rand(rng) * 0.2);
      return {
        type, label: def.label, color: def.color, description: def.description,
        cart: { x: startX, y, hp: 100 }, endX, speedPx: 0.6,
        timeLeft: 30 * 60,
        completed: false, expired: false, reward: "coins",
      };
    }
    default: return null;
  }
}

/**
 * Tick one frame on the active objective. Returns { completed, expired }.
 * Caller should fire reward / cleanup based on result and clear gs.activeObjective
 * when completed or expired.
 */
export function tickObjective(gs) {
  const obj = gs?.activeObjective;
  if (!obj || obj.completed || obj.expired) return { completed: false, expired: false };
  obj.timeLeft = Math.max(0, (obj.timeLeft || 0) - 1);

  if (obj.type === "lockdown") {
    // Shrink radius linearly from r0 → rEnd
    const total = 18 * 60;
    const t = 1 - (obj.timeLeft / total);
    obj.r = obj.r0 - (obj.r0 - obj.rEnd) * t;
    if (typeof gs.player?.x === "number" && !pointInCircle(gs.player.x, gs.player.y, obj.cx, obj.cy, obj.r)) {
      obj.expired = true;
      return { completed: false, expired: true };
    }
    if (obj.timeLeft <= 0) { obj.completed = true; return { completed: true, expired: false }; }
  }

  if (obj.type === "escort") {
    obj.cart.x += obj.speedPx;
    if (obj.cart.hp <= 0) { obj.expired = true; return { completed: false, expired: true }; }
    if (obj.cart.x >= obj.endX) { obj.completed = true; return { completed: true, expired: false }; }
  }

  if (obj.type === "bounty") {
    if (obj.targetId != null && gs.enemies && !gs.enemies.find(e => e._bountyId === obj.targetId)) {
      obj.completed = true;
      return { completed: true, expired: false };
    }
  }

  if (obj.timeLeft <= 0 && !obj.completed) {
    obj.expired = true;
    return { completed: false, expired: true };
  }
  return { completed: false, expired: false };
}
