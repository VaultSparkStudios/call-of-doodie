import { describe, expect, it } from 'vitest';
import { buildRunVoice, readRecentRunVoices, rememberRunVoice } from './runVoice.js';

describe('authored local run voice', () => {
  it('is deterministic and only claims facts supported by the event ledger', () => {
    const facts = { wave: 12, bossKillCount: 2, precisionPeakStreak: 7, nearDeathEvents: [{ wave: 8, hpLeft: 2 }], kills: 40 };
    const first = buildRunVoice(facts);
    expect(first).toMatchObject({ id: 'boss-receipt', evidence: 'bossKillCount', inferenceCalls: 0 });
    expect(first.line).toContain('2 bosses');
    expect(buildRunVoice(facts)).toBe(first);
    expect(buildRunVoice({ wave: 2, bossKillCount: 0, kills: 0 }).line).not.toMatch(/boss|takedown|precision|HP left/);
  });
  it('rotates among evidenced lines and ignores arbitrary player text', () => {
    const facts = { wave: 12, bossKillCount: 2, precisionPeakStreak: 7, nearDeathEvents: [{ wave: 8, hpLeft: 2 }], playerNote: '<script>secret</script>' };
    const rotated = buildRunVoice(facts, ['boss-receipt']);
    expect(rotated.id).toBe('near-miss');
    expect(rotated.line).toContain('Wave 8: 2 HP');
    expect(JSON.stringify(rotated)).not.toContain('secret');
  });
  it('keeps a four-line session repetition window without requiring storage', () => {
    const storage = { value: null, getItem() { return this.value; }, setItem(_key, value) { this.value = value; } };
    for (const id of ['a', 'b', 'c', 'd', 'e']) rememberRunVoice(id, storage);
    expect(readRecentRunVoices(storage)).toEqual(['b', 'c', 'd', 'e']);
    expect(readRecentRunVoices({ getItem() { throw new Error('blocked'); } })).toEqual([]);
  });
});
