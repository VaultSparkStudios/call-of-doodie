import { describe, expect, it } from 'vitest';
import { reconcileReleaseManifest } from '../scripts/lib/release-manifest.mjs';

const manifest = {
  identity: { slug: 'call-of-doodie' },
  surfaces: { staging: [] },
  hosting: { liveUrl: 'https://callofdoodie.wtf/', stagingUrl: null },
  publicMetadata: { publicRepoSanitized: false },
  capabilities: { auth: true },
};

describe('release manifest projection', () => {
  it('derives staging, sanitization, and guest-first Obelisk posture from source status', () => {
    const { manifest: next, receipt } = reconcileReleaseManifest(manifest, {
      runtimeUrl: 'https://callofdoodie.wtf/',
      stagingType: 'cloudflare-pages',
      stagingUrl: 'https://session-137-staging.call-of-doodie.pages.dev/',
      sanitizationLastCleared: '2026-08-02T20:00:00Z',
    });

    expect(receipt.ok).toBe(true);
    expect(next.surfaces.staging).toEqual([{
      label: 'cloudflare-pages',
      url: 'https://session-137-staging.call-of-doodie.pages.dev/',
    }]);
    expect(next.hosting.stagingUrl).toBe('https://session-137-staging.call-of-doodie.pages.dev/');
    expect(next.publicMetadata).toMatchObject({
      publicRepoSanitized: true,
      sanitizationEvidence: '2026-08-02T20:00:00Z',
    });
    expect(next).toMatchObject({
      obeliskArchitecture: 'external',
      capabilities: { auth: false },
      identityPosture: { play: 'guest-first', accountStatus: 'route-present-verification-deferred' },
    });
    expect(receipt.sourceFingerprint).toMatch(/^[a-f0-9]{64}$/);
  });

  it('fails on a missing or production-equal staging origin', () => {
    const { receipt } = reconcileReleaseManifest(manifest, {
      runtimeUrl: 'https://callofdoodie.wtf/',
      stagingType: 'cloudflare-pages',
      stagingUrl: 'https://callofdoodie.wtf/',
    });

    expect(receipt.ok).toBe(false);
    expect(receipt.issues).toContain('Staging must be isolated from production.');
    expect(receipt.issues).toContain('Public-repository sanitization evidence is missing.');
  });
});
