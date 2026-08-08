import { buildRunClaim } from "../utils/runSubmission.js";
import { buildStudioGameEvent } from "../utils/runIntelligence.js";

export function resolveRunModeFromFlags({
  scoreAttack = false,
  dailyChallenge = false,
  cursed = false,
  bossRush = false,
  speedrun = false,
  gauntlet = false,
  zombies = false,
} = {}) {
  if (scoreAttack) return "score_attack";
  if (dailyChallenge) return "daily_challenge";
  if (cursed) return "cursed";
  if (bossRush) return "boss_rush";
  if (speedrun) return "speedrun";
  if (gauntlet) return "gauntlet";
  if (zombies) return "zombies";
  return "standard";
}

export function readRunModeFlags(
  scoreAttackRef,
  dailyChallengeRef,
  cursedRef,
  bossRushRef,
  speedrunRef,
  gauntletRef,
  zombiesRef,
) {
  return {
    scoreAttack: Boolean(scoreAttackRef?.current),
    dailyChallenge: Boolean(dailyChallengeRef?.current),
    cursed: Boolean(cursedRef?.current),
    bossRush: Boolean(bossRushRef?.current),
    speedrun: Boolean(speedrunRef?.current),
    gauntlet: Boolean(gauntletRef?.current),
    zombies: Boolean(zombiesRef?.current),
  };
}

export function createRunStartArtifacts({
  difficulty = "normal",
  starterLoadout = "standard",
  seed = null,
  flags = {},
} = {}) {
  const mode = resolveRunModeFromFlags(flags);
  return {
    mode,
    runClaim: buildRunClaim({
      mode,
      difficulty,
      seed,
      starterLoadout,
    }),
  };
}

