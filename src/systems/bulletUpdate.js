/**
 * bulletUpdate.js — pure per-frame bullet step functions (App.jsx slice 2).
 *
 * Each function mutates the bullet in place and returns an event descriptor so
 * the caller (App.jsx) can apply the matching visual/audio side effects without
 * this module knowing about particles, screen shake, or React refs.
 *
 * Extraction roadmap:
 *   slice 1 (gameStep.js)    — player movement, obstacle push-out
 *   slice 2 (this file)      — player bullet step, enemy bullet step
 *   slice 3                  — enemy movement (flow-field lookup)
 */

import { resolveObstacleBounce } from "./combatResolution.js";

/**
 * Step one player bullet forward by one frame.
 *
 * Mutates `bullet` in place (x, y, vx, vy, life, returning).
 *
 * @param {object} bullet      - { x, y, vx, vy, life, boomerang, returning,
 *                                outboundLife, bouncesLeft, trail, color, size }
 * @param {{ x: number, y: number }} playerPos
 * @param {Array<{ x, y, w, h }>}   obstacles
 * @param {{ W: number, H: number, frame: number }} opts
 *
 * @returns {{
 *   alive:        boolean,
 *   trailEvent:   null | { x: number, y: number, color: string },
 *   bounceEvent:  null | { x: number, y: number, bounced: boolean, consumed: boolean, color: string }
 * }}
 */
export function stepPlayerBullet(bullet, playerPos, obstacles = [], { W = 800, H = 600, frame = 0 } = {}) {
  // ── Boomerang steering ─────────────────────────────────────────────────────
  if (bullet.boomerang) {
    if (!bullet.returning) {
      const rot = 0.055;
      const nvx = bullet.vx * Math.cos(rot) - bullet.vy * Math.sin(rot);
      const nvy = bullet.vx * Math.sin(rot) + bullet.vy * Math.cos(rot);
      bullet.vx = nvx;
      bullet.vy = nvy;
      if (bullet.life <= (bullet.outboundLife || 0)) bullet.returning = true;
    } else {
      const bdx = playerPos.x - bullet.x;
      const bdy = playerPos.y - bullet.y;
      const bdist = Math.hypot(bdx, bdy);
      if (bdist < 24) {
        return { alive: false, trailEvent: null, bounceEvent: null };
      }
      const spd = Math.hypot(bullet.vx, bullet.vy);
      bullet.vx = (bdx / bdist) * spd;
      bullet.vy = (bdy / bdist) * spd;
    }
  }

  // ── Movement + lifetime ────────────────────────────────────────────────────
  bullet.x += bullet.vx;
  bullet.y += bullet.vy;
  bullet.life--;

  // Trail particle: caller decides whether to emit (every-other-frame cadence
  // is preserved here; the caller still controls addParticles).
  const trailEvent = (bullet.trail && frame % 2 === 0)
    ? { x: bullet.x, y: bullet.y, color: bullet.color || "#FFD700" }
    : null;

  // ── Obstacle bounce / consume ──────────────────────────────────────────────
  for (const ob of obstacles) {
    const bounce = resolveObstacleBounce(bullet, ob);
    if (bounce.bounced) {
      Object.assign(bullet, {
        x: bounce.x, y: bounce.y,
        vx: bounce.vx, vy: bounce.vy,
        bouncesLeft: bounce.bouncesLeft,
        life: bounce.life,
      });
      return {
        alive: true,
        trailEvent: null,
        bounceEvent: { x: bullet.x, y: bullet.y, bounced: true, consumed: false, color: bullet.color || "#FFD700" },
      };
    }
    if (bounce.consumed) {
      return {
        alive: false,
        trailEvent: null,
        bounceEvent: { x: bullet.x, y: bullet.y, bounced: false, consumed: true, color: bullet.color || "#FFD700" },
      };
    }
  }

  // ── Bounds / lifetime check ────────────────────────────────────────────────
  const alive = bullet.life > 0
    && bullet.x > -10 && bullet.x < W + 10
    && bullet.y > -10 && bullet.y < H + 10;

  return { alive, trailEvent, bounceEvent: null };
}

/**
 * Step one enemy bullet forward by one frame.
 *
 * Mutates `eb` in place (x, y, life).
 *
 * @param {object} eb          - { x, y, vx, vy, life }
 * @param {Array<{ x, y, w, h }>} obstacles
 * @param {{ W: number, H: number, timeDilationTimer: number }} opts
 *
 * @returns {{ alive: boolean }}
 */
export function stepEnemyBullet(eb, obstacles = [], { W = 800, H = 600, timeDilationTimer = 0 } = {}) {
  const tdm = timeDilationTimer > 0 ? 0.2 : 1;
  eb.x += eb.vx * tdm;
  eb.y += eb.vy * tdm;
  eb.life--;

  const hitWall = obstacles.some(
    ob => eb.x >= ob.x && eb.x <= ob.x + ob.w && eb.y >= ob.y && eb.y <= ob.y + ob.h,
  );
  if (hitWall) return { alive: false };

  return {
    alive: eb.life > 0
      && eb.x > -10 && eb.x < W + 10
      && eb.y > -10 && eb.y < H + 10,
  };
}
