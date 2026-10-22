import { describe, expect, it } from "vitest";
import { applyAmmoPickup } from "./ammoPickup.js";

const weapons = [{ maxAmmo: 100 }, { maxAmmo: 40 }, { maxAmmo: 10 }];

describe("applyAmmoPickup", () => {
  it("fully refills only the held weapon without a restore perk", () => {
    const weaponAmmos = [0, 0, 0];
    expect(applyAmmoPickup({ weapons, weaponAmmos, wpnIdx: 0 })).toEqual({ resupplied: false });
    expect(weaponAmmos).toEqual([100, 0, 0]);
  });

  it("never gives the held weapon less than a plain pickup when Scavenger is active", () => {
    const plain = [0, 0, 0];
    const scavenger = [0, 0, 0];
    applyAmmoPickup({ weapons, weaponAmmos: plain, wpnIdx: 0 });
    applyAmmoPickup({ weapons, weaponAmmos: scavenger, wpnIdx: 0, ammoRestoreMult: 1.3 });
    expect(scavenger[0]).toBe(plain[0]);
    expect(scavenger[0]).toBe(100);
  });

  it("adds a partial top-up to the other weapons, capped at capacity", () => {
    const weaponAmmos = [0, 0, 9];
    expect(applyAmmoPickup({ weapons, weaponAmmos, wpnIdx: 0, ammoRestoreMult: 1.3 })).toEqual({ resupplied: true });
    expect(weaponAmmos[1]).toBe(Math.floor(40 * 0.3 * 1.3)); // 15
    expect(weaponAmmos[2]).toBe(10); // 9 + max(1, floor(10*0.39)=3) capped at 10
  });

  it("honours upgrade levels and the ammo multiplier for capacity", () => {
    const weaponAmmos = [0, 0, 0];
    applyAmmoPickup({ weapons, weaponAmmos, weaponUpgrades: [2, 0, 0], wpnIdx: 0, ammoMult: 2, ammoRestoreMult: 1.4 });
    expect(weaponAmmos[0]).toBe(Math.floor(100 * 1.5 * 2)); // 300
    expect(weaponAmmos[1]).toBe(Math.floor(Math.floor(40 * 2) * 0.3 * 1.4)); // 33
  });
});
