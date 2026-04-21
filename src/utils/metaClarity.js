/**
 * metaClarity.js — Meta clarity pass
 *
 * Recommends the single most impactful next META_TREE upgrade based on career
 * weakness analysis. Exposed to front-door action stack and MetaTreePanel.
 */

import { META_TREE } from "../constants.js";

/**
 * Returns the canonical next unlockable node in a branch (the one whose
 * `requires` is already unlocked, or the root node if nothing is unlocked).
 */
function nextNodeInBranch(branch, unlockedSet) {
  for (const node of branch.nodes) {
    if (unlockedSet.has(node.id)) continue;
    if (!node.requires || unlockedSet.has(node.requires)) return node;
  }
  return null; // all nodes in branch are unlocked
}

/**
 * Identify the player's primary weakness from career stats.
 * @returns {"defense"|"offense"|"utility"|"chaos"|null}
 */
function identifyWeakness(career = {}) {
  const runs = career.totalRuns || 0;
  if (runs < 2) return null; // too early to read

  const avgWave = runs > 0 ? (career.bestWave || 1) / Math.max(runs, 1) : 0;
  const kd = career.totalDeaths > 0 ? (career.totalKills || 0) / career.totalDeaths : 99;
  const killsPerRun = Math.floor((career.totalKills || 0) / Math.max(runs, 1));

  // Dying early → defense
  if ((career.bestWave || 0) < 8 && avgWave < 5) return "defense";
  // Low K/D → offense
  if (kd < 3 && killsPerRun < 30) return "offense";
  // Surviving well but low coin efficiency → utility
  if (avgWave >= 6 && kd >= 3 && killsPerRun >= 30) return "utility";
  // Good at the game → chaos for score multiplier upside
  return "chaos";
}

/**
 * Recommend the single most impactful next META_TREE upgrade.
 *
 * @param {string[]} unlocked - Array of unlocked node IDs
 * @param {{ careerPoints?: number }} meta
 * @param {object} career - Career stats from loadCareerStats()
 * @returns {{ node: object, branch: object, reason: string } | null}
 */
export function getRecommendedMetaUpgrade(unlocked = [], meta = {}, career = {}) {
  const unlockedSet = new Set(unlocked);
  const points = meta?.careerPoints || 0;
  const weakness = identifyWeakness(career);
  const runs = career.totalRuns || 0;

  // Build candidate list: [branchId, node] for all affordable next nodes
  const candidates = [];
  for (const [branchId, branch] of Object.entries(META_TREE)) {
    const node = nextNodeInBranch(branch, unlockedSet);
    if (node) candidates.push({ branchId, branch, node });
  }

  if (candidates.length === 0) return null; // fully unlocked

  // No points at all — tell them to earn first
  if (points < (candidates.reduce((min, c) => Math.min(min, c.node.cost), Infinity))) {
    const cheapest = candidates.reduce((best, c) => c.node.cost < best.node.cost ? c : best);
    return {
      node: cheapest.node,
      branch: cheapest.branch,
      reason: `Earn ${cheapest.node.cost - points} more career points to unlock your first/next upgrade.`,
      affordable: false,
    };
  }

  // First: match weakness to branch
  if (weakness) {
    const match = candidates.find(c => c.branchId === weakness && points >= c.node.cost);
    if (match) {
      const reasons = {
        defense: `Your early-run survival rate suggests more tankiness pays off more than extra damage right now.`,
        offense: `Boosting raw kill output is highest leverage when K/D is below 3 and kills per run are low.`,
        utility: `You're surviving well — XP and coin efficiency compound your existing strengths.`,
        chaos: `Your foundation is solid. Chaos multipliers flip good runs into great scores.`,
      };
      return { node: match.node, branch: match.branch, reason: reasons[weakness], affordable: true };
    }
  }

  // Fallback: cheapest affordable node
  const affordable = candidates.filter(c => points >= c.node.cost);
  if (affordable.length === 0) {
    const cheapest = candidates.reduce((best, c) => c.node.cost < best.node.cost ? c : best);
    return {
      node: cheapest.node, branch: cheapest.branch,
      reason: `${cheapest.node.cost - points} more points needed — ${cheapest.node.name} is the closest unlock.`,
      affordable: false,
    };
  }

  const first = affordable[0];

  // First-run players: always recommend cheapest (50 CP nodes)
  if (runs <= 3) {
    const root = affordable.find(c => !c.node.requires) || first;
    return {
      node: root.node, branch: root.branch,
      reason: `${root.node.name} is the best first investment — low cost, compounds every future run.`,
      affordable: true,
    };
  }

  return {
    node: first.node, branch: first.branch,
    reason: `${first.node.name} is the next available upgrade in the ${first.branch.label} branch.`,
    affordable: true,
  };
}

/**
 * Returns a short label for the upgrade recommendation suitable for the
 * front-door action chip or Intel ticker.
 */
export function getMetaRecommendationLabel(rec) {
  if (!rec) return null;
  const prefix = rec.affordable ? "💡 Spend" : "📈 Work toward";
  return `${prefix} ${rec.branch.emoji} ${rec.node.name} (${rec.node.cost} pts) — ${rec.reason}`;
}
