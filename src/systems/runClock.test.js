import { describe, expect, it } from 'vitest';
import { runElapsedSeconds } from './runClock.js';

describe('active run duration', () => {
  it('reports fractional simulation seconds and clamps invalid state', () => {
    expect(runElapsedSeconds({ activeRunFrames: 121 })).toBe(121 / 60);
    for (const frames of [NaN, Infinity, -60, undefined]) expect(runElapsedSeconds({ activeRunFrames: frames })).toBe(0);
    expect(runElapsedSeconds(null)).toBe(0);
  });
});
