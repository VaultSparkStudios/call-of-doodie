/**
 * enemyUpdate.js — pure per-enemy steering computation (App.jsx game-loop slice 3).
 *
 * Extracted from the App.jsx enemy forEach loop so the physics can be
 * unit-tested without React refs or side effects.
 *
 * Side effects (addParticles, addText, ranged-fire, boss mechanics) remain in
 * App.jsx; only the deterministic steering vector is lifted here.
 */

import { sampleFlowField } from "./flowField.js";

/**
 * Compute the movement steering vector for one enemy for one frame.
 *
 * The caller must have already updated per-frame state on `enemy` that this
 * function reads (e.g. wobble increment, doomscrolling flag) before calling.
 *
 * @param {object} enemy   - Enemy object with x, y, speed, size, typeIndex, etc.
 * @param {object} player  - { x, y }
 * @param {object|null} flowField  - Flow-field grid from buildFlowField(), or null
 * @param {Array}  obstacles - [{ x, y, w, h }]
 * @param {object} opts
 * @param {number} opts.freezeTimer        - gs.freezeTimer; > 0 → 0.35× speed
 * @param {number} opts.timeDilationTimer  - gs.timeDilationTimer; > 0 → 0.18× speed
 * @param {number} opts.chainEnrageLevel   - gs._chainEnrageLevel; 1 → 1.10×, 2 → 1.20×
 * @param {number} opts.enemySpeedMult     - gs.enemySpeedMult global multiplier
 *
 * @returns {{ sx: number, sy: number, buffedSpeed: number, zigzag: number }}
 *   sx/sy: normalized steering unit vector
 *   buffedSpeed: final per-frame speed after all multipliers
 *   zigzag: lateral wobble offset for typeIndex 10 (Zigzagger)
 */
export function computeEnemySteeringVector(enemy, player, flowField, obstacles, opts = {}) {
  const {
    freezeTimer = 0,
    timeDilationTimer = 0,
    chainEnrageLevel = 0,
    enemySpeedMult = 1,
  } = opts;

  const e = enemy;
  const zigzag = e.typeIndex === 10 ? Math.sin((e.wobble || 0) * 3) * 3 : 0;

  const freezeMult    = freezeTimer > 0 ? 0.35 : 1;
  const timeDilMult   = timeDilationTimer > 0 ? 0.18 : 1;
  const enrageMult    = chainEnrageLevel === 2 ? 1.20 : chainEnrageLevel === 1 ? 1.10 : 1.0;
  const buffedSpeed   = e.speed * (e.buffed ? 1.35 : 1) * enemySpeedMult * freezeMult * timeDilMult * enrageMult;

  // Flow field steering: sample precomputed grid, fall back to direct vector
  let sx, sy;
  if (flowField && !e.chargeActive) {
    const sampled = sampleFlowField(flowField, e.x, e.y);
    if (sampled) {
      sx = sampled.sx; sy = sampled.sy;
    } else {
      const a = Math.atan2(player.y - e.y, player.x - e.x);
      sx = Math.cos(a); sy = Math.sin(a);
    }
  } else {
    const a = Math.atan2(player.y - e.y, player.x - e.x);
    sx = Math.cos(a); sy = Math.sin(a);
  }

  // Wall-avoidance: repulse from close obstacles (keeps enemies from clipping walls)
  if (!e.chargeActive) {
    for (const ob of obstacles) {
      const nx = Math.max(ob.x, Math.min(e.x, ob.x + ob.w));
      const ny = Math.max(ob.y, Math.min(e.y, ob.y + ob.h));
      const rdx = e.x - nx, rdy = e.y - ny;
      const rdist = Math.hypot(rdx, rdy);
      const AVOID_R = e.size / 2 + 32;
      if (rdist < AVOID_R && rdist > 0) {
        const str = (AVOID_R - rdist) / AVOID_R;
        sx += (rdx / rdist) * str * 3.5;
        sy += (rdy / rdist) * str * 3.5;
      }
    }
    const slen = Math.hypot(sx, sy);
    if (slen > 0) { sx /= slen; sy /= slen; }
  }

  return { sx, sy, buffedSpeed, zigzag };
}
