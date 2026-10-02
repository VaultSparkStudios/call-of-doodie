import { describe, expect, it } from 'vitest';
import { buildLocalCoachLesson } from './localCoachLesson.js';

const run = (overrides = {}) => ({ mode: 'standard', difficulty: 'normal', wave: 7, score: 1000, runSeed: 42, ts: 4,
  deathAttribution: { sourceName: 'Karen', evidenceLevel: 'observed' }, totalShots: 100, totalHits: 50, ...overrides });

describe('local evidence coach', () => {
  it('is deterministic and uses only same-mode, same-difficulty prior runs', () => {
    const latest = run();
    const history = [latest, run({ ts: 3 }), run({ ts: 2, wave: 8 }), run({ ts: 1, mode: 'boss_rush', difficulty: 'hard' })];
    const first = buildLocalCoachLesson({ latestRun: latest, runHistory: history });
    expect(first).toMatchObject({ status: 'ready', reason: 'repeated-observed-final-source', evidenceLevel: 'pattern' });
    expect(first.likelyFactor).toContain('2 of 2 comparable');
    expect(first).toEqual(buildLocalCoachLesson({ latestRun: latest, runHistory: history }));
  });
  it('abstains on missing comparable evidence and never treats nearest threat as observed', () => {
    const latest = run({ deathAttribution: { sourceName: 'Karen', evidenceLevel: 'hypothesis' } });
    const result = buildLocalCoachLesson({ latestRun: latest, runHistory: [latest, run({ ts: 2 })] });
    expect(result.status).toBe('abstain');
    expect(result.missingEvidence.join(' ')).toMatch(/observed final damage source/i);
    expect(result.likelyFactor).toBeNull();
  });
  it('does not turn absent counters into a zero-wave or zero-hit observation', () => {
    expect(buildLocalCoachLesson({ latestRun: run({ wave: null }) }).status).toBe('abstain');
    const latest = run({ deathAttribution: null, totalShots: null, totalHits: null });
    const lesson = buildLocalCoachLesson({ latestRun: latest, runHistory: [latest, run({ ts: 3 }), run({ ts: 2 })] });
    expect(lesson.reason).not.toBe('measured-accuracy-drop');
  });
  it('abstains when observed final sources contradict a weak repeated signal', () => {
    const latest = run();
    const history = [latest, run({ ts: 3 }), run({ ts: 2 }), ...['Boss', 'Spike', 'Sniper'].map((name, index) => run({ ts: index, deathAttribution: { sourceName: name, evidenceLevel: 'observed' } }))];
    expect(buildLocalCoachLesson({ latestRun: latest, runHistory: history })).toMatchObject({ status: 'abstain', reason: 'contradictory-killer-evidence' });
  });
  it('offers a measurable aim drill only when hit-rate evidence is comparable', () => {
    const latest = run({ deathAttribution: null, totalShots: 100, totalHits: 18 });
    const result = buildLocalCoachLesson({ latestRun: latest, runHistory: [latest, run({ ts: 3 }), run({ ts: 2, totalHits: 55 })] });
    expect(result).toMatchObject({ status: 'ready', reason: 'measured-accuracy-drop', drill: { id: 'aim_route_practice' } });
    expect(result.likelyFactor).toContain('does not identify the death cause');
  });
  it('recognizes a wave plateau without inventing a killer', () => {
    const latest = run({ deathAttribution: null, totalShots: 0 });
    const result = buildLocalCoachLesson({ latestRun: latest, runHistory: [latest, run({ ts: 3, deathAttribution: null, wave: 6, totalShots: 0 }), run({ ts: 2, deathAttribution: null, wave: 8, totalShots: 0 })] });
    expect(result).toMatchObject({ status: 'ready', reason: 'repeat-wave-plateau' });
    expect(result.missingEvidence.join(' ')).toContain('repeated observed final source');
  });
});
