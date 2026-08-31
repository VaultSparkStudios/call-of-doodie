import { buildStudioGameEvent } from "../utils/runIntelligence.js";
import { buildRunRngFairnessReceipt } from "./runRng.js";
import { buildWavePlanReceipt } from "./wavePlanReceipt.js";

export function buildRunTheFixContract({
  debrief = {},
  postRunIntel = {},
  collapseCoaching = null,
  nextRunDrill = {},
  runSeed = 0,
  wave = 1,
  rematchWave = null,
} = {}) {
  const nextContract = debrief?.nextRunContract || {};
  const evidence = collapseCoaching?.contributingFactor || collapseCoaching?.primary || null;
  const diagnosis = evidence?.statement
    || debrief?.collapseReason
    || String(postRunIntel?.cause || "pressure breakdown").replace(/_/g, " ");
  const target = nextContract.target || nextRunDrill.detail || "Survive one more wave with one deliberate adjustment.";
  const proof = nextContract.proof || "Win condition: finish the target and bank the result.";
  const seeded = Number(runSeed) > 0;
  const canRematch = seeded && Number(rematchWave) > 0 && Number(wave) > 1;

  let action = { type: "new_run", label: nextRunDrill.cta || "RUN THE FIX" };
  if (canRematch) {
    action = {
      type: "rematch",
      label: `RUN THE FIX · REMATCH W${rematchWave}`,
      seed: Number(runSeed),
      startWave: Number(rematchWave),
    };
  } else if (seeded && nextRunDrill.action === "replay_seed") {
    action = {
      type: "replay_seed",
      label: nextRunDrill.cta || `REPLAY #${runSeed}`,
      seed: Number(runSeed),
    };
  }

  return {
    diagnosis,
    evidenceLabel: evidence?.label || "COACHING HYPOTHESIS",
    evidenceLevel: evidence?.evidenceLevel || "hypothesis",
    focus: nextContract.focus || nextRunDrill.title || "Stabilize the opener",
    target,
    proof,
    action,
    secondaryDisclosureLabel: "OPEN RUN ANALYSIS",
    focusOrder: ["run_the_fix", "secondary_analysis", "more_run_actions"],
  };
}

export function buildDeathScreenProps({
  score,
  kills,
  deaths,
  wave,
  level,
  bestStreak,
  timeSurvived,
  totalDamage,
  stats = {},
  deathMessage,
  difficulty,
  runSeed,
  runModifier,
  runModifiers = [],
  achievementsUnlocked,
  activePerks,
  missionsSummary,
  leaderboard,
  lbLoading,
  lbHasMore,
  onLoadMore,
  username,
  DIFFICULTIES,
  onStartGame,
  onMenu,
  onRefreshLeaderboard,
  onSubmitScore,
  onSaveFieldReport,
  onApplyThreatRecommendation,
  highlightGifUrl,
  gifEncoding,
  fmtTime,
  gamepadConnected,
  controllerType,
  weaponKills,
  starterLoadout,
  traceEvidence,
  performanceReceipt = null,
  gs = null,
  proximityRivals,
  bossKillCount,
  weaponMilestones,
  cosmeticUnlocks,
  objectivesSummary,
  scoreAttackMode,
  dailyChallengeMode,
  bossRushMode,
  cursedRunMode,
  speedrunMode,
  gauntletMode,
  zombiesMode,
  challengeVsScore,
  challengeVsName,
  onInstallApp,
  experimentMatched,
  peakMoment,
  communityChokeWaves,
} = {}) {
  return {
    score,
    kills,
    deaths,
    wave,
    level,
    bestStreak,
    timeSurvived,
    totalDamage,
    crits: stats.crits,
    grenades: stats.grenades,
    noHitWaves: stats.noHitWaves || 0,
    grenadeKills: stats.grenadeKills || 0,
    deathMessage,
    difficulty,
    runSeed,
    runModifier: runModifiers.find((modifier) => modifier.id === runModifier) || null,
    achievementsUnlocked,
    activePerks,
    missionsSummary,
    leaderboard,
    lbLoading,
    lbHasMore,
    onLoadMore,
    username,
    DIFFICULTIES,
    onStartGame,
    onMenu,
    onRefreshLeaderboard,
    onSubmitScore,
    onSaveFieldReport,
    onApplyThreatRecommendation,
    highlightGifUrl,
    gifEncoding,
    fmtTime,
    gamepadConnected,
    controllerType,
    weaponKills,
    bestPrecisionStreak: stats.bestPrecisionStreak || 0,
    starterLoadout,
    traceEvidence,
    performanceReceipt,
    precisionPeakFrame: gs?._precisionPeakFrame || 0,
    precisionPeakStreak: gs?._precisionPeakStreak || 0,
    proximityRivals: proximityRivals || gs?.proximityRivals || [],
    nearDeathEvents: gs?._nearDeathEvents || [],
    flowStateFired: gs?._flowStateFiredCount || 0,
    bossKillCount,
    weaponMilestones,
    cosmeticUnlocks,
    objectivesSummary,
    scoreAttackMode,
    dailyChallengeMode,
    bossRushMode,
    cursedRunMode,
    speedrunMode,
    gauntletMode,
    zombiesMode,
    playerSkin: gs?.playerSkin || "",
    vsScore: challengeVsScore,
    vsName: challengeVsName,
    ghostKey: gs?._ghostKey,
    onInstallApp,
    experimentMatched,
    peakMoment,
    waveScoreLog: gs?._waveScoreLog || [],
    communityChokeWaves,
    gsSnapshot: gs,
    fairnessReceipt: buildRunRngFairnessReceipt(gs),
    wavePlanReceipt: buildWavePlanReceipt(gs?.wavePlanLedger),
  };
}

