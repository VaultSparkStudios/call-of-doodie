import { writeLocalState } from "./utils/storageHealth.js";

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
  tacticalWhisper:     true,   // rate-limited mid-run coaching lines (S145)

  // Controller settings
  rumble:              true,  // haptic vibration feedback
  controllerDeadZone:  0.2,   // analog stick dead zone (0.05–0.4)
  aimAssist:           false, // snap aim toward nearest enemy when using gamepad
  // Touch settings
  controlHandedness:  "right", // "right" (default: move-left/aim-right) | "left" (mirrored)
  // Accessibility
  reducedMotion:       false, // disable screen shake, flashes, trails (photosensitivity)
  // HUD density preset: "minimal" (HP/ammo/score only), "standard" (default), "tactical" (everything)
  hudDensity:          "standard",
  // Character art pack: Modern is the default; Retro restores the first playable's circle-and-emoji cast.
  visualPack:          "modern",

  // Audio submix volumes (0–1), applied to the Web Audio bus graph.
  // Mute + music vibe stay on their pre-existing preference keys
  // (cod-music-muted / cod-music-vibe) for back-compat.
  masterVolume:        1.0,
  sfxVolume:           1.0,
  musicVolume:         0.8,
  ambientVolume:       0.7,
  uiVolume:            1.0,
};

// HUD widget visibility derived from density preset.
// Minimal: streamer-friendly, just survival vitals.
// Standard: same as pre-Session-57 default.
// Tactical: everything including DPS + enemy bars + danger overlay.
export function hudFlags(density) {
  switch (density) {
    case "minimal":
      return {
        showMissionWidget: false, showWaveIncoming: false, showHeatMeter: false,
        useCompactDesktop: true,
        showAmmoBars: false, showSynergyChips: false, showBuildSummary: false,
        showMutationBanner: false, showCoinStreak: false,
      };
    case "tactical":
      return {
        showMissionWidget: true, showWaveIncoming: true, showHeatMeter: true,
        useCompactDesktop: false,
        showAmmoBars: true, showSynergyChips: true, showBuildSummary: true,
        showMutationBanner: true, showCoinStreak: true,
      };
    case "standard":
    default:
      return {
        showMissionWidget: true, showWaveIncoming: true, showHeatMeter: true,
        useCompactDesktop: true,
        showAmmoBars: true, showSynergyChips: true, showBuildSummary: false,
        showMutationBanner: true, showCoinStreak: true,
      };
  }
}

const SK = "cod-settings-v1";
const PK = "cod-presets-v1";

export function loadSettings() {
  try { const r = localStorage.getItem(SK); return r ? { ...SETTINGS_DEFAULTS, ...JSON.parse(r) } : { ...SETTINGS_DEFAULTS }; } catch { return { ...SETTINGS_DEFAULTS }; }
}
export function saveSettings(s) {
  writeLocalState(SK, JSON.stringify(s), { surface: "settings" });
}
export function loadPresets() {
  try { const r = localStorage.getItem(PK); return r ? JSON.parse(r) : []; } catch { return []; }
}
export function savePresets(p) {
  writeLocalState(PK, JSON.stringify(p), { surface: "settings" });
}

// S145 — copy per-run user settings onto live game state (extracted from
// startGame so App.jsx stays inside its architecture line budget).
export function applyRunSettings(gs, sett) {
  gs.player.speed *= sett.playerSpeedMult;
  gs.settSpawnMult = sett.enemySpawnMult;
  gs.settEnemyHealthMult = sett.enemyHealthMult;
  gs.settEnemySpeedMult = sett.enemySpeedMult;
  gs.settScreenShakeMult = sett.screenShakeMult;
  gs.settParticlesMult = sett.particlesMult;
  gs.settGrenadeRadMult = sett.grenadeRadiusMult;
  gs.settAutoReload = sett.autoReload;
  gs.settShowDPS = sett.showDPS;
  gs.settCrosshair = sett.crosshair;
  gs.settShowEnemyHealthBars = sett.showEnemyHealthBars ?? false;
  gs.settTacticalWhisper = sett.tacticalWhisper ?? true;
}
