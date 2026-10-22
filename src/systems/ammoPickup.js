// ── Ammo pickup rule (S204) ──────────────────────────────────────────────────
// A plain pickup fully refills the weapon in hand. Scavenger / Bullet Hose
// (ammoRestoreMult > 1) keep that and add a partial top-up to every OTHER weapon,
// so the perk can only ever add ammo. Before S204 the multiplier branch replaced
// the full refill with a 30%-of-capacity top-up, which made the perk a downgrade
// for the weapon the player was actually using while its copy said "more ammo".
import { getWeaponAmmoCapacity } from "./weaponAmmo.js";

const SCAVENGER_BASE_FRACTION = 0.30;

export function applyAmmoPickup({ weapons, weaponAmmos, weaponUpgrades = [], wpnIdx, ammoMult = 1, ammoRestoreMult = 1 }) {
  const capacityOf = (index) => getWeaponAmmoCapacity(weapons[index], weaponUpgrades[index] || 0, ammoMult);
  weaponAmmos[wpnIdx] = capacityOf(wpnIdx);
  const resupplied = ammoRestoreMult > 1;
  if (resupplied) {
    weapons.forEach((_, index) => {
      if (index === wpnIdx) return;
      const max = capacityOf(index);
      const bonus = Math.max(1, Math.floor(max * SCAVENGER_BASE_FRACTION * ammoRestoreMult));
      weaponAmmos[index] = Math.min(max, (weaponAmmos[index] || 0) + bonus);
    });
  }
  return { resupplied };
}
