// fieldManual.js — one source for "how do I play" (S163 IA consolidation).
//
// The static /field-manual/ page and the in-app quick reference both read
// from here, so the rules can no longer drift between the site and the game.
import { QUICK_RULES } from "../config/quickRules.js";

export const FIELD_MANUAL_SECTIONS = Object.freeze([
  ["1. Keep moving", "Circle threats, preserve escape lanes, and dash through danger when the arena closes in. Dash grants a brief window of invulnerability."],
  ["2. Aim into groups", "Weapons reward different ranges and crowd shapes. Switch when your current weapon no longer fits the pressure in front of you."],
  ["3. Build a run", "Collect experience, choose upgrades, and combine effects that support one plan. Focused synergies usually outperform a pile of unrelated bonuses."],
  ["4. Read the warnings", "Ranged aim lines, shield arcs, boss rings, hazard colors, and shape markers communicate danger without relying on color alone."],
  ["5. Pick a mode that fits", "Standard is endless survival. BOSS GAUNTLET is six bosses and a par time. HOLD THE THRONE gives you a CPU squad and three points to capture. SEWER EXTRACTION is loot, a climbing alarm, and an evac toilet. BOT ROYALE is twelve bots and a shrinking flood."],
  ["6. Order your squad", "In squad modes press Z to follow, X to hold, C to attack. Stand next to a downed teammate to revive them before they bleed out."],
  ["Controls", QUICK_RULES.map(([, bold1, mid, bold2, tail]) => `${bold1}${mid}${bold2}${tail}`.trim()).join(" · ")],
]);
