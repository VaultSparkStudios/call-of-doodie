import { describe, it, expect } from 'vitest';
import { interpolateBossQuote, getBossTone } from './bossDialogue.js';

describe('interpolateBossQuote', () => {
  it('interpolates all original tokens', () => {
    const result = interpolateBossQuote('Wave {wave}, {weapon}, deaths={deaths}, streak={streak}, {act}', {
      wave: 12, weapon: 'Shotgun', deaths: 3, streak: 5, act: 'rising',
    });
    expect(result).toBe('Wave 12, Shotgun, deaths=3, streak=5, rising');
  });

  it('interpolates new tokens: sessionDeaths, bossKills, tone', () => {
    const result = interpolateBossQuote(
      '{tone} attempt #{bossKills}, session deaths: {sessionDeaths}',
      { tone: 'embarrassingly', bossKills: 3, sessionDeaths: 2 },
    );
    expect(result).toBe('embarrassingly attempt #3, session deaths: 2');
  });

  it('falls back sessionDeaths to 0 when missing', () => {
    expect(interpolateBossQuote('{sessionDeaths}', {})).toBe('0');
  });

  it('falls back bossKills to 0 when missing', () => {
    expect(interpolateBossQuote('{bossKills}', {})).toBe('0');
  });

  it('falls back tone to empty string when missing', () => {
    expect(interpolateBossQuote('You fought {tone}.', {})).toBe('You fought .');
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

describe('getBossTone', () => {
  it('returns embarrassingly for easy', () => {
    expect(getBossTone('easy')).toBe('embarrassingly');
  });

  it('returns impressively for hard', () => {
    expect(getBossTone('hard')).toBe('impressively');
  });

  it('returns terrifyingly for insane', () => {
    expect(getBossTone('insane')).toBe('terrifyingly');
  });

  it('returns adequately as default', () => {
    expect(getBossTone('normal')).toBe('adequately');
    expect(getBossTone(undefined)).toBe('adequately');
    expect(getBossTone(null)).toBe('adequately');
  });
});
