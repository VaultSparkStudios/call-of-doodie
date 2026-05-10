// heatMeter.js — moment-to-moment intensity scalar (0..100).
//
// Heat climbs on kills (more for multikills/bosses) and decays continuously.
// Above thresholds the caller should swap music tier and brighten visuals.
// Pure functions — gs.heat is the canonical store.
//
// Tuning notes:
//   - Single kill   = +3
//   - Streak ≥ 5    = +5
//   - Streak ≥ 10   = +8
//   - Boss kill     = +20
//   - Decay per frame ≈ 0.20 (full heat decays in ~8s of inactivity)
//   - Cap at 100; threshold 40 = "warm", 70 = "overdrive"

export const HEAT_MAX = 100;
export const HEAT_THRESHOLD_WARM = 40;
export const HEAT_THRESHOLD_OVERDRIVE = 70;
const DECAY_PER_FRAME = 0.20;

export function addHeatOnKill(gs, { isBoss = false, killstreak = 0 } = {}) {
  if (!gs) return 0;
  let delta = 3;
  if (isBoss) delta = 20;
  else if (killstreak >= 10) delta = 8;
  else if (killstreak >= 5) delta = 5;
  gs.heat = Math.min(HEAT_MAX, (gs.heat || 0) + delta);
  return gs.heat;
}

export function decayHeat(gs) {
  if (!gs || !gs.heat) return 0;
  gs.heat = Math.max(0, gs.heat - DECAY_PER_FRAME);
  return gs.heat;
}

export function heatTier(heat) {
  if (heat >= HEAT_THRESHOLD_OVERDRIVE) return 2;
  if (heat >= HEAT_THRESHOLD_WARM) return 1;
  return 0;
}

export function resetHeat(gs) {
  if (gs) gs.heat = 0;
}
