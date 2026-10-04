// Bounded observations for QA. Missing values stay missing rather than passing as zero.
const finite = value => typeof value === 'number' && Number.isFinite(value) ? value : null;
export function normalizePlaythroughObservation(raw = {}) {
  return {
    mode: typeof raw.modeId === 'string' ? raw.modeId : null,
    difficulty: typeof raw.difficulty === 'string' ? raw.difficulty : null,
    seed: finite(raw.seed), modifier: typeof raw.modifier === 'string' ? raw.modifier : null,
    clock: finite(raw.frame), kills: finite(raw.kills), score: finite(raw.score), ammo: finite(raw.ammo),
    player: raw.player ? { x: finite(raw.player.x), y: finite(raw.player.y), health: finite(raw.player.health) } : null,
    enemies: Array.isArray(raw.enemies) ? raw.enemies.map(e => ({ x: finite(e.x), y: finite(e.y), health: finite(e.health) })) : null,
    terminal: raw.won === true ? 'victory' : raw.lost === true ? 'objective-failure' : finite(raw.player?.health) !== null && raw.player.health <= 0 ? 'death' : raw.screen ? 'menu-or-debrief' : null,
  };
}
export function classifyObservedAdvancement(before, after) {
  const a = normalizePlaythroughObservation(before), b = normalizePlaythroughObservation(after);
  if (a.clock !== null && b.clock !== null) return { status: b.clock > a.clock ? 'advanced' : b.clock === a.clock ? 'unchanged' : 'reset', basis: 'simulation-clock' };
  if (!a.player || !b.player || !a.enemies || !b.enemies) return { status: 'unavailable', basis: 'missing-world-observation' };
  const observed = value => JSON.stringify({ player: value.player, enemies: value.enemies, score: value.score, kills: value.kills, ammo: value.ammo });
  return { status: observed(a) === observed(b) ? 'unchanged' : 'advanced', basis: 'observed-world-change-not-frame-count' };
}
