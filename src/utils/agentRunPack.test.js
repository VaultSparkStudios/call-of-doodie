import { describe, expect, it } from 'vitest';
import { buildAgentRunPack, RUN_ANALYSIS_SCHEMA } from './agentRunPack.js';

describe('player-owned agent run pack', () => {
  it('keeps historical provenance unknown and bounds recorded setup and objective metadata', async () => {
    const old = await buildAgentRunPack({ run: { wave: 1 } });
    expect(old.run.build).toEqual({ sourceSha: null, workingTreeDirty: null });
    expect(old.run.setup).toEqual({ starterLoadout: null, weeklyMutation: null, zombiePacing: null });
    const pack = await buildAgentRunPack({ run: { wave: 1, modifier: 'speed_freak', buildProvenance: { sourceSha: 'a'.repeat(40), workingTreeDirty: true, token: 'private' }, modeOutcome: { modeId: 'zombies', victory: true, stat: 3, headline: 'private' } } });
    expect(pack.run).toMatchObject({ modifier: 'speed_freak', build: { sourceSha: 'a'.repeat(40), workingTreeDirty: true }, objective: { mode: 'zombies', victory: true, primaryMetric: 3 } });
    expect(JSON.stringify(pack)).not.toContain('private');
  });
  it('exports only recognized recorded starting kits and pacing, without arbitrary setup fields', async () => {
    const pack = await buildAgentRunPack({ run: { wave: 1, setup: { starterLoadout: 'tank', zombiePacing: 'pumps', weeklyMutation: 'private', token: 'private' } } });
    expect(pack.run.setup).toEqual({ starterLoadout: 'tank', zombiePacing: 'pumps', weeklyMutation: null });
    expect(JSON.stringify(pack)).not.toContain('private');
  });
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
