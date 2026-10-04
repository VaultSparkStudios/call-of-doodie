import { describe, expect, it } from 'vitest';
import { buildAgentEvidencePack, hashEvidence } from './agent-evidence-pack.mjs';
import { buildPublicGameplayContract } from './public-gameplay-contract.mjs';
import { RUN_ANALYSIS_SCHEMA } from '../../src/utils/agentRunPack.js';
import { FULL_MODE_CATALOG } from '../../src/config/modeCatalog.js';
import { DIFFICULTIES } from '../../src/constants.js';
describe('bounded agent evidence pack', () => {
  it('answers the declared scope with identical source facts and a verifiable hash', () => {
    const gameplay = buildPublicGameplayContract();
    const pack = buildAgentEvidencePack({ gameplay, runSchema: RUN_ANALYSIS_SCHEMA, resources: { '/gameplay-contract.json': JSON.stringify(gameplay) } });
    expect(pack.facts.modes).toEqual(gameplay.modes);
    expect(pack.facts.difficulties).toEqual(gameplay.difficulties);
    expect(pack.facts.challengeLinks).toEqual(gameplay.challengeLinks);
    const { contentHash, ...payload } = pack;
    expect(contentHash).toBe(hashEvidence(JSON.stringify(payload)));
    expect(pack.resources[0].contentHash).toBe(hashEvidence(JSON.stringify(gameplay)));
    expect(pack.facts.modes.map(mode => mode.id)).toEqual(FULL_MODE_CATALOG.map(mode => mode.id));
    expect(pack.facts.challengeLinks.scenarioCartridge.supportedDifficulties).toEqual(Object.keys(DIFFICULTIES));
  });
});
