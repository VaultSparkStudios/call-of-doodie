import { buildRunClaim } from "../utils/runSubmission.js";
import { buildStudioGameEvent } from "../utils/runIntelligence.js";

export function resolveRunModeFromFlags({
  scoreAttack = false,
  dailyChallenge = false,
  cursed = false,
  bossRush = false,
  speedrun = false,
  gauntlet = false,
} = {}) {
  if (scoreAttack) return "score_attack";
  if (dailyChallenge) return "daily_challenge";
  if (cursed) return "cursed";
  if (bossRush) return "boss_rush";
  if (speedrun) return "speedrun";
  if (gauntlet) return "gauntlet";
  return "standard";
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
