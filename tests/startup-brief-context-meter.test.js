import { describe, expect, it } from 'vitest';
import {
  formatContextPercent,
  normalizeContextMeterView,
  parseContextMeterResult,
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

  it('does not turn a renderer byte heuristic into context usage', () => {
    const view = normalizeContextMeterView({
      live: false,
      usedTokens: 120_000,
      limit: 200_000,
      pctUsed: 0.6,
    });

    expect(view.pctUsed).toBeNull();
    expect(view.displayPercent).toBe('unknown');
    expect(view.remainingTokens).toBeNull();
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

  it('keeps overruns visible while bounding only the bar', () => {
    expect(normalizeContextMeterView({ usedTokens: -1, limit: 0 }).pctUsed).toBeNull();
    expect(formatContextPercent(120)).toBe('120');
    const view = normalizeContextMeterView({ live: true, usedTokens: 334908, limit: 272000 });
    expect(view.displayPercent).toBe('123');
    expect(view.usedTokens).toBe(334908);
    expect(view.fraction).toBe(1);
  });

  it.each([null, undefined, NaN])('keeps unavailable usage %s unknown', usedTokens => {
    const view = normalizeContextMeterView({ usedTokens, pctUsed: null, limit: 272000 });
    expect(view.pctUsed).toBeNull();
    expect(view.usedTokens).toBeNull();
    expect(view.displayPercent).toBe('unknown');
    expect(view.fraction).toBeNull();
  });

  it.each([0, 0.5, 1, 100, 125])('respects native percentage units at %s', pctUsed => {
    expect(normalizeContextMeterView({ live: true, pctUsed, limit: 1000 }).pctUsed).toBe(pctUsed);
  });

  it('rejects an explicitly unmeasured payload even when it carries an estimate', () => {
    expect(normalizeContextMeterView({ live: true, measured_ok: false, usedTokens: 300, limit: 1000, pctUsed: 30 }).pctUsed).toBeNull();
  });

  it.each([[2, 'CONSIDER_CLOSEOUT', 80], [3, 'CLOSEOUT', 123]])('preserves measured routing exit %s', (status, recommendation, percent) => {
    const result = parseContextMeterResult({ status, stdout: JSON.stringify({ measured_ok: true, usedTokens: percent * 1000, limit: 100000, pctUsed: percent, recommendation }) });
    expect(result.recommendation).toBe(recommendation);
    expect(normalizeContextMeterView(result).pctUsed).toBe(percent);
  });

  it.each([{status:1,stdout:'{}'}, {status:null,stdout:'{}'}, {status:0,stdout:'bad'}, {status:0,stdout:'null'}])('does not accept command failures or malformed readings', result => {
    expect(parseContextMeterResult(result)).toBeNull();
  });
});