export function buildDeathCoachTelemetry({
  postRunTelemetry = {},
  eventDigest = null,
  runCoach = {},
  collapseCoaching = null,
  insightAgentProjection = null,
} = {}) {
  const chokeWarning = runCoach?.brain?.chokeWarning || null;
  return {
    ...postRunTelemetry,
    digestVersion: eventDigest?.v ?? null,
    insightAgentProjection,
    coaching: {
      weaponTipShown: Boolean(runCoach.weaponTip),
      weaponMismatchShown: Boolean(runCoach.weaponDeathTip),
      precisionTipShown: Boolean(runCoach.precisionTip),
      crossRunPatternShown: Boolean(runCoach.crossRunTip),
      enemyLabShown: Boolean(runCoach.enemyLab),
      chokeWarningShown: Boolean(chokeWarning),
      collapse: collapseCoaching?.telemetry || null,
    },
    weaponDeathTip: runCoach.weaponDeathTip || null,
    chokeWarning: chokeWarning
      ? {
          wave: chokeWarning.wave ?? null,
          tip: chokeWarning.tip || "",
        }
      : null,
  };
}

export function buildDebriefStudioEventPlan({
  debriefTelemetry = {},
  nextRunDrill = {},
  contractProgress = null,
  rivalryResult = null,
  mode = "standard",
  score = 0,
  wave = 1,
} = {}) {
  const debriefEventKey = `${mode}:${score}:${wave}:${nextRunDrill.id || "none"}:${debriefTelemetry.cause || "unknown"}`;
  const debriefEvent = buildStudioGameEvent("debrief_intelligence", debriefTelemetry);
  const events = [
    debriefEvent,
    buildStudioGameEvent("next_run_drill_shown", {
      surface: "death_screen",
      drillId: nextRunDrill.id,
      action: nextRunDrill.action,
      seed: nextRunDrill.seed || null,
      mode,
      score,
      wave,
    }),
  ];

  let contractProgressKey = null;
  if (contractProgress) {
    contractProgressKey = `${contractProgress.contractId}:${contractProgress.seed ?? "none"}:${contractProgress.score}:${contractProgress.wave}`;
    events.push(buildStudioGameEvent("weekly_contract_progress", {
      surface: "death_screen",
      ...contractProgress,
    }));
  }

  if (rivalryResult) {
    events.push(buildStudioGameEvent("rivalry_result", {
      surface: "death_screen",
      ...rivalryResult,
    }));
  }

  return {
    events,
    debriefEvent,
    debriefEventKey,
    contractProgressKey,
    analyticsPayload: {
      ...debriefTelemetry,
      studioEvent: debriefEvent,
    },
  };
}

export function buildScoreSubmitFallbackStudioEvent({
  mode = "standard",
  difficulty = "normal",
  score = 0,
  wave = 1,
  runSeed = null,
  submission = "local",
} = {}) {
  return buildStudioGameEvent("score_submit_result", {
    surface: "death_screen",
    mode,
    difficulty,
    score,
    wave,
    seed: runSeed,
    submission,
  });
}
