import { saveFieldReport, syncCompletedRunFact } from "../storage.js";
import { buildThreatRecommendation } from "../utils/fieldReport.js";
import { resolveRunModeFromFlags } from "./runSession.js";

function buildFactPayload(context, feedbackDifficulty = null) {
  const stats = context.stats || {};
  return {
    runToken: context.runToken,
    summarySig: context.summarySig,
    name: context.name,
    mode: resolveRunModeFromFlags(context.runFlags),
    difficulty: context.difficulty,
    seed: context.seed,
    starterLoadout: context.starterLoadout,
    score: context.score,
    kills: context.kills,
    wave: context.wave,
    durationSeconds: context.durationSeconds,
    totalDamage: context.totalDamage,
    totalShots: stats.totalShots || 0,
    totalHits: stats.totalHits || 0,
    totalCrits: stats.crits || 0,
    bossKills: stats.bossKills || 0,
    feedbackDifficulty,
  };
}

export function queueCompletedRunFact(context, feedbackDifficulty = null) {
  if (context.practiceRun || !context.runToken || !context.summarySig) {
    return Promise.resolve({ submission: "skipped" });
  }
  return syncCompletedRunFact(buildFactPayload(context, feedbackDifficulty)).catch(() => ({
    submission: "offline",
  }));
}

export async function recordPostRunFieldReport(feedback, context) {
  const mode = resolveRunModeFromFlags(context.runFlags);
  const reports = saveFieldReport({
    feedback,
    mode,
    difficulty: context.difficulty,
    score: context.score,
    kills: context.kills,
    wave: context.wave,
    runSeed: context.seed,
  });
  const recommendation = buildThreatRecommendation({
    feedback,
    recentFeedback: reports.slice(1, 4),
    currentDifficulty: context.difficulty,
    score: context.score,
    kills: context.kills,
    wave: context.wave,
    mode,
  });
  void queueCompletedRunFact(context, feedback);
  return recommendation;
}

export function applyThreatRecommendationChoice(recommendation, controls) {
  if (!recommendation) return;
  if (recommendation.kind === "difficulty") {
    controls.difficultyRef.current = recommendation.value;
    controls.setDifficulty(recommendation.value);
    return;
  }
  if (recommendation.kind !== "mode" || recommendation.value !== "zombies") return;
  controls.setZombiesMode(true);
  controls.zombiesRef.current = true;
  for (const [setter, ref] of controls.otherModes) {
    setter(false);
    ref.current = false;
  }
}
