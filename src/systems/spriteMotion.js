// S145 sprite-motion microsystem — pure mapping from entity state to a
// per-frame draw transform. No asset bytes: squash-stretch, velocity lean,
// idle breathing, spawn pop, and sprite death choreography live here.
// Every output is bounded so a hostile or NaN input cannot distort a sprite.

const MAX_LEAN_RAD = 0.10;      // ~6 degrees
const HIT_SQUASH = 0.16;        // max squash on fresh hit
const BREATH_SCALE = 0.022;     // idle breathing amplitude
const SPAWN_POP_FRAMES = 8;

function finite(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

// Deterministic per-entity phase so a crowd never breathes in unison.
export function motionPhaseSeed(x, y) {
  const seed = (finite(x) * 73856093) ^ (finite(y) * 19349663);
  return Math.abs(seed % 628) / 100; // 0..6.28
}

export function resolveSpriteMotion({
  frame = 0,
  facingAngle = 0,
  speed = 0,
  hitFlash = 0,
  spawnAge = null,
  phase = 0,
  reduced = false,
} = {}) {
  if (reduced) return { rotation: 0, scaleX: 1, scaleY: 1, offsetY: 0 };
  const f = finite(frame);
  const flash = clamp(finite(hitFlash), 0, 12);
  // Velocity lean: tip toward the direction of travel, scaled by speed.
  const leanMag = clamp(finite(speed) / 4, 0, 1) * MAX_LEAN_RAD;
  const rotation = clamp(Math.cos(finite(facingAngle)) * leanMag, -MAX_LEAN_RAD, MAX_LEAN_RAD);
  // Hit recoil: squash wide + short, recovering over the flash window.
  const squash = (flash / 12) * HIT_SQUASH;
  // Idle breathing.
  const breath = Math.sin(f * 0.055 + finite(phase)) * BREATH_SCALE;
  let scaleX = 1 + squash + breath * 0.4;
  let scaleY = 1 - squash + breath;
  // Spawn pop-in: 0 → overshoot → settle across SPAWN_POP_FRAMES.
  if (spawnAge != null) {
    const age = clamp(finite(spawnAge), 0, SPAWN_POP_FRAMES);
    if (age < SPAWN_POP_FRAMES) {
      const t = age / SPAWN_POP_FRAMES;
      const pop = t < 0.7 ? t / 0.7 * 1.08 : 1.08 - ((t - 0.7) / 0.3) * 0.08;
      scaleX *= pop;
      scaleY *= pop;
    }
  }
  return {
    rotation,
    scaleX: clamp(scaleX, 0.6, 1.4),
    scaleY: clamp(scaleY, 0.6, 1.4),
    offsetY: breath * -6,
  };
}

// Death choreography for sprite-rendered enemies: squash, fall, fade.
// progress: 0 (just died) → 1 (gone).
export function resolveSpriteDeath(progress) {
  const t = clamp(finite(progress), 0, 1);
  return {
    alpha: 1 - t * t,
    scaleX: 1 + t * 0.35,
    scaleY: Math.max(0.08, 1 - t * 0.92),
    offsetY: t * 10,
    rotation: t * 0.35,
  };
}
