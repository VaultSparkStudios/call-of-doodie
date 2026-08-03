import { describe, expect, it } from 'vitest';
import { buildPerformanceEvidence } from '../scripts/lib/performance-evidence.mjs';

function report(url, { performance, lcpMs, cls, tbtMs }) {
  return {
    requestedUrl: url,
    finalDisplayedUrl: url,
    categories: { performance: { score: performance } },
    audits: {
      'largest-contentful-paint': { numericValue: lcpMs },
      'cumulative-layout-shift': { numericValue: cls },
      'total-blocking-time': { numericValue: tbtMs },
    },
  };
}

describe('production performance evidence', () => {
  it('computes medians and keeps Lighthouse separate from the funnel gate', () => {
    const runs = [
      { surface: 'default', rawSha256: 'a'.repeat(64), captureWarning: 'chrome-profile-cleanup-eperm-after-complete-report', report: report('https://example.test/', { performance: 0.9, lcpMs: 1000, cls: 0.01, tbtMs: 10 }) },
      { surface: 'default', rawSha256: 'b'.repeat(64), report: report('https://example.test/', { performance: 0.8, lcpMs: 1200, cls: 0.02, tbtMs: 20 }) },
      { surface: 'default', rawSha256: 'e'.repeat(64), report: report('https://example.test/', { performance: 0.85, lcpMs: 1100, cls: 0.015, tbtMs: 15 }) },
      { surface: 'legacy-v1', rawSha256: 'c'.repeat(64), report: report('https://example.test/?home=v1', { performance: 0.7, lcpMs: 1600, cls: 0.03, tbtMs: 30 }) },
      { surface: 'legacy-v1', rawSha256: 'd'.repeat(64), report: report('https://example.test/?home=v1', { performance: 0.75, lcpMs: 1800, cls: 0.04, tbtMs: 40 }) },
      { surface: 'legacy-v1', rawSha256: 'f'.repeat(64), report: report('https://example.test/?home=v1', { performance: 0.72, lcpMs: 1700, cls: 0.035, tbtMs: 35 }) },
    ];
    const receipt = buildPerformanceEvidence({
      runs,
      sourceSha: 'f'.repeat(40),
      hostedRevision: 'f'.repeat(12),
      baseUrl: 'https://example.test/',
      packageTrust: { liveVerdict: 'APPROVE' },
    });

    expect(receipt.ok).toBe(true);
    expect(receipt.surfaces.default.median.lcpMs).toBe(1100);
    expect(receipt.surfaces['legacy-v1'].median.lcpMs).toBe(1700);
    expect(receipt.comparison).toMatchObject({ lcpImprovementMs: 600, lighthouseGatePassed: true });
    expect(receipt.retirement).toMatchObject({ funnelGate: 'not-collected', eligible: false });
    expect(receipt.warnings).toEqual(['chrome-profile-cleanup-eperm-after-complete-report']);
  });

  it('rejects redirects, missing revisions, and unresolved package trust', () => {
    const redirected = report('https://example.test/', { performance: 0.9, lcpMs: 1000, cls: 0, tbtMs: 0 });
    redirected.finalDisplayedUrl = 'https://other.test/';
    const receipt = buildPerformanceEvidence({
      runs: [
        { surface: 'default', rawSha256: 'a'.repeat(64), report: redirected },
        { surface: 'legacy-v1', rawSha256: 'b'.repeat(64), report: report('https://example.test/?home=v1', { performance: 0.8, lcpMs: 1300, cls: 0, tbtMs: 0 }) },
      ],
      sourceSha: 'f'.repeat(40),
      packageTrust: { liveVerdict: 'REVIEW' },
    });

    expect(receipt.ok).toBe(false);
    expect(receipt.issues).toContain('default redirected during capture.');
    expect(receipt.issues).toContain('Hosted revision is missing.');
    expect(receipt.issues).toContain('Package trust live verdict is not APPROVE.');
    expect(receipt.issues).toContain('default has 1 Lighthouse sample(s); 3 required.');
  });

  it('rejects a hosted revision that is not the source under measurement', () => {
    const receipt = buildPerformanceEvidence({
      runs: [
        { surface: 'default', rawSha256: 'a'.repeat(64), report: report('https://example.test/', { performance: 0.9, lcpMs: 1000, cls: 0, tbtMs: 0 }) },
        { surface: 'legacy-v1', rawSha256: 'b'.repeat(64), report: report('https://example.test/?home=v1', { performance: 0.8, lcpMs: 1300, cls: 0, tbtMs: 0 }) },
      ],
      sourceSha: 'a'.repeat(40),
      hostedRevision: 'b'.repeat(12),
      packageTrust: { liveVerdict: 'APPROVE' },
    });
    expect(receipt.ok).toBe(false);
    expect(receipt.issues).toContain('Hosted revision does not match the source SHA.');
  });
});