export function createRunHistoryEntry({
  score = 0,
  kills = 0,
  wave = 1,
  timeSeconds = 0,
  difficulty = "normal",
  flags = {},
  runSeed = null,
  modifier = null,
  killedByType = null,
  killedByName = null,
  traceEvidence = null,
  traceReceipt = null,
  integrityReceipt = null,
  performanceReceipt = null,
  ghostRecorderReceipt = null,
  pressureReceipt = null,
  damageReceipt = null,
  totalDamage = 0,
  totalShots = 0,
  totalHits = 0,
  totalCrits = 0,
  bossKills = 0,
} = {}) {
  const entry = {
    score,
    kills,
    wave,
    time: timeSeconds,
    difficulty,
    mode: resolveRunModeFromFlags(flags),
    runSeed,
    modifier,
    killedByType,
    killedByName,
    totalDamage: Math.max(0, Math.floor(Number(totalDamage) || 0)),
    totalShots: Math.max(0, Math.floor(Number(totalShots) || 0)),
    totalHits: Math.max(0, Math.floor(Number(totalHits) || 0)),
    totalCrits: Math.max(0, Math.floor(Number(totalCrits) || 0)),
    bossKills: Math.max(0, Math.floor(Number(bossKills) || 0)),
    ts: Date.now(),
  };
  if (traceEvidence) {
    entry.traceEvidence = {
      level: traceEvidence.level || traceEvidence.evidenceLevel || "none",
      count: Number(traceEvidence.count) || 0,
      durationFrames: Number(traceEvidence.durationFrames) || 0,
      weaknessReasons: Array.isArray(traceEvidence.weaknessReasons) ? traceEvidence.weaknessReasons.slice(0, 6) : [],
    };
  }
  if (traceReceipt) {
    entry.traceReceipt = {
      status: traceReceipt.status,
      label: traceReceipt.label,
      score: Number(traceReceipt.score) || 0,
      level: traceReceipt.level || traceEvidence?.level || traceEvidence?.evidenceLevel || "none",
    };
  }
  if (integrityReceipt?.onlineEligible === false) {
    entry.integrityReceipt = {
      status: "degraded",
      onlineEligible: false,
      label: integrityReceipt.label || "LOCAL ONLY · RUNTIME RECOVERY",
      faultCount: Math.max(1, Number(integrityReceipt.faultCount) || 1),
      occurrenceCount: Math.max(1, Number(integrityReceipt.occurrenceCount) || 1),
      stages: Array.isArray(integrityReceipt.stages)
        ? integrityReceipt.stages.filter(Boolean).map(String).slice(0, 8)
        : [],
      claim: "competitive-eligibility-fails-closed",
    };
  }
  if (performanceReceipt?.totalFrames > 0) {
    const totalFrames = Math.max(1, Math.floor(Number(performanceReceipt.totalFrames) || 1));
    const slowFrames = Math.min(totalFrames, Math.max(0, Math.floor(Number(performanceReceipt.slowFrames) || 0)));
    const p95Ms = Math.max(0, Number(performanceReceipt.p95Ms) || 0);
    const worstMs = Math.max(p95Ms, Number(performanceReceipt.worstMs) || 0);
    let assistActivations = Math.max(0, Math.floor(Number(performanceReceipt.assistActivations) || 0));
    const assisted = Boolean(performanceReceipt.assisted) || assistActivations > 0;
    if (assisted) assistActivations = Math.max(1, assistActivations);
    entry.performanceReceipt = {
      version: 1,
      totalFrames,
      slowFrames,
      slowPct: Math.round((slowFrames / totalFrames) * 1000) / 10,
      p95Ms,
      worstMs,
      assisted,
      assistActivations,
      label: assisted ? "PERFORMANCE ASSISTED" : "PERFORMANCE STABLE",
      claim: "observed-local-frame-timing-not-causality-or-score-validity",
    };
  }
  if (ghostRecorderReceipt?.schemaVersion === "ghost-recorder-v1" && ghostRecorderReceipt.valid === true) {
    const ghostCapacity = Math.max(1, Math.min(100000, Math.floor(Number(ghostRecorderReceipt.capacity) || 1)));
    entry.ghostRecorderReceipt = {
      schemaVersion: "ghost-recorder-v1",
      valid: true,
      capacity: ghostCapacity,
      count: Math.min(ghostCapacity, Math.max(0, Math.floor(Number(ghostRecorderReceipt.count) || 0))),
      overwrites: Math.max(0, Math.floor(Number(ghostRecorderReceipt.overwrites) || 0)),
      rejected: Math.max(0, Math.floor(Number(ghostRecorderReceipt.rejected) || 0)),
      claim: "bounded-chronological-position-samples",
    };
  }
  if (["pressure-arc-v1", "pressure-arc-v2"].includes(pressureReceipt?.schemaVersion)) {
    entry.pressureReceipt = {
      schemaVersion: pressureReceipt.schemaVersion,
      claim: pressureReceipt.schemaVersion === "pressure-arc-v2"
        ? "observed-wave-pressure-and-formation-exposure-not-causality"
        : "observed-wave-pressure-transitions-not-causality",
      deathWave: Math.max(1, Math.floor(Number(pressureReceipt.deathWave) || wave || 1)),
      collapseBand: ["light", "stable", "overrun", "unobserved"].includes(pressureReceipt.collapseBand)
        ? pressureReceipt.collapseBand
        : "unobserved",
      transitionCount: Math.min(24, Math.max(0, Math.floor(Number(pressureReceipt.transitionCount) || 0))),
      counts: {
        light: Math.max(0, Math.floor(Number(pressureReceipt.counts?.light) || 0)),
        stable: Math.max(0, Math.floor(Number(pressureReceipt.counts?.stable) || 0)),
        overrun: Math.max(0, Math.floor(Number(pressureReceipt.counts?.overrun) || 0)),
      },
      overrunShare: Math.max(0, Math.min(100, Math.floor(Number(pressureReceipt.overrunShare) || 0))),
      maxPressureRatio: Math.max(0, Math.min(9.99, Number(pressureReceipt.maxPressureRatio) || 0)),
      transitions: Array.isArray(pressureReceipt.transitions)
        ? pressureReceipt.transitions.slice(-24).map((transition) => ({
            wave: Math.max(1, Math.floor(Number(transition.wave) || 1)),
            stage: String(transition.stage || "unknown").slice(0, 24),
            band: ["light", "stable", "overrun"].includes(transition.band) ? transition.band : "stable",
            pressureRatio: Math.max(0, Math.min(9.99, Number(transition.pressureRatio) || 0)),
          }))
        : [],
    };
    if (pressureReceipt.schemaVersion === "pressure-arc-v2") {
      const formationIds = ["pincer", "escort", "flank", "surge"];
      const formationCounts = Object.fromEntries(formationIds.map((id) => [
        id,
        Math.max(0, Math.min(99999, Math.floor(Number(pressureReceipt.formationCounts?.[id]) || 0))),
      ]));
      entry.pressureReceipt.formationClaim = "observed-spawn-formation-exposure-not-cause-of-death";
      entry.pressureReceipt.formationCounts = formationCounts;
      entry.pressureReceipt.formationExposureCount = Object.values(formationCounts).reduce((sum, value) => sum + value, 0);
      entry.pressureReceipt.dominantFormation = formationIds.reduce((best, id) => (
        formationCounts[id] > (best ? formationCounts[best] : 0) ? id : best
      ), null);
      entry.pressureReceipt.formationTransitions = Array.isArray(pressureReceipt.formationTransitions)
        ? pressureReceipt.formationTransitions.slice(-24).map((transition) => ({
            wave: Math.max(1, Math.floor(Number(transition.wave) || 1)),
            stage: String(transition.stage || "unknown").slice(0, 24),
            formation: formationIds.includes(transition.formation) ? transition.formation : null,
            lane: String(transition.lane || "unknown").slice(0, 16),
            role: String(transition.role || "unknown").slice(0, 16),
          })).filter((transition) => transition.formation)
        : [];
    }
  }
  if (damageReceipt?.schemaVersion === "damage-sequence-v1") {
    entry.damageReceipt = {
      schemaVersion: "damage-sequence-v1",
      claim: "observed-final-damage-window-not-causality",
      windowFrames: Math.min(360, Math.max(1, Math.floor(Number(damageReceipt.windowFrames) || 360))),
      finalFrame: Math.max(0, Math.floor(Number(damageReceipt.finalFrame) || 0)),
      durationFrames: Math.min(360, Math.max(0, Math.floor(Number(damageReceipt.durationFrames) || 0))),
      totalDamage: Math.max(0, Number(damageReceipt.totalDamage) || 0),
      finalTwoSecondDamage: Math.max(0, Number(damageReceipt.finalTwoSecondDamage) || 0),
      hitCount: Math.min(999, Math.max(0, Math.floor(Number(damageReceipt.hitCount) || 0))),
      finishStyle: ["burst", "attrition", "mixed"].includes(damageReceipt.finishStyle) ? damageReceipt.finishStyle : "mixed",
      topSource: damageReceipt.topSource ? {
        sourceType: Number.isFinite(Number(damageReceipt.topSource.sourceType)) ? Number(damageReceipt.topSource.sourceType) : null,
        sourceName: String(damageReceipt.topSource.sourceName || "Unknown source").slice(0, 40),
        damage: Math.max(0, Number(damageReceipt.topSource.damage) || 0),
        hits: Math.min(999, Math.max(0, Math.floor(Number(damageReceipt.topSource.hits) || 0))),
      } : null,
      events: Array.isArray(damageReceipt.events) ? damageReceipt.events.slice(-12) : [],
    };
  }
  return entry;
}

