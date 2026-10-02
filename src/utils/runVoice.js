// Authored, fact-gated flavor lines. No hosted inference, user text, dynamic
// executable templates, or claims beyond the typed event facts below.
export const RUN_VOICE_VERSION = 'run-voice-v1';
const RECENT_KEY = 'cod-run-voice-recent-v1';
const cache = new Map();
const bounded = (value, max) => value != null && value !== '' && Number.isInteger(Number(value)) && Number(value) >= 0 && Number(value) <= max ? Number(value) : null;

export function buildRunVoice(facts = {}, recentIds = []) {
  const wave = bounded(facts.wave, 100000) ?? 1;
  const bosses = bounded(facts.bossKillCount, 1000);
  const precision = bounded(facts.precisionPeakStreak, 100000);
  const kills = bounded(facts.kills, 1000000);
  const near = Array.isArray(facts.nearDeathEvents) ? facts.nearDeathEvents[0] : null;
  const nearHp = bounded(near?.hpLeft, 100000);
  const nearWave = bounded(near?.wave, 100000);
  const recent = Array.isArray(recentIds) ? recentIds.filter((id) => typeof id === 'string').slice(-4) : [];
  const key = JSON.stringify([RUN_VOICE_VERSION, wave, bosses, precision, kills, nearHp, nearWave, recent]);
  if (cache.has(key)) return cache.get(key);
  const choices = [];
  if (bosses >= 1) choices.push({ id: 'boss-receipt', evidence: 'bossKillCount', line: `${bosses} boss${bosses === 1 ? '' : 'es'} down. The sewer has requested a management review.` });
  if (nearHp != null && nearWave != null && nearWave <= wave) choices.push({ id: 'near-miss', evidence: 'nearDeathEvents[0]', line: `Wave ${nearWave}: ${nearHp} HP left and a very confident insurance adjuster.` });
  if (precision >= 5) choices.push({ id: 'precision-form', evidence: 'precisionPeakStreak', line: `A ${precision}-step precision streak. Someone file the aim paperwork before it expires.` });
  if (kills >= 10) choices.push({ id: 'kill-ledger', evidence: 'kills', line: `${kills} takedowns entered the ledger. The ledger is asking for a break.` });
  if (wave >= 10) choices.push({ id: 'deep-wave', evidence: 'wave', line: `Wave ${wave} reached. The pipes are now sending strongly worded memos.` });
  choices.push({ id: 'opening-receipt', evidence: 'wave', line: `Wave ${wave} reached. The sewer keeps receipts, even for a short shift.` });
  const selected = choices.find((candidate) => !recent.includes(candidate.id)) || choices[0];
  const result = Object.freeze({ schemaVersion: RUN_VOICE_VERSION, ...selected, eventSignature: key, inferenceCalls: 0 });
  if (cache.size >= 128) cache.delete(cache.keys().next().value);
  cache.set(key, result);
  return result;
}

export function readRecentRunVoices(storage = globalThis.sessionStorage) {
  try {
    const value = JSON.parse(storage.getItem(RECENT_KEY) || '[]');
    return Array.isArray(value) ? value.filter((id) => typeof id === 'string').slice(-4) : [];
  } catch { return []; }
}

export function rememberRunVoice(id, storage = globalThis.sessionStorage) {
  if (typeof id !== 'string' || id.length > 40) return;
  try { storage.setItem(RECENT_KEY, JSON.stringify([...readRecentRunVoices(storage).filter((prior) => prior !== id), id].slice(-4))); } catch { /* blocked storage still has a deterministic line */ }
}
