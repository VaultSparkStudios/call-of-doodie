import { hashEvidence } from './agent-evidence-pack.mjs';
const ordered = value => Array.isArray(value) ? value.map(ordered) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, ordered(value[key])])) : value;
export function evidenceCacheKey(descriptor) {
  const required = ['sourceSha', 'sourceDigest', 'deployRevision', 'route', 'contentHash', 'inputMethod', 'viewport', 'theme', 'setup', 'state'];
  if (!descriptor || required.some(key => descriptor[key] == null) || !/^[a-f0-9]{40}$/.test(descriptor.sourceSha)) return null;
  if (!/^sha256:[a-f0-9]{64}$/.test(descriptor.sourceDigest) || !/^sha256:[a-f0-9]{64}$/.test(descriptor.contentHash)) return null;
  if (!descriptor.deployRevision || !descriptor.route || !descriptor.inputMethod || !descriptor.theme || !descriptor.state || !Number.isFinite(descriptor.viewport.width) || !Number.isFinite(descriptor.viewport.height)) return null;
  return hashEvidence(JSON.stringify(ordered(Object.fromEntries(required.map(key => [key, descriptor[key]])))));
}
export function canReuseEvidence(cached, descriptor) {
  const key = evidenceCacheKey(descriptor);
  return Boolean(key && cached?.key === key && cached?.pass === true && cached?.complete === true && cached?.volatility === 'stable' && descriptor.volatility !== 'live');
}
