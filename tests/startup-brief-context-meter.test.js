import { describe, expect, it } from 'vitest';
import {
  formatContextPercent,
  normalizeContextMeterView,
} from '../scripts/lib/context-meter-view.mjs';

describe('startup brief context-meter view', () => {
  it('renders a live 0.6 percent reading as 0.6%, never 60%', () => {
    const view = normalizeContextMeterView({
      live: true,
      usedTokens: 5973,
      limit: 1_000_000,
      pctUsed: 0.6,
    });

    expect(view.pctUsed).toBeCloseTo(0.5973, 4);
    expect(view.fraction).toBeCloseTo(0.005973, 6);
    expect(view.displayPercent).toBe('0.6');
    expect(view.coherent).toBe(true);
  });

  it('normalizes the renderer heuristic fraction explicitly', () => {
    const view = normalizeContextMeterView({
      live: false,
      usedTokens: 120_000,
      limit: 200_000,
      pctUsed: 0.6,
    });

    expect(view.pctUsed).toBe(60);
    expect(view.displayPercent).toBe('60');
    expect(view.coherent).toBe(true);
  });

  it('uses the token ratio when a declared percentage lies', () => {
    const view = normalizeContextMeterView({
      live: true,
      usedTokens: 6_000,
      limit: 1_000_000,
      pctUsed: 60,
    });

    expect(view.displayPercent).toBe('0.6');
    expect(view.coherent).toBe(false);
    expect(view.declaredDelta).toBeGreaterThan(59);
  });

  it('clamps invalid and out-of-range values', () => {
    expect(normalizeContextMeterView({ usedTokens: -1, limit: 0 }).pctUsed).toBe(0);
    expect(formatContextPercent(120)).toBe('100');
  });
});
