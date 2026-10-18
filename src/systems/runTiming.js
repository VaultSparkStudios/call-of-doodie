// Combat time belongs to the current run and advances only on active simulation
// frames. No callbacks can recharge or modify a replacement run.
export function beginAbilityCooldown(gs, ability, durationMs) {
  (gs.abilityCooldowns ||= {})[ability] = Math.max(1, Math.ceil(durationMs * 60 / 1000));
}

export function grantAbilityReady(gs, ability) {
  if (gs?.abilityCooldowns) delete gs.abilityCooldowns[ability];
}

export function advanceAbilityCooldowns(gs) {
  const ready = [];
  for (const ability of Object.keys(gs.abilityCooldowns || {})) {
    if (--gs.abilityCooldowns[ability] <= 0) {
      delete gs.abilityCooldowns[ability];
      ready.push(ability);
    }
  }
  return ready;
}

export function addSpeedPickup(gs) {
  (gs.speedPickupFrames ||= []).push(300);
}

export function speedPickupBonus(gs) {
  const base = Math.max(0, Number(gs.player?.speed) || 0);
  return Math.max(0, Math.min(8 - base, (gs.speedPickupFrames?.length || 0) * 0.5));
}

export function advanceSpeedPickups(gs) {
  const timers = gs.speedPickupFrames;
  if (!timers?.length) return;
  let retained = 0;
  for (const frames of timers) if (frames > 1) timers[retained++] = frames - 1;
  timers.length = retained;
}
