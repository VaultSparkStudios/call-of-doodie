export function getLevelXpNeeded(level = 1) {
  const safeLevel = Math.max(1, level);
  if (safeLevel <= 6) return safeLevel * 500;
  if (safeLevel <= 12) return safeLevel * 575;
  return safeLevel * 650;
}

export function shouldAwardPerkChoice(level = 1) {
  const safeLevel = Math.max(1, level);
  // Four meaningful doctrines per run, earned slowly and offered at a checkpoint.
  return safeLevel >= 5 && safeLevel <= 20 && safeLevel % 5 === 0;
}

export function getNextPerkLevel(level = 1) {
  const safeLevel = Math.max(1, level);
  for (let probe = safeLevel + 1; probe <= safeLevel + 12; probe++) {
    if (shouldAwardPerkChoice(probe)) return probe;
  }
  return null;
}

/**
 * Perk banking: if a perk should have fired but was blocked by a boss or
 * mutation wave, it queues. Call this to check whether a banked perk is owed.
 *
 * @param {number} level
 * @param {number} lastPerkLevel - last level at which a perk was actually awarded
 * @returns {{ banked: boolean, levelsOverdue: number }}
 */
export function getPerkBankingState(level = 1, lastPerkLevel = 0) {
  const safeLevel = Math.max(1, level);
  // Count how many perk awards should have fired between lastPerkLevel+1 and now
  let owed = 0;
  for (let l = (lastPerkLevel || 0) + 1; l <= safeLevel; l++) {
    if (shouldAwardPerkChoice(l)) owed++;
  }
  return { banked: owed > 0, levelsOverdue: owed };
}

/**
 * XP bonus for surviving a wave without dying on that wave.
 * Scales with wave number and current level to stay meaningful mid-run.
 */
export function getWaveSurvivalBonus(wave = 1, level = 1) {
  const base = 40 + wave * 8;
  const levelScale = 1 + Math.min(level, 20) * 0.015;
  return Math.round(base * levelScale);
}
