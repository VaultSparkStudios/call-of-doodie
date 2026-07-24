const VALID_BANDS = new Set(["light", "stable", "overrun"]);
const MAX_TRANSITIONS = 24;

function band(value) {
  return VALID_BANDS.has(value) ? value : "stable";
}

function ratio(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.min(9.99, number)) : 0;
}

export function createPressureArc() {
  return {
    schemaVersion: "pressure-arc-v1",
    counts: { light: 0, stable: 0, overrun: 0 },
    transitions: [],
    maxPressureRatio: 0,
    lastBand: null,
  };
}

export function recordPressureSnapshot(arc, snapshot = {}) {
  const target = arc?.schemaVersion === "pressure-arc-v1" ? arc : createPressureArc();
  const nextBand = band(snapshot.pressureBand);
  const nextRatio = ratio(snapshot.pressureRatio);
  target.maxPressureRatio = Math.max(target.maxPressureRatio, nextRatio);

  if (target.lastBand === nextBand) return target;
  target.lastBand = nextBand;
  target.counts[nextBand] = Math.max(0, Number(target.counts[nextBand]) || 0) + 1;
  target.transitions.push({
    wave: Math.max(1, Math.floor(Number(snapshot.wave) || 1)),
    stage: String(snapshot.stageId || "unknown").slice(0, 24),
    band: nextBand,
    pressureRatio: Math.round(nextRatio * 100) / 100,
  });
  if (target.transitions.length > MAX_TRANSITIONS) {
    target.transitions.splice(0, target.transitions.length - MAX_TRANSITIONS);
  }
  return target;
}

export function finalizePressureArc(arc, { deathWave = 1 } = {}) {
  const source = arc?.schemaVersion === "pressure-arc-v1" ? arc : createPressureArc();
  const transitions = Array.isArray(source.transitions)
    ? source.transitions.slice(-MAX_TRANSITIONS).map((entry) => ({
        wave: Math.max(1, Math.floor(Number(entry.wave) || 1)),
        stage: String(entry.stage || "unknown").slice(0, 24),
        band: band(entry.band),
        pressureRatio: Math.round(ratio(entry.pressureRatio) * 100) / 100,
      }))
    : [];
  const counts = { light: 0, stable: 0, overrun: 0 };
  for (const entry of transitions) counts[entry.band] += 1;
  const collapseBand = transitions.at(-1)?.band || "unobserved";
  const overrunShare = transitions.length ? Math.round((counts.overrun / transitions.length) * 100) : 0;
  return {
    schemaVersion: "pressure-arc-v1",
    claim: "observed-wave-pressure-transitions-not-causality",
    deathWave: Math.max(1, Math.floor(Number(deathWave) || 1)),
    collapseBand,
    transitionCount: transitions.length,
    counts,
    overrunShare,
    maxPressureRatio: Math.round(ratio(source.maxPressureRatio) * 100) / 100,
    transitions,
  };
}

export function describePressureArc(receipt) {
  if (!receipt || receipt.transitionCount < 1) return "No wave-pressure transition was observed for this run.";
  if (receipt.collapseBand === "overrun") {
    return `The final observed director band was overrun; ${receipt.counts.overrun} of ${receipt.transitionCount} pressure transitions were overrun. This describes the run and does not prove the cause of death.`;
  }
  if (receipt.counts.overrun > 0) {
    return `The run entered overrun ${receipt.counts.overrun} time${receipt.counts.overrun === 1 ? "" : "s"} and returned to ${receipt.collapseBand} before the final observation.`;
  }
  return `The run ended from a ${receipt.collapseBand} director band with no observed overrun transition.`;
}
