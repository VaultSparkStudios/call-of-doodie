const VALID_BANDS = new Set(["light", "stable", "overrun"]);
const VALID_ARC_VERSIONS = new Set(["pressure-arc-v1", "pressure-arc-v2"]);
const MAX_TRANSITIONS = 24;
const MAX_FORMATION_EXPOSURES = 99999;

export const FORMATION_COUNTERPLAY = Object.freeze({
  pincer: Object.freeze({ label: "Pincer", drill: "Cut through one seam before both lanes close." }),
  escort: Object.freeze({ label: "Escort", drill: "Break the guard screen before spending burst damage." }),
  flank: Object.freeze({ label: "Flank", drill: "Keep a retreat lane open and rotate before the collapse." }),
  surge: Object.freeze({ label: "Surge", drill: "Kite the center rush, then punish its recovery gap." }),
});

function band(value) {
  return VALID_BANDS.has(value) ? value : "stable";
}

function ratio(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.min(9.99, number)) : 0;
}

function isPressureArc(value) {
  return VALID_ARC_VERSIONS.has(value?.schemaVersion);
}

function formationId(value) {
  const id = String(value || "").toLowerCase();
  return Object.hasOwn(FORMATION_COUNTERPLAY, id) ? id : null;
}

function boundedCount(value) {
  return Math.max(0, Math.min(MAX_FORMATION_EXPOSURES, Math.floor(Number(value) || 0)));
}

export function createPressureArc() {
  return {
    schemaVersion: "pressure-arc-v2",
    counts: { light: 0, stable: 0, overrun: 0 },
    transitions: [],
    maxPressureRatio: 0,
    lastBand: null,
    formationCounts: { pincer: 0, escort: 0, flank: 0, surge: 0 },
    formationTransitions: [],
    formationExposureCount: 0,
    lastFormation: null,
  };
}

export function recordPressureSnapshot(arc, snapshot = {}) {
  const target = isPressureArc(arc) ? arc : createPressureArc();
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

export function recordFormationExposure(arc, formation = {}, context = {}) {
  const target = isPressureArc(arc) ? arc : createPressureArc();
  const id = formationId(formation.id);
  if (!id) return target;
  if (!target.formationCounts) target.formationCounts = { pincer: 0, escort: 0, flank: 0, surge: 0 };
  if (!Array.isArray(target.formationTransitions)) target.formationTransitions = [];
  target.formationCounts[id] = boundedCount(target.formationCounts[id] + 1);
  target.formationExposureCount = boundedCount((target.formationExposureCount || 0) + 1);
  if (target.lastFormation === id) return target;
  target.lastFormation = id;
  target.formationTransitions.push({
    wave: Math.max(1, Math.floor(Number(context.wave) || 1)),
    stage: String(context.stageId || "unknown").slice(0, 24),
    formation: id,
    lane: String(formation.lane || "unknown").slice(0, 16),
    role: String(formation.role || "unknown").slice(0, 16),
  });
  if (target.formationTransitions.length > MAX_TRANSITIONS) {
    target.formationTransitions.splice(0, target.formationTransitions.length - MAX_TRANSITIONS);
  }
  return target;
}

function normalizedFormationCounts(source) {
  return Object.fromEntries(Object.keys(FORMATION_COUNTERPLAY).map((id) => [id, boundedCount(source?.[id])]));
}

function dominantFormation(counts) {
  return Object.keys(FORMATION_COUNTERPLAY).reduce((best, id) => (
    counts[id] > (best ? counts[best] : 0) ? id : best
  ), null);
}

export function finalizePressureArc(arc, { deathWave = 1 } = {}) {
  const source = isPressureArc(arc) ? arc : createPressureArc();
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
  const formationCounts = normalizedFormationCounts(source.formationCounts);
  const formationTransitions = Array.isArray(source.formationTransitions)
    ? source.formationTransitions.slice(-MAX_TRANSITIONS).map((entry) => ({
        wave: Math.max(1, Math.floor(Number(entry.wave) || 1)),
        stage: String(entry.stage || "unknown").slice(0, 24),
        formation: formationId(entry.formation),
        lane: String(entry.lane || "unknown").slice(0, 16),
        role: String(entry.role || "unknown").slice(0, 16),
      })).filter((entry) => entry.formation)
    : [];
  const exposureCount = Object.values(formationCounts).reduce((sum, value) => sum + value, 0);
  return {
    schemaVersion: "pressure-arc-v2",
    claim: "observed-wave-pressure-and-formation-exposure-not-causality",
    deathWave: Math.max(1, Math.floor(Number(deathWave) || 1)),
    collapseBand,
    transitionCount: transitions.length,
    counts,
    overrunShare,
    maxPressureRatio: Math.round(ratio(source.maxPressureRatio) * 100) / 100,
    transitions,
    formationClaim: "observed-spawn-formation-exposure-not-cause-of-death",
    formationExposureCount: exposureCount,
    formationCounts,
    dominantFormation: dominantFormation(formationCounts),
    formationTransitions,
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

export function describeFormationPressure(receipt) {
  const id = formationId(receipt?.dominantFormation);
  const count = id ? boundedCount(receipt?.formationCounts?.[id]) : 0;
  if (!id || count < 1) return "No coordinated formation exposure was observed for this run.";
  const formation = FORMATION_COUNTERPLAY[id];
  return `${formation.label} was the most frequent observed formation (${count} exposure${count === 1 ? "" : "s"}). ${formation.drill} This is a counterplay drill, not proof of what caused the defeat.`;
}
