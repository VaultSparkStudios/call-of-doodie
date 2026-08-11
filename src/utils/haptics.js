/**
 * haptics.js — mobile touch vibration feedback.
 *
 * Gamepad rumble and touch vibration share one settings gate so input paths
 * cannot drift into contradictory enabled states.
 */

import { getPrimaryGamepad } from "./gamepad.js";

let _hapticsEnabled = true; // gated by settings.rumble, mirrors App.jsx's _rumbleEnabled

export function setHapticsEnabled(enabled) {
  _hapticsEnabled = enabled !== false;
}

export function rumbleGamepad(weakMagnitude, strongMagnitude, durationMs) {
  if (!_hapticsEnabled) return;
  try {
    getPrimaryGamepad()?.vibrationActuator?.playEffect("dual-rumble", {
      startDelay: 0,
      duration: durationMs,
      weakMagnitude,
      strongMagnitude,
    });
  } catch (_) { /* not supported */ }
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
