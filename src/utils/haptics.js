/**
 * haptics.js — mobile touch vibration feedback.
 *
 * Desktop already gets gamepad rumble (App.jsx rumbleGamepad via the
 * Gamepad Vibration Actuator API). Touch play had no tactile channel at all —
 * this closes that gap with navigator.vibrate, gated by capability + the
 * existing "rumble" settings flag so one toggle controls both haptic paths.
 */

let _hapticsEnabled = true; // gated by settings.rumble, mirrors App.jsx's _rumbleEnabled

export function setHapticsEnabled(enabled) {
  _hapticsEnabled = enabled !== false;
}

export function hasVibrationSupport() {
  return typeof navigator !== "undefined" && typeof navigator.vibrate === "function";
}

// Named short patterns (ms), tuned to feel distinct without being obnoxious on repeat.
const HAPTIC_PATTERNS = {
  hit: 12,
  crit: [10, 30, 18],
  kill: 20,
  bossPhase2: [30, 40, 30, 40, 60],
  lowHealth: 25,
  achievement: [15, 60, 15, 60, 30],
};

export function vibrate(patternName) {
  if (!_hapticsEnabled || !hasVibrationSupport()) return;
  const pattern = HAPTIC_PATTERNS[patternName];
  if (!pattern) return;
  try { navigator.vibrate(pattern); } catch (_) { /* not supported */ }
}
