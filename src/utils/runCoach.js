/**
 * runCoach.js — composes the post-death "AI Run Coach" verdict.
 *
 * Closes the learning loop: the player just died, what should they take from
 * this run into the next one?
 *
 *   killedBy   → "What killed you" — career death pattern with specific tips
 *   tryNext    → "What to change next run" — meta upgrade or perk pivot
 *   working    → "What's working" — validated identity from runDebrief
 *   weaponTip  → "Weapon coaching" — concrete advice from weapon kill share
 *
 * Pure functions. Zero LLM cost. Reads career, meta, run summary.
 */

import { getRecommendedMetaUpgrade } from "./metaClarity.js";
import { WEAPONS, ENEMY_TYPES } from "../constants.js";
import { buildRunBrain } from "./runBrain.js";

// Enemy-specific evasion tips keyed by ENEMY_TYPES index
const ENEMY_EVASION_TIPS = {
  4:  "Karen charges in a straight line — sidestep perpendicular when she winds up.",
  9:  "Landlord summons stack up fast — kill tenants first, then whittle the boss.",
  17: "Juggernaut charges at walls — lure it to a corner, then attack while it's stunned.",
  3:  "Shielded enemies face you — circle behind them or use explosives to bypass armor.",
  6:  "Teleporters blink toward you — keep moving and don't commit to long reload cycles.",
  10: "Zigzaggers weave unpredictably — short bursts > sustained fire on them.",
  19: "Doomscroller freezes periodically — punish the freeze window with your heaviest weapon.",
  20: "Berserker elites move 3× fast — prioritize them before clearing the wave.",
};

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
  return { type: bestType, count: bestN, lookback: arr.length, name: def?.name || `enemy #${bestType}`, emoji: def?.emoji || "👾", idx };
}

function buildKilledBy(career, runSummary) {
  const top = topRecentKiller(career);
  if (top) {
    const tip = ENEMY_EVASION_TIPS[top.idx];
    const patternLine = `${top.emoji} ${top.name} has ended ${top.count} of your last ${top.lookback} runs.`;
    return tip
      ? `${patternLine} Tip: ${tip}`
      : `${patternLine} Watch for the warning flash — telegraph windows are widened for you now.`;
  }
  if (runSummary?.wave <= 3) return "Early-run deaths usually mean overcommitting before your first perk. Stay mobile until you hit level 3.";
  if (runSummary?.wave <= 6) return "Mid-early deaths often come from underusing grenades and dashes as tempo tools — they're on cooldown, not one-time use.";
  if (runSummary?.bossKilled === false && (runSummary?.wave || 0) >= 5) return "Boss waves end most runs at this stage — keep one weapon at full ammo specifically for the fight.";
  return "No repeating death source detected. You're progressing through varied threats — keep varying your counters.";
}

function buildTryNext(meta, career) {
  const rec = getRecommendedMetaUpgrade(meta?.unlocked || [], meta, career);
  if (rec && rec.affordable) {
    return `Spend ${rec.node.cost} CP on ${rec.branch.emoji} ${rec.node.name} — ${rec.reason}`;
  }
  if (rec && !rec.affordable) {
    return `Save toward ${rec.branch.emoji} ${rec.node.name} (${rec.node.cost} CP) — ${rec.reason}`;
  }
  return "Try a different starter loadout — your weakness pattern suggests varying your opener next run.";
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

function buildWeaponTip(runSummary) {
  const wk = Array.isArray(runSummary?.weaponKills) ? runSummary.weaponKills : [];
  if (!wk.length) return null;

  const totalKills = wk.reduce((s, k) => s + (k || 0), 0);
  if (!totalKills) return null;

  // Find highest and lowest contributing weapons that were actually used
  let topIdx = 0, topKills = 0, wasteIdx = -1, wasteKills = Infinity;
  for (let i = 0; i < wk.length; i++) {
    if ((wk[i] || 0) > topKills) { topKills = wk[i]; topIdx = i; }
    if ((wk[i] || 0) > 0 && (wk[i] || 0) < wasteKills) { wasteKills = wk[i]; wasteIdx = i; }
  }
  const topShare = topKills / totalKills;
  const wasteShare = wasteIdx >= 0 ? wasteKills / totalKills : 1;

  // Weapon that got <8% of kills despite being used — likely underutilised
  if (wasteIdx >= 0 && wasteIdx !== topIdx && wasteShare < 0.08) {
    const w = WEAPONS[wasteIdx];
    return w
      ? `${w.emoji || "🔫"} ${w.name} only got ${Math.round(wasteShare * 100)}% of kills — drop it earlier or upgrade it to make it count.`
      : null;
  }

  // Top weapon dominates: good — suggest doubling down on synergy
  if (topShare >= 0.65) {
    const w = WEAPONS[topIdx];
    return w
      ? `${w.emoji || "🔫"} ${w.name} dominated — check if any perks or weapon synergies pair with it for a compounding multiplier.`
      : null;
  }

  // Spread build: all weapons fairly even → nudge toward commitment
  const usedCount = wk.filter(k => k > 0).length;
  if (usedCount >= 4 && topShare < 0.40) {
    return "Your kills were split across 4+ weapons — committing earlier to your top two and upgrading them first unlocks stronger synergy effects.";
  }

  return null;
}

function buildPrecisionTip(runSummary) {
  const streak = Number(runSummary?.bestPrecisionStreak) || 0;
  const kills = Number(runSummary?.kills) || 0;
  const crits = Number(runSummary?.crits) || 0;
  if (streak >= 5) {
    return `Best precision chain: ${streak}. Keep the aim discipline and route toward crit/damage multipliers before adding spread weapons.`;
  }
  if (kills >= 20 && streak < 3 && crits < Math.max(3, kills * 0.08)) {
    return "Precision gap detected: slow one weapon down next run and aim through enemy centers before chasing fire rate.";
  }
  return null;
}

/**
 * @param {{ career: object, meta: object, runSummary: object, runHistory: object[], studioEvents: object[] }} ctx
 * @returns {{ killedBy: string, tryNext: string, working: string, weaponTip: string|null, precisionTip: string|null, brain: object }}
 */
export function buildRunCoach({ career = {}, meta = {}, runSummary = {}, runHistory = [], studioEvents = [] } = {}) {
  const brain = buildRunBrain({
    career,
    runHistory,
    studioEvents,
    latestAdvice: runSummary?.drill || null,
    latestRun: runSummary,
  });
  return {
    killedBy:  buildKilledBy(career, runSummary),
    tryNext:   buildTryNext(meta, career),
    working:   buildWorking(runSummary),
    weaponTip: buildWeaponTip(runSummary),
    precisionTip: buildPrecisionTip(runSummary),
    brain,
  };
}
