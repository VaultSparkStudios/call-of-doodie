import { describe, expect, it } from 'vitest';
import { normalizeGeniusBlock, renderHumanPressureBlock } from '../scripts/lib/startup-brief-boxes.mjs';
import { validateStartupBrief } from '../scripts/validate-brief-format.mjs';

function minimalBrief(extraBlocks) {
  return [
    '╔════════════════════════════════════════════════════════════════╗',
    '║  CALL-OF-DOODIE · FORGE                                       ║',
    '╚════════════════════════════════════════════════════════════════╝',
    '╔══ SCORE ═══════════════════════════════════════════════════════╗',
    '╚════════════════════════════════════════════════════════════════╝',
    '╔══ WHERE WE LEFT OFF ═══════════════════════════════════════════╗',
    '╚════════════════════════════════════════════════════════════════╝',
    '╔══ SIGNALS ═════════════════════════════════════════════════════╗',
    '╚════════════════════════════════════════════════════════════════╝',
    renderHumanPressureBlock(null),
    extraBlocks,
  ].join('\n');
}

describe('startup brief box helpers', () => {
  it('wraps plain genius-list output in the canonical box', () => {
    const block = normalizeGeniusBlock('1. [SIL:1] Repair the launch path\n2. [SIL:2] Verify replay trust');

    expect(block).toContain('GENIUS HIT LIST');
    expect(block).toContain('Repair the launch path');
    expect(validateStartupBrief(minimalBrief(block)).ok).toBe(true);
  });

  it('preserves already boxed genius-list output', () => {
    const boxed = [
      '╔══ GENIUS HIT LIST ═════════════════════════════════════════════╗',
      '║  Existing boxed item                                           ║',
      '╚════════════════════════════════════════════════════════════════╝',
    ].join('\n');

    expect(normalizeGeniusBlock(boxed)).toBe(boxed);
  });

  it('renders a boxed fallback when genius-list output is empty', () => {
    const block = normalizeGeniusBlock('');

    expect(block).toContain('GENIUS HIT LIST');
    expect(block).toContain('generate fresh recom');
    expect(validateStartupBrief(minimalBrief(block)).ok).toBe(true);
  });

  it('renders an honest human-pressure empty state', () => {
    const block = renderHumanPressureBlock(null);

    expect(block).toContain('HUMAN PRESSURE');
    expect(block).toContain('No founder-action pressure queued');
  });

  it('renders a human-pressure item when compiled pressure exists', () => {
    const block = renderHumanPressureBlock({
      title: 'Physical launch QA',
      pressureScore: 91,
      pressureBand: 'high',
      nextAgentAction: 'Surface the physical-device checklist.',
    });

    expect(block).toContain('Physical launch QA');
    expect(block).toContain('91 · high');
    expect(block).toContain('physical-device checklist');
  });
});
