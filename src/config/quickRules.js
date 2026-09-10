// quickRules.js — the condensed rules/controls quick reference (S155).
// Previously hand-written inline in HomeV2's Field Manual tab, where it had
// drifted from the full RulesPanel/ControlsPanel copy. Kept as a tiny config
// module (NOT in MenuPanels.jsx) so the lazy MenuPanels bundle split holds.
// S175: the boss cadence is derived, not typed — see src/config/modeFacts.js.
// modeFacts is dependency-free, so importing it here does not disturb the lazy
// MenuPanels split this module exists to protect.
// Row shape: [emoji, bold1, midText, bold2, tailText].
import { STANDARD_BOSS_WAVE_INTERVAL } from "./modeFacts.js";
export const QUICK_RULES = Object.freeze([
  ["🎯", "Move", " with WASD / left stick · ", "Aim", " with mouse / right stick."],
  ["💨", "Dash", " (Shift / A button) — Invincible dodge. ", "Grenade", " (Space / B) — AOE."],
  ["🔢", "Weapon keys 1–9", " swap · ", "R", " reloads · Esc pauses."],
  ["⚠️", `Boss every ${STANDARD_BOSS_WAVE_INTERVAL} waves.`, " Perks unlock on level-up. Wave shop between waves.", "", ""],
  ["💩", "Earn Doodie Coins", " for streaks — spend in the wave shop.", "", ""],
]);
