import { buildTraceEvidenceContract } from "./studioEventOps.js";
import { WEEKLY_MUTATIONS } from "../constants.js";

function n(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function average(values) {
  const nums = values.map(v => n(v)).filter(v => Number.isFinite(v));
  return nums.length ? nums.reduce((sum, v) => sum + v, 0) / nums.length : 0;
}

export function buildRunBrain({ career = {}, runHistory = [], studioEvents = [], latestAdvice = null, latestRun = {} } = {}) {
  const recentRuns = Array.isArray(runHistory) ? runHistory.slice(0, 8) : [];
  const recentEvents = Array.isArray(studioEvents) ? studioEvents.slice(0, 80) : [];
  const avgWave = average(recentRuns.map(run => run.wave));
  const avgScore = average(recentRuns.map(run => run.score));
  const replayEvents = recentEvents.filter((event) => {
    const haystack = `${event?.type || ""} ${event?.payload?.actionId || ""} ${event?.payload?.source || ""}`;
    return /replay|rematch|history_replay/i.test(haystack);
  });
  const adviceViews = recentEvents.filter(event => event?.type === "debrief_intelligence");
  const latestTraceEvidence = recentEvents.find(event => event?.category === "trust" && event?.payload?.traceEvidence?.level)?.payload?.traceEvidence || null;
  const traceContract = buildTraceEvidenceContract(latestTraceEvidence);
  const abandons = recentEvents.filter(event => event?.type === "mode_abandon");
  const deaths = Array.isArray(career?.recentDeathsByEnemy) ? career.recentDeathsByEnemy.slice(0, 8) : [];
  const precisionStreak = n(latestRun?.bestPrecisionStreak);

  let archetype = "balanced";
  if (avgWave > 0 && avgWave < 8) archetype = "survival_gap";
  else if (replayEvents.length >= 2) archetype = "seed_grinder";
  else if (abandons.length >= 2) archetype = "friction_sensitive";
  else if (avgScore >= 40000) archetype = "score_chaser";

  const followThrough = adviceViews.length === 0
    ? "No coach loop yet — the next debrief becomes the baseline."
    : replayEvents.length > 0
      ? "Coach advice is converting into rematches."
      : "Coach advice is being seen, but not yet followed by rematches.";

  const pressure = deaths.length >= 3
    ? "Recent deaths are clustered enough to personalize warning windows."
    : recentRuns.length >= 3
      ? `Recent baseline: wave ${avgWave.toFixed(1)}, ${Math.round(avgScore).toLocaleString()} points.`
      : "Needs two more runs before pattern memory is reliable.";

  const nextExperiment = latestAdvice
    ? `Run the next seed as a test of: ${latestAdvice}`
    : latestTraceEvidence?.level === "weak"
      ? `Run one replay-proof drill: ${traceContract.target}`
    : precisionStreak >= 5
      ? "Run one precision route: keep the same aim discipline, then buy damage multipliers before spray weapons."
    : archetype === "survival_gap"
      ? "Run one safe opener: stabilizer perk first, greed second."
      : archetype === "seed_grinder"
        ? "Repeat the same seed until wave and score both improve."
        : archetype === "friction_sensitive"
          ? "Use Normal difficulty and a familiar loadout before chasing variants."
          : "Commit to one build doctrine before the first shop.";

  return {
    archetype,
    confidence: Math.min(1, (recentRuns.length + adviceViews.length + replayEvents.length) / 10),
    avgWave: Math.round(avgWave * 10) / 10,
    avgScore: Math.round(avgScore),
    followThrough,
    pressure,
    nextExperiment,
    precisionStreak,
    traceContract,
  };
}

/**
 * Returns a one-line difficulty briefing based on run history at that difficulty.
 * Example: "Avg wave 14 · 42% reach wave 20 (12 runs)"
 */
export function getDifficultyBriefing(difficulty, runHistory = []) {
  const filtered = runHistory.filter(r => r.difficulty === difficulty);
  if (filtered.length < 2) return null;
  const avgWave = Math.round(average(filtered.map(r => r.wave)) * 10) / 10;
  const highWaveCount = filtered.filter(r => (r.wave || 0) >= 20).length;
  const survivalPct = Math.round((highWaveCount / filtered.length) * 100);
  return `Avg wave ${avgWave} · ${survivalPct}% reach wave 20 (${filtered.length} runs)`;
}

/**
 * Aggregates killedByType across recent runs and returns the most frequent killer
 * if it appears 3+ times, else null.
 */
/**
 * Returns a compound one-liner comparing avg wave for a difficulty when the
 * given mutation was active vs. all other weeks. Returns null when there are
 * fewer than 2 matching runs.
 *
 * Example: "NIGHTMARE × Acid Rain — avg wave drops 38% vs non-mutation runs (3 runs)"
 */
export function getMutationDifficultyBrief(mutation, difficulty, runHistory = []) {
  if (!mutation || !difficulty) return null;
  const WEEK_MS = 7 * 24 * 3600 * 1000;
  const mutIdx = WEEKLY_MUTATIONS.findIndex(m => m.id === mutation.id);
  if (mutIdx === -1) return null;

  const diffRuns = runHistory.filter(r => r.difficulty === difficulty && r.ts);
  if (diffRuns.length < 2) return null;

  const withMut = diffRuns.filter(r => Math.floor(r.ts / WEEK_MS) % WEEKLY_MUTATIONS.length === mutIdx);
  const withoutMut = diffRuns.filter(r => Math.floor(r.ts / WEEK_MS) % WEEKLY_MUTATIONS.length !== mutIdx);

  if (withMut.length < 2) return null;

  const avgWith = average(withMut.map(r => r.wave));
  const avgWithout = withoutMut.length >= 1 ? average(withoutMut.map(r => r.wave)) : null;

  const diffLabel = difficulty.charAt(0).toUpperCase() + difficulty.slice(1).toLowerCase();
  const mutName = mutation.name || mutation.id;

  if (avgWithout !== null && avgWithout > 0) {
    const deltaPct = Math.round(((avgWith - avgWithout) / avgWithout) * 100);
    const dir = deltaPct >= 0 ? `improves ${deltaPct}%` : `drops ${Math.abs(deltaPct)}%`;
    return `${diffLabel} × ${mutName} — avg wave ${dir} vs non-mutation runs (${withMut.length} runs)`;
  }

  return `${diffLabel} × ${mutName} — avg wave ${Math.round(avgWith * 10) / 10} at this combo (${withMut.length} runs)`;
}

/**
 * Checks whether the player's current run config plausibly follows the saved
 * experiment suggestion. Lightweight keyword matching — no token spend.
 *
 * @param {object} config - { starterLoadout, firstPerkName, mode, difficulty }
 * @param {object|null} intent - { suggestion: string, ts: number } from loadExperimentIntent()
 * @returns {"matched"|"diverged"|null} — null when intent is absent or too old (>7d)
 */
export function matchesExperiment(config = {}, intent = null) {
  if (!intent?.suggestion) return null;
  const MAX_AGE_MS = 7 * 24 * 3600 * 1000;
  if (intent.ts && Date.now() - intent.ts > MAX_AGE_MS) return null;
  const s = intent.suggestion.toLowerCase();
  const { starterLoadout = "", firstPerkName = "", mode = "", difficulty = "" } = config;
  // Look for named entities in the suggestion that match the current run config
  const hasEntity = (keyword) => keyword.length > 2 && s.includes(keyword.toLowerCase());
  if (hasEntity(starterLoadout) || hasEntity(firstPerkName) || hasEntity(mode) || hasEntity(difficulty)) {
    return "matched";
  }
  // Pattern-based matches: "safe opener" → stabilizer/defense perk; "precision route" → any run
  if (s.includes("safe opener") && (hay.includes("stabilizer") || hay.includes("defense") || hay.includes("armor"))) return "matched";
  if (s.includes("precision route")) return "matched"; // any run qualifies
  if (s.includes("same seed") && mode.includes("seed")) return "matched";
  if (s.includes("normal difficulty") && difficulty === "normal") return "matched";
  if (s.includes("familiar loadout") && starterLoadout) return "matched";
  if (s.includes("commit to one build")) return "matched";
  return "diverged";
}

export function mostFrequentKiller(runHistory = []) {
  const counts = {};
  const names = {};
  for (const run of runHistory.slice(0, 10)) {
    if (!run.killedByType) continue;
    const t = String(run.killedByType);
    counts[t] = (counts[t] || 0) + 1;
    if (!names[t] && run.killedByName) names[t] = run.killedByName;
  }
  let best = null, bestCount = 0;
  for (const [type, count] of Object.entries(counts)) {
    if (count > bestCount) { best = type; bestCount = count; }
  }
  if (!best || bestCount < 3) return null;
  return { typeIndex: Number(best), name: names[best] || `Enemy #${best}`, count: bestCount };
}
