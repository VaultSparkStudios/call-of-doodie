// Burst continuations belong to their run and advance only on active 60 Hz
// simulation steps. Snapshot each projectile at the trigger; emit from the
// player's current position, preserving the trigger's aim and build.
export function queueBurstShots(gs, bullets, delayMs = 90) {
  gs.pendingBurstShots ||= [];
  bullets.forEach((bullet, index) => {
    gs.pendingBurstShots.push({
      bullet,
      offsetX: bullet.x - gs.player.x,
      offsetY: bullet.y - gs.player.y,
      remainingFrames: Math.ceil((index + 1) * delayMs * 60 / 1000),
    });
  });
}

export function advanceBurstShots(gs) {
  const pending = gs.pendingBurstShots;
  if (!pending?.length) return;
  gs.pendingBurstShots = pending.filter(shot => {
    if (--shot.remainingFrames > 0) return true;
    gs.bullets.push({ ...shot.bullet, x: gs.player.x + shot.offsetX, y: gs.player.y + shot.offsetY });
    return false;
  });
}
