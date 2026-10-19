// One active 60 Hz clock for player-facing duration and run receipts.
// Wall timestamps remain separate for ordering and external event metadata.
export function runElapsedSeconds(gs) {
  const frames = gs?.activeRunFrames;
  return Number.isFinite(frames) ? Math.max(0, frames) / 60 : 0;
}
