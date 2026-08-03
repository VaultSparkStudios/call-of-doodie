import { createHash } from 'node:crypto';

function validHttpsUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

function clone(value) {
  return JSON.parse(JSON.stringify(value || {}));
}

export function reconcileReleaseManifest(manifestInput, status = {}) {
  const manifest = clone(manifestInput);
  const issues = [];
  const runtimeUrl = validHttpsUrl(status.runtimeUrl || manifest.hosting?.liveUrl);
  const stagingUrl = validHttpsUrl(status.stagingUrl);
  const stagingType = String(status.stagingType || '').trim();

  if (!runtimeUrl) issues.push('Production runtime URL is missing or is not HTTPS.');
  if (!stagingUrl) issues.push('Staging URL is missing or is not HTTPS.');
  if (!stagingType) issues.push('Staging type is missing.');
  if (runtimeUrl && stagingUrl && runtimeUrl === stagingUrl) {
    issues.push('Staging must be isolated from production.');
  }

  const sanitizationEvidence = typeof status.sanitizationLastCleared === 'string'
    && !Number.isNaN(Date.parse(status.sanitizationLastCleared))
    ? status.sanitizationLastCleared
    : null;
  if (!sanitizationEvidence) issues.push('Public-repository sanitization evidence is missing.');

  manifest.generatedFrom = 'project-status release projection';
  manifest.synthesized = false;
  manifest.obeliskArchitecture = 'external';
  manifest.identityPosture = {
    play: 'guest-first',
    accountStatus: 'route-present-verification-deferred',
    provider: 'Obelisk',
    sourceDecision: 'context/DECISIONS.md#obelisk-surfaces-are-explicit-routes-not-a-gameplay-gate',
  };
  manifest.surfaces ||= {};
  manifest.surfaces.staging = stagingUrl && stagingType
    ? [{ label: stagingType, url: stagingUrl }]
    : [];
  manifest.hosting ||= {};
  manifest.hosting.hostingProvider = status.stagingType || manifest.hosting.hostingProvider || 'unknown';
  manifest.hosting.liveUrl = runtimeUrl;
  manifest.hosting.stagingUrl = stagingUrl;
  manifest.publicMetadata ||= {};
  manifest.publicMetadata.publicRepoSanitized = Boolean(sanitizationEvidence);
  manifest.publicMetadata.sanitizationEvidence = sanitizationEvidence;
  manifest.capabilities ||= {};
  manifest.capabilities.auth = false;

  const source = {
    runtimeUrl,
    stagingUrl,
    stagingType,
    sanitizationEvidence,
    auth: false,
    obeliskArchitecture: manifest.obeliskArchitecture,
  };
  const sourceFingerprint = createHash('sha256').update(JSON.stringify(source)).digest('hex');
  manifest.releaseProjection = {
    schemaVersion: 'release-manifest-projection-v1',
    source: 'context/PROJECT_STATUS.json',
    sourceFingerprint,
  };

  return {
    manifest,
    receipt: {
      schemaVersion: 'release-manifest-receipt-v1',
      ok: issues.length === 0,
      issues,
      sourceFingerprint,
      staging: { type: stagingType || null, url: stagingUrl },
      production: { url: runtimeUrl },
      publicRepoSanitized: Boolean(sanitizationEvidence),
      obeliskArchitecture: manifest.obeliskArchitecture,
      authEnabled: manifest.capabilities.auth,
    },
  };
}
