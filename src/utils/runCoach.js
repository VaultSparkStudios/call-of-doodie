/**
 * runCoach.js — composes the post-death "AI Run Coach" verdict.
 *
 * Closes the learning loop: the player just died, what should they take from
 * this run into the next one? Three lines, ~12 words each:
 *
 *   killedBy   → "What killed you" — uses recent death-by-enemy ledger
 *   tryNext    → "What to change next run" — meta upgrade or perk pivot
 *   working    → "What's working" — validated identity from runDebrief
 *
 * Pure functions. Zero LLM cost. Reads career, meta, run summary.
 */

import { getRecommendedMetaUpgrade } from "./metaClarity.js";
import { ENEMY_TYPES } from "../constants.js";
import { buildRunBrain } from "./runBrain.js";

function topRecentKiller(career, lookback = 5) {
  const arr = Array.isArray(career?.recentDeathsByEnemy) ? career.recentDeathsByEnemy.slice(0, lookback) : [];
  if (!arr.length) return null;
  const counts = {};
  for (const d of arr) counts[d.t] = (counts[d.t] || 0) + 1;
  let bestType = null, bestN = 0;
  for (const [t, n] of Object.entries(counts)) {
    if (n > bestN) { bestN = n; bestType = t; }
  }
  if (!bestType || bestN < 2) return null;
  const idx = Number(bestType);
  const def = ENEMY_TYPES?.[idx];
  return { type: bestType, count: bestN, lookback: arr.length, name: def?.name || `enemy #${bestType}`, emoji: def?.emoji || "👾" };
}

function buildKilledBy(career, runSummary) {
  const top = topRecentKiller(career);
  if (top) {
    return `${top.emoji} ${top.name} killed you ${top.count} of last ${top.lookback}. Telegraph windows widened — watch for the warning flash.`;
  }
  if (runSummary?.wave <= 5) return "Early-run deaths usually mean overcommitting before grabbing a perk. Stay mobile until level 3.";
  if (runSummary?.bossKilled === false && runSummary?.wave >= 5) return "Boss waves end most runs at this stage — keep one weapon at full ammo for the fight.";
  return "Death cause varies — no single threat is repeating. You're on the curve.";
}

function buildTryNext(meta, career) {
  const rec = getRecommendedMetaUpgrade(meta?.unlocked || [], meta, career);
  if (rec && rec.affordable) {
    return `Spend ${rec.node.cost} CP on ${rec.branch.emoji} ${rec.node.name} — ${rec.reason}`;
  }
  if (rec && !rec.affordable) {
    return `Save toward ${rec.branch.emoji} ${rec.node.name} (${rec.node.cost} CP) — ${rec.reason}`;
  }
  return "Try a different starter loadout — your weakness pattern points to varying your opener.";
}

function buildWorking(runSummary) {
  const top = runSummary?.topWeapon;
  if (top && top.share >= 0.5) {
    return `${top.weapon.emoji || "🔫"} ${top.weapon.name} carried ${Math.round(top.share * 100)}% of kills — keep building around it.`;
  }
  if ((runSummary?.bestStreak || 0) >= 15) {
    return `Your ${runSummary.bestStreak}-streak proves your mobility is on point — lean into perks that reward staying aggressive.`;
  }
  if ((runSummary?.crits || 0) >= 10) {
    return `${runSummary.crits} crits this run — precision builds (Marksman, Glass Cannon) compound that strength.`;
  }
  return "Balanced run — consider committing to a single weapon archetype next time for synergy bonuses.";
}

/**
 * @param {{ career: object, meta: object, runSummary: object }} ctx
 * @returns {{ killedBy: string, tryNext: string, working: string }}
 */
export function buildRunCoach({ career = {}, meta = {}, runSummary = {}, runHistory = [], studioEvents = [] } = {}) {
  const brain = buildRunBrain({
    career,
    runHistory,
    studioEvents,
    latestAdvice: runSummary?.drill || null,
  });
  return {
    killedBy: buildKilledBy(career, runSummary),
    tryNext:  buildTryNext(meta, career),
    working:  buildWorking(runSummary),
    brain,
  };
}
