import { createHash } from 'node:crypto';
export const hashEvidence = content => `sha256:${createHash('sha256').update(content).digest('hex')}`;
export function buildAgentEvidencePack({ gameplay, runSchema, resources = {} }) {
  const pack = {
    schemaVersion: 'agent-evidence-pack-v1',
    scope: ['mode objectives and ranking policy', 'difficulty factors', 'launch and cartridge grammar', 'local run export meaning'],
    access: 'public-read-only-no-agent-writes-no-paid-inference',
    gameplayRevision: gameplay.contentHash,
    facts: { loop: gameplay.loop, modes: gameplay.modes, difficulties: gameplay.difficulties,
      challengeLinks: gameplay.challengeLinks, trust: gameplay.trust, runAnalysisSchema: runSchema },
    resources: Object.entries(resources).map(([href, content]) => ({ href, contentHash: hashEvidence(content), bytes: Buffer.byteLength(content) })),
    freshness: {
      stableFacts: 'Reuse only while the canonical resource content hash matches.',
      renderedEvidence: 'Key by verified deploy revision, source digest, route, setup, input method, viewport, theme and state.',
      volatileFacts: 'Recheck service status and live leaderboards for each requested verification; never treat this pack as live service evidence.',
      failures: 'Never reuse a failing or incomplete capture as passing evidence.',
      buildIdentity: 'Read recorded build provenance from a player-provided run export. Content hashes do not attest the deployed source commit.',
    },
  };
  return { ...pack, contentHash: hashEvidence(JSON.stringify(pack)) };
}
