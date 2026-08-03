import { describe, expect, it } from 'vitest';
import { evaluateStartupAcceptance, GENERATED_PRIVATE_PATHS } from '../scripts/lib/startup-acceptance.mjs';
import { normalizeGeniusBlock, renderHumanPressureBlock } from '../scripts/lib/startup-brief-boxes.mjs';

function brief() {
  return [
    '╔════════════════════════════════════════════════════════════════╗',
    '║  CALL-OF-DOODIE · FORGE                                       ║',
    '╚════════════════════════════════════════════════════════════════╝',
    '╔══ SCORE ═══════════════════════════════════════════════════════╗',
    '╚════════════════════════════════════════════════════════════════╝',
    '╔══ WHERE WE LEFT OFF ═══════════════════════════════════════════╗',
    '╚════════════════════════════════════════════════════════════════╝',
    '╔══ SIGNALS ═════════════════════════════════════════════════════╗',
    '║  ✓  Cost          flat-rate Max Plan · usage ledger informational ║',
    '╚════════════════════════════════════════════════════════════════╝',
    '╔══ WHERE TO TEST ═══════════════════════════════════════════════╗',
    '║  Unit tests → npm test — 30/30 passing                        ║',
    '╚════════════════════════════════════════════════════════════════╝',
    renderHumanPressureBlock(null),
    normalizeGeniusBlock('1. Continue the highest-value agent-owned work.'),
  ].join('\n');
}

describe('startup acceptance contract', () => {
  it('accepts a source-derived brief and capability universe without exposing values', () => {
    const ignoredPaths = Object.fromEntries(GENERATED_PRIVATE_PATHS.map((relativePath) => [relativePath, true]));
    const receipt = evaluateStartupAcceptance({
      capabilities: [{ ok: true, mapSource: 'studio-ops' }, { ok: false, mapSource: 'studio-ops' }],
      briefText: brief(),
      status: { testsPassing: 30, testsTotal: 30, modelPlanMode: true },
      ignoredPaths,
      sourceText: 'bounded startup sources',
    });

    expect(receipt.ok).toBe(true);
    expect(receipt.capabilities).toEqual({ ready: 1, total: 2, sources: ['studio-ops'] });
    expect(receipt).not.toHaveProperty('values');
    expect(receipt.sourceHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('fails closed on zero capabilities or a public-boundary leak', () => {
    const receipt = evaluateStartupAcceptance({
      capabilities: [],
      briefText: brief(),
      status: { testsPassing: 30, testsTotal: 30, modelPlanMode: true },
      ignoredPaths: {},
    });

    expect(receipt.ok).toBe(false);
    expect(receipt.issues).toContain('Capability audit resolved zero capabilities.');
    expect(receipt.issues.some((issue) => issue.includes('Generated private artifact is not ignored'))).toBe(true);
  });
});
