export function beginWeaponReload(gs, weaponIndex, durationMs) {
  if (!gs || !Number.isInteger(weaponIndex) || weaponIndex < 0 || !Number.isFinite(durationMs) || durationMs <= 0) return false;
  gs.pendingReload = { weaponIndex, remainingFrames: Math.ceil(durationMs * 60 / 1000) };
  return true;
}

export function advanceWeaponReload(gs, blocked = false) {
  if (!gs?.pendingReload || blocked) return null;
  if (--gs.pendingReload.remainingFrames > 0) return null;
  const index = gs.pendingReload.weaponIndex;
  gs.pendingReload = null;
  return index;
}
