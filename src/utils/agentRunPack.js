const MODE_IDS = new Set(['standard', 'score_attack', 'daily_challenge', 'cursed', 'boss_rush', 'speedrun', 'gauntlet', 'zombies', 'boss_gauntlet', 'sewer_extraction', 'bot_royale', 'hold_the_throne', 'operation']);
const DIFFICULTY_IDS = new Set(['easy', 'normal', 'hard', 'insane']);
const COACH_REASONS = new Set(['insufficient-comparable-evidence', 'contradictory-killer-evidence', 'repeated-observed-final-source', 'measured-accuracy-drop', 'repeat-wave-plateau']);
const boundedInt = (value, max) => value != null && value !== '' && Number.isSafeInteger(Number(value)) && Number(value) >= 0 && Number(value) <= max ? Number(value) : null;
const observedAt = (value) => {
  const timestamp = Number(value);
  return Number.isFinite(timestamp) && timestamp >= Date.parse('2020-01-01T00:00:00Z') && timestamp <= Date.now() + 86400000 ? new Date(timestamp).toISOString() : null;
};

export const RUN_ANALYSIS_SCHEMA = Object.freeze({
  schemaVersion: 'run-analysis-schema-v1',
  format: 'application/json',
  access: { generation: 'player-action-on-device', upload: 'none', agentWrites: 'not-offered' },
  identity: 'No player name, account, Passport, session, token, device identifier or local-storage dump.',
  trust: 'Player-owned local summary. Values are not a score attestation, authenticated replay or full physics simulation.',
  eventMeaning: {
    finalSource: 'Recorded final-damage attribution only when the game observed it; typeIndex resolves through gameplay-contract.json enemies. Null means unknown.',
    coachReason: 'Deterministic local comparison code; it does not prove causality.',
  },
  units: { score: 'points', wave: 'wave index', kills: 'count', durationSeconds: 'seconds', totalShots: 'count', totalHits: 'count', seed: 'integer', recordedAt: 'ISO 8601 UTC' },
  hash: 'SHA-256 over UTF-8 JSON of every export field except contentHash, in insertion order.',
  gameplayContract: '/gameplay-contract.json',
});

export async function buildAgentRunPack({ run, coachLesson = null, generatedAt = new Date().toISOString() } = {}, cryptoImpl = globalThis.crypto) {
  if (!run || boundedInt(run.wave, 100000) == null) throw new Error('A completed run is required.');
  if (!cryptoImpl?.subtle?.digest) throw new Error('SHA-256 is unavailable in this browser.');
  const typeIndex = boundedInt(run.deathAttribution?.typeIndex, 21);
  const pack = {
    schemaVersion: 'run-analysis-v1', schema: '/run-analysis-schema.json', generatedAt,
    trust: { level: 'player-owned-local-advisory', boardSubmission: 'not-attested-by-this-export', physicsReplay: false, agentWriteAuthority: false },
    run: {
      mode: MODE_IDS.has(run.mode) ? run.mode : 'unknown',
      difficulty: DIFFICULTY_IDS.has(run.difficulty) ? run.difficulty : 'unknown',
      recordedAt: observedAt(run.ts),
      seed: boundedInt(run.runSeed, 999999999), score: boundedInt(run.score, 1000000000),
      wave: boundedInt(run.wave, 100000), kills: boundedInt(run.kills, 1000000),
      durationSeconds: boundedInt(run.time, 864000),
      shots: boundedInt(run.totalShots, 10000000), hits: boundedInt(run.totalHits, 10000000),
    },
    events: [{ kind: 'final-source', typeIndex: run.deathAttribution?.evidenceLevel === 'observed' ? typeIndex : null,
      evidenceLevel: run.deathAttribution?.evidenceLevel === 'observed' && typeIndex != null ? 'observed' : 'unknown',
      source: run.deathAttribution?.evidenceLevel === 'observed' && run.deathAttribution?.basis === 'damage-sequence' ? 'damage-sequence' : 'not-recorded' }],
    coach: { status: coachLesson?.status === 'ready' ? 'ready' : 'abstain',
      reason: COACH_REASONS.has(coachLesson?.reason) ? coachLesson.reason : 'insufficient-comparable-evidence',
      evidenceLevel: coachLesson?.status === 'ready' ? 'pattern' : 'missing_evidence' },
  };
  const bytes = new TextEncoder().encode(JSON.stringify(pack));
  const digest = await cryptoImpl.subtle.digest('SHA-256', bytes);
  pack.contentHash = `sha256:${Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')}`;
  return pack;
}
