export const SETTINGS_DEFAULTS = {
  enemySpawnMult:      1.0,   // how fast enemies spawn (0.5–2×)
  enemyHealthMult:     1.0,   // enemy HP multiplier (0.5–2×)
  enemySpeedMult:      1.0,   // enemy movement speed (0.5–1.5×)
  playerSpeedMult:     1.0,   // player movement speed (0.75–1.5×)
  xpGainMult:          1.0,   // XP earned per kill (0.5–2×)
  pickupMagnet:        1.0,   // pickup collection radius (1–4×)
  screenShakeMult:     1.0,   // screen shake intensity (0–2×)
  particlesMult:       1.0,   // particle count scale (0.25–2×)
  crosshair:           "cross", // cross | dot | circle | none
  showDPS:             false,
  autoReload:          false,
  grenadeRadiusMult:   1.0,  // grenade blast radius (0.5–2×)
  showEnemyHealthBars: false,  // show health bars above all enemies at all times
  // Controller settings
  rumble:              true,  // haptic vibration feedback
  controllerDeadZone:  0.2,   // analog stick dead zone (0.05–0.4)
  aimAssist:           false, // snap aim toward nearest enemy when using gamepad
  // Accessibility
  reducedMotion:       false, // disable screen shake, flashes, trails (photosensitivity)
};

const SK = "cod-settings-v1";
const PK = "cod-presets-v1";

export function loadSettings() {
  try { const r = localStorage.getItem(SK); return r ? { ...SETTINGS_DEFAULTS, ...JSON.parse(r) } : { ...SETTINGS_DEFAULTS }; } catch { return { ...SETTINGS_DEFAULTS }; }
}
export function saveSettings(s) {
  try { localStorage.setItem(SK, JSON.stringify(s)); } catch {}
}
export function loadPresets() {
  try { const r = localStorage.getItem(PK); return r ? JSON.parse(r) : []; } catch { return []; }
}
export function savePresets(p) {
  try { localStorage.setItem(PK, JSON.stringify(p)); } catch {}
}
