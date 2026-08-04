import { createHash } from 'node:crypto';
import { validateBriefEvidence } from './brief-evidence.mjs';
import { validateStartupBrief } from '../validate-brief-format.mjs';

export const GENERATED_PRIVATE_PATHS = Object.freeze([
  'context/SIGNALS.md',
  'portfolio/compiled/FORECAST_LEDGER.json',
]);

export function evaluateStartupAcceptance({
  capabilities = [],
  briefText = '',
  status = {},
  ignoredPaths = {},
  sourceText = '',
} = {}) {
  const issues = [];
  const capabilitySources = [...new Set(capabilities.map((entry) => entry?.mapSource).filter(Boolean))].sort();
  const readyCapabilities = capabilities.filter((entry) => entry?.ok === true).length;

  if (capabilities.length === 0) issues.push('Capability audit resolved zero capabilities.');
  if (capabilitySources.length === 0 || capabilities.some((entry) => !entry?.mapSource)) {
    issues.push('Capability-map provenance is missing.');
  }

  const format = validateStartupBrief(briefText);
  if (!format.ok) {
    issues.push(...format.missingRequired.map((issue) => `Brief format: missing ${issue}`));
    issues.push(...format.forbiddenHits.map((issue) => `Brief format: forbidden ${issue.label}`));
    if (format.bodyShape) issues.push(`Brief format: ${format.bodyShape}`);
    if (format.staleBrief) issues.push(`Brief format: ${format.staleBrief}`);
  }

  const evidence = validateBriefEvidence(briefText, status);
  if (!evidence.ok) issues.push(...evidence.issues.map((issue) => `Brief evidence: ${issue}`));

  for (const relativePath of GENERATED_PRIVATE_PATHS) {
    if (ignoredPaths[relativePath] !== true) {
      issues.push(`Generated private artifact is not ignored: ${relativePath}`);
    }
  }

  return {
    schemaVersion: 'startup-acceptance-v1',
    ok: issues.length === 0,
    issues,
    capabilities: {
      ready: readyCapabilities,
      total: capabilities.length,
      sources: capabilitySources,
    },
    brief: {
      bytes: Buffer.byteLength(briefText),
      formatOk: format.ok,
      evidenceOk: evidence.ok,
      hasGeniusBox: /GENIUS HIT LIST/.test(briefText),
      hasHumanPressureBox: /HUMAN PRESSURE/.test(briefText),
      hasFlatRateCost: /flat-rate Max Plan/.test(briefText),
    },
    generatedPrivatePaths: Object.fromEntries(
      GENERATED_PRIVATE_PATHS.map((relativePath) => [relativePath, ignoredPaths[relativePath] === true]),
    ),
    sourceHash: createHash('sha256').update(sourceText).digest('hex'),
  };
}
