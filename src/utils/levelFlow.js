export function getLevelXpNeeded(level = 1) {
  const safeLevel = Math.max(1, level);
  if (safeLevel <= 6) return safeLevel * 500;
  if (safeLevel <= 12) return safeLevel * 575;
  return safeLevel * 650;
}

export function shouldAwardPerkChoice(level = 1) {
  const safeLevel = Math.max(1, level);
  if (safeLevel < 3) return false;
  if (safeLevel <= 9) return safeLevel % 3 === 0;
  return safeLevel % 4 === 0;
}

export function getNextPerkLevel(level = 1) {
  const safeLevel = Math.max(1, level);
  for (let probe = safeLevel + 1; probe <= safeLevel + 12; probe++) {
    if (shouldAwardPerkChoice(probe)) return probe;
  }
  return safeLevel + 4;
}
