import { loadFieldReports, loadStudioGameEvents, requestStudioEventSync, saveFieldReport, saveStudioGameEvent, syncCompletedRunFact } from "../storage.js";
import { buildThreatRecommendation, cleanFieldReportComment, fieldReportDurationBucket, normalizeFieldReport, normalizeFieldReportReason } from "../utils/fieldReport.js";
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
  const structured = feedback && typeof feedback === "object";
  const response = structured ? feedback : { feedback };
  const sentiment = normalizeFieldReport(response.feedback);
  if (!sentiment) return structured ? { status: "invalid", recommendation: null, reportId: null } : null;
  const mode = context.modeId || resolveRunModeFromFlags(context.runFlags);
  const reportId = /^[a-f0-9-]{36}$/i.test(String(response.reportId || "")) ? response.reportId : null;
  const reports = saveFieldReport({
    reportId,
    feedback: sentiment,
    mode,
    difficulty: context.difficulty,
    score: context.score,
    kills: context.kills,
    wave: context.wave,
    runSeed: context.seed,
    reason: response.reason,
    comment: cleanFieldReportComment(response.comment),
    consent: response.consent === true,
    inputDevice: context.inputDevice,
    durationBucket: fieldReportDurationBucket(context.durationSeconds),
    version: context.version,
  });
  const saved = reports[0];
  const recommendation = buildThreatRecommendation({
    feedback: sentiment,
    recentFeedback: reports.slice(1, 4),
    currentDifficulty: context.difficulty,
    score: context.score,
    kills: context.kills,
    wave: context.wave,
    mode,
  });
  if (!structured) {
    void queueCompletedRunFact(context, sentiment);
    return recommendation;
  }
  if (!saved || !loadFieldReports(50).some((entry) => entry.reportId === saved.reportId)) {
    return { status: "storage-error", recommendation: null, reportId: null };
  }
  if (response.consent !== true) return { status: "saved-on-device", recommendation, reportId: saved.reportId };
  if (!loadStudioGameEvents().some((event) => event.clientEventId === saved.reportId)) {
    saveStudioGameEvent({
      clientEventId: saved.reportId,
      type: "field_report_v2",
      category: "feedback",
      surface: "death_screen",
      summary: "Player-chosen post-run report category",
      payload: {
        sentiment,
        reason: normalizeFieldReportReason(response.reason),
        mode,
        difficulty: context.difficulty,
        inputDevice: saved.inputDevice,
        durationBucket: saved.durationBucket,
        version: saved.version,
      },
    });
  }
  const [factResult, eventResult] = await Promise.all([
    queueCompletedRunFact(context, sentiment),
    requestStudioEventSync({ limit: 25, force: true }),
  ]);
  const sent = eventResult?.ok && loadStudioGameEvents().some((event) => event.clientEventId === saved.reportId && event.syncStatus === "synced");
  return {
    status: sent ? "sent" : factResult?.submission === "synced" ? "sent-category-only" : "saved-pending-sync",
    recommendation,
    reportId: saved.reportId,
  };
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
