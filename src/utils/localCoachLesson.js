// Deterministic, browser-local coaching. These are observations and practice
// suggestions, never a causal diagnosis or a change to competitive rules.
const finite = (value) => value != null && value !== '' && Number.isFinite(Number(value)) ? Number(value) : null;
const sameRun = (left, right) => left && right && left.ts === right.ts && left.score === right.score && left.wave === right.wave && left.runSeed === right.runSeed;
const label = (run) => String(run?.deathAttribution?.sourceName || run?.killedByName || '').trim().slice(0, 40);
const observedKiller = (run) => run?.deathAttribution?.evidenceLevel === 'observed' && label(run) ? label(run) : null;
const abstain = (observed, missingEvidence, reason = 'insufficient-comparable-evidence') => ({
  schemaVersion: 1, status: 'abstain', reason, evidenceLevel: 'missing_evidence', observed,
  likelyFactor: null, missingEvidence, suggestion: 'Replay this seed or try one unranked practice run, then compare the result.',
  drill: { id: 'evidence_check', kind: 'practice', target: 'Keep mode and difficulty the same for a useful comparison.' },
  why: 'One outcome cannot establish a repeatable failure pattern.',
});

export function buildLocalCoachLesson({ latestRun = null, runHistory = [], mode = null, difficulty = null } = {}) {
  if (!latestRun || finite(latestRun.wave) == null) return abstain('No completed run is available.', ['A completed run with a recorded wave.']);
  const runMode = mode || latestRun.mode;
  const runDifficulty = difficulty || latestRun.difficulty;
  const comparable = (Array.isArray(runHistory) ? runHistory : [])
    .filter((run) => run && run.mode === runMode && run.difficulty === runDifficulty && !sameRun(run, latestRun))
    .slice(0, 6);
  const currentKiller = observedKiller(latestRun);
  const observed = `This ${runMode || 'run'} ended on wave ${Math.max(1, Math.floor(finite(latestRun.wave) || 1))}${currentKiller ? `; the recorded final source was ${currentKiller}` : ''}.`;
  const missing = [];
  if (comparable.length < 2) missing.push(`Two earlier runs on ${runDifficulty || 'the same'} difficulty in ${runMode || 'this mode'} (found ${comparable.length}).`);
  if (!currentKiller) missing.push('An observed final damage source; nearby enemies are only a hypothesis.');
  if (comparable.length < 2) return abstain(observed, missing);

  const priorObserved = comparable.map(observedKiller).filter(Boolean);
  const repeated = currentKiller ? priorObserved.filter((source) => source === currentKiller).length : 0;
  const opposing = currentKiller ? priorObserved.filter((source) => source !== currentKiller).length : 0;
  if (repeated >= 2 && opposing > repeated) return abstain(observed, ['Recent observed final sources disagree; a repeatable killer is not established.'], 'contradictory-killer-evidence');
  if (repeated >= 2) return {
    schemaVersion: 1, status: 'ready', reason: 'repeated-observed-final-source', evidenceLevel: 'pattern', observed,
    likelyFactor: `${currentKiller} also ended ${repeated} of ${comparable.length} comparable earlier runs. Repeated exposure is a likely factor, not proven causality.`,
    missingEvidence: opposing ? [`${opposing} comparable run${opposing === 1 ? '' : 's'} ended from a different observed source.`] : [],
    suggestion: `Practice one safe counter to ${currentKiller} before the next scored attempt.`,
    drill: { id: 'repeat_killer_practice', kind: 'practice', target: `On the next attempt, watch ${currentKiller}'s warning and move before firing again.` },
    why: 'The same observed final source recurred in multiple runs with matching mode and difficulty.',
  };

  const shots = finite(latestRun.totalShots);
  const hits = finite(latestRun.totalHits);
  const accuracy = shots >= 30 && hits != null && hits >= 0 && hits <= shots ? hits / shots : null;
  const priorAccuracy = comparable.map((run) => {
    const runShots = finite(run.totalShots), runHits = finite(run.totalHits);
    return runShots >= 30 && runHits != null && runHits >= 0 && runHits <= runShots ? runHits / runShots : null;
  }).filter((value) => value != null);
  if (accuracy != null && priorAccuracy.length >= 2) {
    const baseline = priorAccuracy.reduce((sum, value) => sum + value, 0) / priorAccuracy.length;
    if (accuracy < 0.35 && baseline - accuracy >= 0.1) return {
      schemaVersion: 1, status: 'ready', reason: 'measured-accuracy-drop', evidenceLevel: 'pattern',
      observed: `${observed} ${hits} of ${shots} shots hit (${Math.round(accuracy * 100)}%).`,
      likelyFactor: `Comparable runs averaged ${Math.round(baseline * 100)}% hits; today's drop may have reduced damage, but it does not identify the death cause.`,
      missingEvidence: currentKiller ? [] : ['An observed final damage source.'],
      suggestion: 'Slow the first weapon down before buying more fire rate.',
      drill: { id: 'aim_route_practice', kind: 'practice', target: 'On the next attempt, compare hit rate with the same mode and difficulty.' },
      why: `Shot and hit counts exist for this run and ${priorAccuracy.length} comparable runs.`,
    };
  }

  const nearWave = comparable.filter((run) => Math.abs((finite(run.wave) ?? -99) - Number(latestRun.wave)) <= 1).length;
  if (Number(latestRun.wave) >= 4 && nearWave >= 2) return {
    schemaVersion: 1, status: 'ready', reason: 'repeat-wave-plateau', evidenceLevel: 'pattern', observed,
    likelyFactor: `${nearWave} of ${comparable.length} comparable runs ended within one wave of this one; the cause is still unknown.`,
    missingEvidence: ['A repeated observed final source or a clear shot-accuracy trend.'],
    suggestion: `Practice the approach to wave ${latestRun.wave} without submitting a score.`,
    drill: { id: 'wave_plateau_practice', kind: 'practice', target: `On an unranked attempt, reach wave ${latestRun.wave} with one defensive resource held back.` },
    why: 'The wave pattern repeats at matching mode and difficulty; this does not prove a particular enemy or build is responsible.',
  };
  return abstain(observed, [...missing, 'No repeated killer, measured aim drop, or wave plateau among comparable runs.']);
}