export function createDeathStudioEvents({
  score = 0,
  kills = 0,
  wave = 1,
  difficulty = "normal",
  flags = {},
} = {}) {
  const mode = resolveRunModeFromFlags(flags);
  return [
    buildStudioGameEvent("first_death_wave", {
      surface: "death_screen",
      mode,
      difficulty,
      wave,
      score,
      kills,
    }),
  ];
}

export function createScoreSubmitStudioEvents({
  difficulty = "normal",
  score = 0,
  wave = 1,
  runSeed = null,
  flags = {},
  globalRank = null,
  result = {},
  eventDigest = null,
  traceEvidence = null,
} = {}) {
  const mode = resolveRunModeFromFlags(flags);
  const events = [
    buildStudioGameEvent("score_submit_result", {
      surface: "death_screen",
      mode,
      difficulty,
      score,
      wave,
      seed: runSeed,
      submission: result.submission,
      globalRank,
      traceEvidence: traceEvidence || result.traceEvidence || null,
    }),
  ];

  if (result.submission === "rejected") {
    events.push(
      buildStudioGameEvent("submission_rejected", {
        surface: "death_screen",
        mode,
        difficulty,
        score,
        wave,
        seed: runSeed,
        digestVersion: eventDigest?.v || null,
        reason: result.rejectionReason || "Score submission rejected.",
        reasons: result.rejectionReasons || [],
        traceEvidence: traceEvidence || result.traceEvidence || null,
      }),
    );
  }

  return { mode, events };
}

export function buildScoreSubmitAnalyticsPayload({
  difficulty = "normal",
  mode = "standard",
  wave = 1,
  score = 0,
  result = {},
  eventDigest = null,
  traceEvidence = null,
} = {}) {
  return {
    difficulty,
    mode,
    wave,
    score,
    submission: result.submission,
    rejected: result.submission === "rejected",
    reason: result.rejectionReason || null,
    eventDigestVersion: eventDigest?.v ?? null,
    traceEvidenceLevel: result.traceEvidence?.level || traceEvidence?.level || traceEvidence?.evidenceLevel || null,
  };
}
