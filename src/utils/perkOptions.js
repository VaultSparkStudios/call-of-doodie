import { PERKS, CURSED_PERKS, PERK_TIER_WEIGHTS } from "../constants.js";

export function getFullyCursedPerks(count = 3, rng = Math.random) {
  if (CURSED_PERKS.length === 0) return getRandomPerks(count, rng);
  const chosen = [];
  const used = new Set();
  let attempts = 0;
  while (chosen.length < count && attempts < 200) {
    attempts += 1;
    const perk = CURSED_PERKS[Math.floor(rng() * CURSED_PERKS.length)];
    if (!used.has(perk.id)) {
      used.add(perk.id);
      chosen.push(perk);
    }
  }
  while (chosen.length < count) {
    chosen.push(CURSED_PERKS[Math.floor(rng() * CURSED_PERKS.length)]);
  }
  return chosen;
}

export function getRandomPerks(count = 3, rng = Math.random) {
  const pool = [];
  PERKS.forEach((perk) => {
    const weight = PERK_TIER_WEIGHTS[perk.tier] || 1;
    for (let i = 0; i < weight; i += 1) pool.push(perk);
  });

  const chosen = [];
  const used = new Set();
  let attempts = 0;
  while (chosen.length < count && attempts < 200) {
    attempts += 1;
    const perk = pool[Math.floor(rng() * pool.length)];
    if (!used.has(perk.id)) {
      used.add(perk.id);
      chosen.push(perk);
    }
  }
  while (chosen.length < count) {
    chosen.push(PERKS[Math.floor(rng() * PERKS.length)]);
  }

  if (rng() < 0.35 && CURSED_PERKS.length > 0) {
    chosen[chosen.length - 1] = CURSED_PERKS[Math.floor(rng() * CURSED_PERKS.length)];
  }
  return chosen;
}
