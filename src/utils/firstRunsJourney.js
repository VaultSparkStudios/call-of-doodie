function runs(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
}

const DEFINITIONS = Object.freeze([
  { label: 'RUN 1', title: 'Survive & Calibrate', text: 'Use WASD or left stick to keep space. Sweep aim around your soldier and fire when a lane opens.' },
  { label: 'RUN 2', title: 'Prove It', text: 'Try the Daily seed. Fixed conditions make every dodge, perk, and mistake easier to compare.' },
  { label: 'RUN 3', title: 'Build', text: 'Spend upgrades, replay a seed, then compare whether your build actually changed the run.' },
]);

export function buildFirstRunsJourney({ totalRuns = 0 } = {}) {
  const completedRuns = runs(totalRuns);
  if (completedRuns >= DEFINITIONS.length) return null;
  const steps = DEFINITIONS.map((definition, index) => ({
    ...definition,
    complete: index < completedRuns,
    active: index === completedRuns,
    evidence: index < completedRuns ? `career.totalRuns>=${index + 1}` : null,
  }));
  return {
    schemaVersion: 'first-runs-journey-v1',
    source: 'career.totalRuns',
    completedRuns,
    activeRun: completedRuns + 1,
    steps,
  };
}
