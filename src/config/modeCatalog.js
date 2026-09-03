// modeCatalog.js — single source of truth for game-mode identity (S155).
//
// HomeV2, HomeV3, and the legacy MenuScreen each hardcoded their own 8-mode
// table with divergent labels (v1 omitted zombies entirely and mislabeled it
// "Standard"). This catalog merges the richest fields from all three and is
// keyed by REPLAY_MODES ids so the replay-code contract and the UI can never
// disagree about which modes exist — modeCatalog.test.js pins that.

import { REPLAY_MODES } from "../utils/replayCode.js";

// S163: every legacy entry is tagged. "mode" = a different game; "ruleset" =
// a challenge overlay on the survival loop. New replay-ineligible modes live in
// NEW_MODE_CATALOG so the eight-id replay contract stays byte-stable.
export const MODE_CATALOG = Object.freeze([
  { id: "standard",        kind: "mode",    label: "Standard Run",   short: "Standard", arcadeLabel: "NORMAL",        emoji: "🎯", icon: "▶", color: "#FFD700", blurb: "Survive as long as you can",                    description: "Survive escalating waves and build a powerful loadout." },
  { id: "score_attack",    kind: "ruleset", label: "Score Attack",   short: "Score",    arcadeLabel: "SCORE ATTACK",  emoji: "⏱",  icon: "⌁", color: "#FF6600", blurb: "5 min · faster spawns · max score",            description: "Five minutes, faster spawns, maximum score." },
  { id: "daily_challenge", kind: "ruleset", label: "Daily Challenge", short: "Daily",   arcadeLabel: "DAILY",         emoji: "📅", icon: "◈", color: "#00E5FF", blurb: "Same seed · global ranking",                   description: "The same seeded run for every player today." },
  { id: "cursed",          kind: "ruleset", label: "Cursed Run",     short: "Cursed",   arcadeLabel: "CURSED",        emoji: "☠",  icon: "✦", color: "#CC00FF", blurb: "All cursed perks · 3× score",                  description: "Hard modifiers with a three-times score multiplier." },
  { id: "boss_rush",       kind: "ruleset", label: "Boss Rush",      short: "Boss Rush", arcadeLabel: "BOSS RUSH",    emoji: "☠",  icon: "⚠", color: "#FF3333", blurb: "Every wave is a boss",                         description: "Face boss pressure on every wave." },
  { id: "speedrun",        kind: "ruleset", label: "Speed Run",      short: "Speed",    arcadeLabel: "SPEEDRUN",      emoji: "⏱",  icon: "»", color: "#00FF80", blurb: "Race the clock · live timer",                  description: "Race the clock with a live timer." },
  { id: "gauntlet",        kind: "ruleset", label: "Weekly Gauntlet", short: "Gauntlet", arcadeLabel: "GAUNTLET",     emoji: "🏆", icon: "◆", color: "#FFC800", blurb: "Weekly fixed opening kit · no shop",           description: "A fixed weekly opening kit with no shop." },
  { id: "zombies",         kind: "mode",    label: "Sewer Zombies",  short: "Zombies",  arcadeLabel: "SEWER ZOMBIES", emoji: "🧟", icon: "🧟", color: "#8DFF67", blurb: "Escalating hordes · surge every 3 waves",     description: "Escalating undead hordes with a surge every third wave." },
]);

// S163 new modes — real objectives, win states, and CPU squads. Local-only
// scoring until the leaderboard mode enum accepts them (replayEligible=false).
export const NEW_MODE_CATALOG = Object.freeze([
  { id: "boss_gauntlet",   kind: "mode", label: "Boss Gauntlet",   short: "Gauntlet",  arcadeLabel: "BOSS GAUNTLET",   emoji: "👑", icon: "♛", color: "#FF3333", blurb: "6 bosses · no trash · beat the par time", description: "Six bosses back to back, no filler. Clear all six to win.", replayEligible: false, isNew: true },
  { id: "hold_the_throne", kind: "mode", label: "Hold the Throne", short: "Throne",    arcadeLabel: "HOLD THE THRONE", emoji: "🪑", icon: "⚑", color: "#FFD34F", blurb: "Capture 3 thrones · CPU squad · Z/X/C orders", description: "King of the hill with a squad. Hold three thrones for thirty seconds each to win.", replayEligible: false, isNew: true },
]);

export const FULL_MODE_CATALOG = Object.freeze([...MODE_CATALOG, ...NEW_MODE_CATALOG]);

export function listModesByKind(kind) {
  return FULL_MODE_CATALOG.filter((mode) => mode.kind === kind);
}

const BY_ID = new Map(FULL_MODE_CATALOG.map((mode) => [mode.id, mode]));

export function getMode(id) {
  return BY_ID.get(id) || BY_ID.get("standard");
}

// Shared mode-flag priority chain, previously duplicated (identically) in
// HomeV2 and HomeV3 and re-derived (incompletely) in MenuScreen ternaries.
export function resolveSelectedModeId(flags = {}) {
  if (flags.zombiesMode) return "zombies";
  if (flags.bossRushMode) return "boss_rush";
  if (flags.cursedRunMode) return "cursed";
  if (flags.scoreAttackMode) return "score_attack";
  if (flags.dailyChallengeMode) return "daily_challenge";
  if (flags.speedrunMode) return "speedrun";
  if (flags.gauntletMode) return "gauntlet";
  return "standard";
}

// Guard: catalog ids must exactly match the replay-code mode contract, in
// order — a 9th mode added to REPLAY_MODES without catalog copy fails loudly.
export function assertCatalogMatchesReplayModes() {
  const catalogIds = MODE_CATALOG.map((mode) => mode.id);
  if (catalogIds.length !== REPLAY_MODES.length || catalogIds.some((id, index) => id !== REPLAY_MODES[index])) {
    throw new Error(`MODE_CATALOG ids [${catalogIds}] drifted from REPLAY_MODES [${REPLAY_MODES}]`);
  }
  return true;
}
