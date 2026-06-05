/**
 * Small visual helpers for repo-local brief rendering.
 */

const STEPS = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];

export function sparkline(values = [], { min = null, max = null } = {}) {
  const nums = values.map(Number).filter(Number.isFinite);
  if (!nums.length) return '';
  const lo = min ?? Math.min(...nums);
  const hi = max ?? Math.max(...nums);
  const span = Math.max(1, hi - lo);
  return nums.map((value) => {
    const idx = Math.max(0, Math.min(STEPS.length - 1, Math.round(((value - lo) / span) * (STEPS.length - 1))));
    return STEPS[idx];
  }).join('');
}

export default { sparkline };
