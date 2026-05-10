// cosmeticTrack.js — "Doodie Pass Lite" cosmetic-only progression track.
//
// 10 cosmetics released over 4 weeks since the campaign anchor date.
// FREE track unlocks 4 of them via play (career milestones).
// SUPPORTER track unlocks all 10 + grants early access (week-of-release).
//
// IMPORTANT (locked-in by founder feedback):
//   - No gameplay impact. Only skins, taunts, kill-text fonts, badge tints.
//   - No paywall on any in-game advantage.
//   - The supporter unlock continues to use the existing isSupporter() flag
//     (which is set by the Ko-fi webhook).
//
// Anchor (week 0) = Mon 2026-05-04. Each "week" advances on Mondays.

import { isSupporter } from "./supporter.js";

const ANCHOR_MS = Date.UTC(2026, 4, 4); // 2026-05-04 Monday
const STORAGE_KEY = "cod-cosmetic-track-v1";

export const COSMETICS = [
  { id: "skin_classic_camo",  week: 0, type: "skin",   name: "Classic Camo",    emoji: "🟢", desc: "Earthy classic camo skin", milestone: { kind: "runs", n: 1 } },
  { id: "taunt_cooked",       week: 0, type: "taunt",  name: "\"Cooked.\"",      emoji: "🔥", desc: "Death-screen one-liner",   milestone: { kind: "deaths", n: 5 } },
  { id: "killtext_brick",     week: 1, type: "killtext", name: "Brick Font",     emoji: "🧱", desc: "Bold blocky kill-feed font", milestone: null },
  { id: "skin_porcelain",     week: 1, type: "skin",   name: "Porcelain",       emoji: "🚽", desc: "Glossy white-tile skin",    milestone: { kind: "wave", n: 15 } },
  { id: "spray_fart_cloud",   week: 2, type: "spray",  name: "Fart Cloud",      emoji: "💨", desc: "Death spawn-point spray",   milestone: null },
  { id: "skin_golden_throne", week: 2, type: "skin",   name: "Golden Throne",   emoji: "👑", desc: "Burnished gold skin",       milestone: null },
  { id: "killtext_pixel",     week: 3, type: "killtext", name: "Pixel Font",    emoji: "🟦", desc: "8-bit kill-feed font",      milestone: { kind: "kills_total", n: 1000 } },
  { id: "taunt_press_x",      week: 3, type: "taunt",  name: "\"Press X to doubt.\"", emoji: "🤨", desc: "Death-screen one-liner", milestone: null },
  { id: "spray_doodie_logo",  week: 3, type: "spray",  name: "Doodie Logo",     emoji: "💩", desc: "Mark your spawn",           milestone: null },
  { id: "skin_war_veteran",   week: 3, type: "skin",   name: "War Veteran",     emoji: "🎖", desc: "Battle-worn veteran skin",  milestone: null },
];

export function currentTrackWeek(now = Date.now()) {
  const diffMs = now - ANCHOR_MS;
  if (diffMs < 0) return 0;
  return Math.min(3, Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000)));
}

/** Returns array of cosmetic IDs available this week (not necessarily owned). */
export function availableThisWeek(now = Date.now()) {
  const w = currentTrackWeek(now);
  const supporter = isSupporter();
  // Supporters get full week-of-release access; free users get last week's drops too.
  const cap = supporter ? w : Math.max(0, w - 1);
  return COSMETICS.filter(c => c.week <= cap).map(c => c.id);
}

function loadOwned() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { owned: [], equipped: {} };
  } catch { return { owned: [], equipped: {} }; }
}

function saveOwned(state) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
}

/**
 * Reconcile ownership against milestones + supporter status.
 * Caller passes career stats; this returns { owned, newlyUnlocked }.
 */
export function reconcileOwnership(career = {}) {
  const state = loadOwned();
  const ownedSet = new Set(state.owned || []);
  const supporter = isSupporter();
  const eligible = new Set(availableThisWeek());
  const newlyUnlocked = [];
  for (const c of COSMETICS) {
    if (ownedSet.has(c.id)) continue;
    if (!eligible.has(c.id)) continue;
    let earned = false;
    if (supporter) earned = true;
    else if (c.milestone) {
      const m = c.milestone;
      if (m.kind === "runs"        && (career.totalRuns        || 0) >= m.n) earned = true;
      if (m.kind === "deaths"      && (career.totalDeaths      || 0) >= m.n) earned = true;
      if (m.kind === "wave"        && (career.bestWave         || 0) >= m.n) earned = true;
      if (m.kind === "kills_total" && (career.totalKills       || 0) >= m.n) earned = true;
    }
    if (earned) {
      ownedSet.add(c.id);
      newlyUnlocked.push(c);
    }
  }
  state.owned = [...ownedSet];
  saveOwned(state);
  return { owned: state.owned, equipped: state.equipped || {}, newlyUnlocked };
}

export function isCosmeticOwned(id) {
  return loadOwned().owned.includes(id);
}

export function equipCosmetic(id) {
  const state = loadOwned();
  if (!state.owned.includes(id)) return false;
  const c = COSMETICS.find(x => x.id === id);
  if (!c) return false;
  state.equipped = { ...(state.equipped || {}), [c.type]: id };
  saveOwned(state);
  return true;
}

export function getEquippedByType(type) {
  return loadOwned().equipped?.[type] || null;
}

export function getCosmeticById(id) {
  return COSMETICS.find(c => c.id === id) || null;
}
