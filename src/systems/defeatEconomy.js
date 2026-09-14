import { computeKillPoints } from "./scoreLedger.js";

const CAREER_BOSS_TYPES = new Set([4, 9, 16, 17, 18, 20, 21]);

export function isCareerBossType(typeIndex) {
  return CAREER_BOSS_TYPES.has(Number(typeIndex));
}

export function planEnemyDefeatScore({
  enemy = {},
  comboMult = 1,
  killScoreMult = 1,
  weeklyKillScoreMult = 1,
  routeKillScoreMult = 1,
  activeObjective = null,
  playerPos = null,
} = {}) {
  const input = {
    basePoints: enemy.points, comboMult, killScoreMult, routeKillScoreMult, activeObjective, playerPos,
  };
  const points = computeKillPoints(input);
  // XP historically inherits score bonuses. Exclude only the weekly mutation's
  // own score boost, because Jackpot promises separate score and XP bonuses.
  const xpPoints = weeklyKillScoreMult > 1
    ? computeKillPoints({ ...input, killScoreMult: killScoreMult / weeklyKillScoreMult })
    : points;
  return {
    points,
    xpPoints,
    careerBoss: isCareerBossType(enemy.typeIndex),
    claim: "shared-enemy-defeat-economy-contract",
  };
}

export function planEnemyCoinDrop({
  enemy = {},
  rng = Math.random,
  coinMultActive = false,
  treeCoinBonus = 1,
} = {}) {
  const random = typeof rng === "function" ? rng : Math.random;
  let base = 0;
  if (enemy.isBossEnemy) base = 10 + Math.floor(random() * 16);
  else if (enemy.elite) base = 2 + Math.floor(random() * 3);
  else if (random() < 0.40) base = 1 + (random() < 0.25 ? 1 : 0);
  return {
    base,
    amount: Math.floor(base * (coinMultActive ? 2 : 1) * (Number(treeCoinBonus) || 1)),
    claim: "shared-enemy-defeat-economy-contract",
  };
}
