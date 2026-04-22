/**
 * pickupSpawning.js — Pickup drop logic extracted from App.jsx
 *
 * Pure function: pushes a pickup object onto gs.pickups based on weighted
 * random selection. Weights vary by boss vs normal kill and active perk mods.
 */

const PICKUP_TYPES = ["health", "ammo", "speed", "nuke", "upgrade", "rage", "magnet", "freeze", "time_dilation"];

/**
 * @param {object} gs          - Mutable game state (pickups array will be pushed to)
 * @param {number} ex          - Spawn X coordinate
 * @param {number} ey          - Spawn Y coordinate
 * @param {boolean} isBoss     - Whether the kill was a boss
 * @param {object} opts
 * @param {number} [opts.ammoDropMult=1] - Scavenger perk ammo-drop multiplier
 */
export function spawnPickup(gs, ex, ey, isBoss, { ammoDropMult = 1 } = {}) {
  const vampireMode = gs.vampireMode;
  const armoryRun = gs.routeArmoryRun;

  const baseAmmoW = isBoss
    ? (vampireMode ? 0.40 : 0.15)
    : (vampireMode ? 0.58 : 0.10);
  const ammoW = Math.min(baseAmmoW * ammoDropMult, 0.70);
  const upgradeW = armoryRun ? 0.36 : 0.12;

  // Weights: [health, ammo, speed, nuke, upgrade, rage, magnet, freeze, time_dilation]
  const weights = isBoss
    ? [vampireMode ? 0 : 0.19, ammoW, 0.07, 0.07, 0.34, 0.09, 0.06, 0.06, 0.05]
    : [vampireMode ? 0 : 0.38, ammoW, 0.17, 0.04, upgradeW, 0.09, 0.07, 0.07, 0.03];

  let roll = Math.random();
  let cumul = 0;
  let pType = "health";
  for (let i = 0; i < PICKUP_TYPES.length; i++) {
    cumul += weights[i];
    if (roll < cumul) { pType = PICKUP_TYPES[i]; break; }
  }

  gs.pickups.push({ x: ex, y: ey, type: pType, life: 450 });
}

/**
 * Returns the raw weight table for a given context — useful for inspection
 * and testing without random rolls.
 */
export function getPickupWeights(isBoss, { ammoDropMult = 1, vampireMode = false, armoryRun = false } = {}) {
  const baseAmmoW = isBoss
    ? (vampireMode ? 0.40 : 0.15)
    : (vampireMode ? 0.58 : 0.10);
  const ammoW = Math.min(baseAmmoW * ammoDropMult, 0.70);
  const upgradeW = armoryRun ? 0.36 : 0.12;

  return isBoss
    ? { health: vampireMode ? 0 : 0.19, ammo: ammoW, speed: 0.07, nuke: 0.07, upgrade: 0.34, rage: 0.09, magnet: 0.06, freeze: 0.06, time_dilation: 0.05 }
    : { health: vampireMode ? 0 : 0.38, ammo: ammoW, speed: 0.17, nuke: 0.04, upgrade: upgradeW, rage: 0.09, magnet: 0.07, freeze: 0.07, time_dilation: 0.03 };
}
