import { describe, expect, it } from 'vitest';
import { buildAgentRunPack, RUN_ANALYSIS_SCHEMA } from './agentRunPack.js';

describe('player-owned agent run pack', () => {
  it('exports bounded meaning and a verifiable hash without identifiers or hidden fields', async () => {
    const run = { mode: 'standard', difficulty: 'hard', wave: 8, score: 5000, kills: 12, time: 93, runSeed: 42, totalShots: 100, totalHits: 45,
      ts: Date.parse('2026-09-30T12:00:00Z'), deathAttribution: { typeIndex: 4, sourceName: 'user@example.com', evidenceLevel: 'observed', basis: 'damage-sequence' },
      username: 'real-name', passport: 'omit-pass', token: 'omit-key', payload: { password: 'omit-pw' } };
    const pack = await buildAgentRunPack({ run, coachLesson: { status: 'ready', reason: 'repeated-observed-final-source', suggestion: 'private note' }, generatedAt: '2026-10-02T00:00:00Z' });
    expect(pack).toMatchObject({ schemaVersion: 'run-analysis-v1', events: [{ kind: 'final-source', typeIndex: 4, evidenceLevel: 'observed' }], coach: { reason: 'repeated-observed-final-source' } });
    expect(JSON.stringify(pack)).not.toMatch(/real-name|user@example.com|omit-|private note|password|passport/i);
    const { contentHash, ...payload } = pack;
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(payload)));
    expect(contentHash).toBe(`sha256:${Buffer.from(digest).toString('hex')}`);
    expect(RUN_ANALYSIS_SCHEMA.units.durationSeconds).toBe('seconds');
  });
  it('does not promote nearest-threat guesses to observed source or export invalid values', async () => {
    const pack = await buildAgentRunPack({ run: { wave: 1, score: Infinity, mode: 'fake', difficulty: 'fake', deathAttribution: { typeIndex: 4, evidenceLevel: 'hypothesis' } } });
    expect(pack.run).toMatchObject({ mode: 'unknown', difficulty: 'unknown', score: null });
    expect(pack.events[0]).toMatchObject({ typeIndex: null, evidenceLevel: 'unknown' });
  });
});
