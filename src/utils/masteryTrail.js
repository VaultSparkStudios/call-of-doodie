export const MASTERY_TRAIL_KEY = "cod-mastery-trail-v1";

export const MASTERY_FOCI = Object.freeze([
  { id: "survival", label: "Hold the line", icon: "🛡️", description: "Reach one wave beyond your last run." },
  { id: "aim", label: "Sharpen the aim", icon: "🎯", description: "Land at least 20 shots at a clear accuracy target in one later run." },
  { id: "boss", label: "Hunt the boss", icon: "👑", description: "Defeat a boss in one later run." },
]);

export const MASTERY_MILESTONES = Object.freeze([
  { id: "doctrine", label: "Forge a new doctrine", description: "Forge one doctrine you had not earned when you chose this trail." },
  { id: "achievement", label: "Earn a new achievement", description: "Unlock one achievement you had not earned when you chose this trail." },
]);

const focusIds = new Set(MASTERY_FOCI.map((focus) => focus.id));
const milestoneIds = new Set(MASTERY_MILESTONES.map((milestone) => milestone.id));
const count = (value) => Math.max(0, Math.floor(Number(value) || 0));
const accuracy = (run) => count(run?.totalShots) > 0 ? Math.min(100, Math.round(100 * count(run?.totalHits) / count(run?.totalShots))) : 0;
const doctrineIds = (archive) => (Array.isArray(archive) ? archive : Array.isArray(archive?.forged) ? archive.forged : Object.keys(archive && typeof archive === "object" ? archive : {})).filter((id) => typeof id === "string").sort();
const achievementIds = (career) => Array.isArray(career?.achievementsEver) ? career.achievementsEver.filter((id) => typeof id === "string").sort() : [];

export function createMasteryTrail({ focusId, milestoneId, lastRun, doctrines, career, now = Date.now() }) {
  if (!focusIds.has(focusId) || !milestoneIds.has(milestoneId) || !lastRun || !Number.isFinite(Number(lastRun.ts))) return null;
  return {
    version: 1,
    focusId,
    milestoneId,
    startedAt: now,
    baseline: {
      runTs: Number(lastRun.ts),
      wave: count(lastRun.wave),
      accuracy: accuracy(lastRun),
      bossKills: count(lastRun.bossKills),
      deathName: lastRun.deathAttribution?.evidenceLevel === "observed" ? String(lastRun.deathAttribution.sourceName || "").slice(0, 40) : "",
      doctrines: doctrineIds(doctrines),
      achievements: achievementIds(career),
    },
    weeklyFocus: false,
    hidden: false,
  };
}

export function evaluateMasteryTrail(trail, { runs = [], doctrines = {}, career = {} } = {}) {
  if (!trail || !focusIds.has(trail.focusId) || !milestoneIds.has(trail.milestoneId)) return null;
  const baseline = trail.baseline || {};
  const later = (Array.isArray(runs) ? runs : []).filter((run) => Number(run?.ts) > Number(trail.startedAt || 0));
  const target = trail.focusId === "survival"
    ? Math.max(2, count(baseline.wave) + 1)
    : trail.focusId === "aim" ? Math.max(30, Math.min(100, count(baseline.accuracy) + 5)) : 1;
  const practiceRun = later.find((run) => trail.focusId === "survival"
    ? count(run.wave) >= target
    : trail.focusId === "aim" ? count(run.totalShots) >= 20 && accuracy(run) >= target : count(run.bossKills) >= 1) || null;
  const current = trail.milestoneId === "doctrine" ? doctrineIds(doctrines) : achievementIds(career);
  const previous = new Set(trail.milestoneId === "doctrine" ? baseline.doctrines : baseline.achievements);
  const earnedId = current.find((id) => !previous.has(id)) || null;
  const practiceLabel = trail.focusId === "survival"
    ? `Reach wave ${target} or farther in one new run`
    : trail.focusId === "aim" ? `Land at least 20 shots at ${target}% accuracy or better in one new run` : "Defeat at least one boss in one new run";
  const before = trail.focusId === "survival" ? count(baseline.wave) : trail.focusId === "aim" ? count(baseline.accuracy) : count(baseline.bossKills);
  const after = practiceRun ? trail.focusId === "survival" ? count(practiceRun.wave) : trail.focusId === "aim" ? accuracy(practiceRun) : count(practiceRun.bossKills) : null;
  return {
    focus: MASTERY_FOCI.find((entry) => entry.id === trail.focusId),
    milestone: MASTERY_MILESTONES.find((entry) => entry.id === trail.milestoneId),
    observed: Boolean(baseline.runTs),
    practiceRun,
    practiceLabel,
    practiceTarget: target,
    earnedId,
    completed: Boolean(practiceRun && earnedId),
    comparison: { before, after, unit: trail.focusId === "survival" ? "wave" : trail.focusId === "aim" ? "% accuracy" : "boss kills" },
  };
}

export function loadMasteryTrail(storage = globalThis.localStorage) {
  try {
    const trail = JSON.parse(storage.getItem(MASTERY_TRAIL_KEY) || "null");
    return trail?.version === 1 && focusIds.has(trail.focusId) && milestoneIds.has(trail.milestoneId) && Number.isFinite(Number(trail.startedAt)) ? trail : null;
  } catch { return null; }
}

export function saveMasteryTrail(trail, storage = globalThis.localStorage) {
  if (!trail || !evaluateMasteryTrail(trail)) return false;
  try { storage.setItem(MASTERY_TRAIL_KEY, JSON.stringify(trail)); return true; } catch { return false; }
}

export function clearMasteryTrail(storage = globalThis.localStorage) {
  try { storage.removeItem(MASTERY_TRAIL_KEY); return true; } catch { return false; }
}
