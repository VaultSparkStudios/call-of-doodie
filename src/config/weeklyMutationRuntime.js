export const WEEKLY_MAGNET_MULTIPLIER = 3;
export const BASE_PICKUP_RANGE = 30;

export function getRunXpGain(amount, mods = {}, gs = {}) {
  return Math.floor(amount * (mods.xpMult || 1) * (gs?.mutXpMult || 1));
}

export function getPlayerProjectileSpeed(weapon, gs = {}) {
  return (weapon.bulletSpeed || 12) * (gs.mutBulletSpeed || 1);
}

export function getPickupCollectionRange(mods = {}, gs = {}) {
  return Math.max(mods.pickupRange || BASE_PICKUP_RANGE, BASE_PICKUP_RANGE * (gs.settPickupMagnet || 1));
}

// Keep boss guarantees and one loot RNG draw for each ordinary enemy.
export function shouldDropStandardPickup(gs, isBoss, rng) {
  return Boolean(isBoss) || rng() < Math.min(1, 0.25 * (gs.mutPickupRate || 1));
}
