/**
 * medium-quality-gates.mjs
 *
 * Minimal local quality-gate helpers for public Studio OS repos. Richer gates
 * live in Studio Ops; this file keeps /implement import paths available here.
 */

export function runMediumGate(medium = 'unknown', item = {}) {
  const title = item.title || item.slug || 'item';
  if (medium === 'game') {
    return {
      ok: true,
      medium,
      item: title,
      checks: [
        'No paid variable-cost free-tier feature introduced.',
        'Gameplay/input/replay changes require focused validation before closeout.',
      ],
    };
  }
  return { ok: true, medium, item: title, checks: [] };
}

export default { runMediumGate };
