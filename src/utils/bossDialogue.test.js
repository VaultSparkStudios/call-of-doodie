import { describe, it, expect } from 'vitest';
import { interpolateBossQuote } from './bossDialogue.js';

describe('interpolateBossQuote', () => {
  it('interpolates all tokens', () => {
    const result = interpolateBossQuote('Wave {wave}, {weapon}, deaths={deaths}, streak={streak}, {act}', {
      wave: 12, weapon: 'Shotgun', deaths: 3, streak: 5, act: 'rising',
    });
    expect(result).toBe('Wave 12, Shotgun, deaths=3, streak=5, rising');
  });

  it('replaces multiple occurrences of the same token', () => {
    expect(interpolateBossQuote('{wave} is wave {wave}', { wave: 7 })).toBe('7 is wave 7');
  });

  it('fills missing ctx keys with fallbacks', () => {
    const result = interpolateBossQuote('Wave {wave} with {weapon}', {});
    expect(result).toBe('Wave ? with that');
  });

  it('returns non-template strings unchanged', () => {
    expect(interpolateBossQuote('I have a Yelp account.', { wave: 5 })).toBe('I have a Yelp account.');
  });

  it('returns null as-is', () => {
    expect(interpolateBossQuote(null, { wave: 5 })).toBe(null);
  });

  it('returns undefined as-is', () => {
    expect(interpolateBossQuote(undefined, {})).toBe(undefined);
  });

  it('handles missing ctx argument', () => {
    const result = interpolateBossQuote('Wave {wave}');
    expect(result).toBe('Wave ?');
  });

  it('does not interpolate unknown tokens', () => {
    expect(interpolateBossQuote('Hello {unknown}', { wave: 1 })).toBe('Hello {unknown}');
  });
});
