import { describe, expect, it } from 'vitest';
import { canReuseEvidence, evidenceCacheKey } from './agent-evidence-cache.mjs';
const descriptor = { sourceSha: 'a'.repeat(40), sourceDigest: `sha256:${'b'.repeat(64)}`, deployRevision: 'deploy-one', route: '/field-manual/', contentHash: `sha256:${'c'.repeat(64)}`, inputMethod: 'keyboard', viewport: { width: 390, height: 844 }, theme: 'porcelain-day', setup: { seed: 42, mode: 'zombies', difficulty: 'normal', modifier: 'speed_freak' }, state: 'ready' };
describe('provenance-bound evidence cache', () => {
  it('reuses complete passing stable evidence only for the exact reviewed context', () => {
    const cached = { key: evidenceCacheKey(descriptor), pass: true, complete: true, volatility: 'stable' };
    expect(canReuseEvidence(cached, descriptor)).toBe(true);
    for (const change of [{ theme: 'sewer-night' }, { deployRevision: 'deploy-two' }, { setup: { ...descriptor.setup, difficulty: 'hard' } }, { sourceDigest: `sha256:${'d'.repeat(64)}` }, { viewport: { width: 1440, height: 900 } }, { state: 'failure' }, { inputMethod: 'touch' }, { volatility: 'live' }]) expect(canReuseEvidence(cached, { ...descriptor, ...change })).toBe(false);
    expect(canReuseEvidence({ ...cached, pass: false }, descriptor)).toBe(false);
    expect(canReuseEvidence({ ...cached, complete: false }, descriptor)).toBe(false);
    expect(canReuseEvidence({ ...cached, volatility: 'live' }, descriptor)).toBe(false);
  });
  it('rejects missing provenance and canonicalizes setup key order', () => {
    expect(evidenceCacheKey({ ...descriptor, sourceSha: null })).toBeNull();
    expect(evidenceCacheKey({ ...descriptor, setup: Object.fromEntries(Object.entries(descriptor.setup).reverse()) })).toBe(evidenceCacheKey(descriptor));
  });
});
