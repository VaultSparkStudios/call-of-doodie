// Capacity penalties reduce a magazine without disabling its weapon. All
// refill sources share this rounding rule, including stacked cursed perks.
export function getWeaponAmmoCapacity(weapon, upgradeLevel = 0, ammoMult = 1) {
  return Math.max(1, Math.floor(weapon.maxAmmo * (1 + upgradeLevel * 0.25) * ammoMult));
}
