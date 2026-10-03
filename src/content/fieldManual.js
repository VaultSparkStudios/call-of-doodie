// fieldManual.js — one source for "how do I play" (S163 IA consolidation).
//
// The static /field-manual/ page and the in-app quick reference both read
// from here, so the rules can no longer drift between the site and the game.
import { QUICK_RULES } from "../config/quickRules.js";
// S175: mode numbers quoted here are derived from the runtime authority.
import { BOSS_GAUNTLET_BOSS_COUNT, BOT_ROYALE_BOT_COUNT, THRONE_COUNT, spell } from "../config/modeFacts.js";

export const FIELD_MANUAL_SECTIONS = Object.freeze([
  ["1. Keep moving", "Circle threats, preserve escape lanes, and dash through danger when the arena closes in. Dash grants a brief window of invulnerability."],
  ["2. Aim into groups", "Weapons reward different ranges and crowd shapes. Switch when your current weapon no longer fits the pressure in front of you."],
  ["3. Build a run", "Classic offers one build choice at checkpoints on waves 4, 8, 12 and onward. Experience earns up to four doctrines at levels 5, 10, 15 and 20; one pending choice waits for a checkpoint. Operations and Sewer Zombies use field objectives and supplies instead of upgrade screens."],
  ["4. Read the warnings", "Ranged aim lines, shield arcs, boss rings, hazard colors, and shape markers communicate danger without relying on color alone."],
  ["5. Pick a mode that fits", `Standard is endless survival. BOSS GAUNTLET is ${spell(BOSS_GAUNTLET_BOSS_COUNT)} bosses and a par time. HOLD THE THRONE gives you a CPU squad and ${spell(THRONE_COUNT)} points to capture. SEWER EXTRACTION is loot, a climbing alarm, and an evac toilet. BOT ROYALE is ${spell(BOT_ROYALE_BOT_COUNT)} bots and a shrinking flood.`],
  ["6. Order your squad", "In squad modes press Z to follow, X to hold, C to attack. Stand next to a downed teammate to revive them before they bleed out."],
  ["Sewer Zombies", "Kill grotesque sewer creatures for sludge. Stand on the marked pump while its ring is clear; each of three pumps needs a 6-second fueled charge. Then complete a 5-second escape hatch hold before the four-minute backflow deadline. Pump progress survives retreats."],
  ["Operations", "Breach a door, hold a point, protect a cart, hunt a runner, sabotage a pump, escape and face the finale. Complete the task to advance while patrols remain alive; optional support interactions help without blocking progress."],
  ["Controls", QUICK_RULES.map(([, bold1, mid, bold2, tail]) => `${bold1}${mid}${bold2}${tail}`.trim()).join(" · ")],
]);
