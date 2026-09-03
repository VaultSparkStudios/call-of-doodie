import { analyzeReplayCommandTrace, buildReplayProofReceipt, isValidReplayCommandTrace } from "./replayCommandTrace.js";

function cleanMode(mode) {
  return mode || "standard";
}

export function buildRunClaim({ mode = null, difficulty = "normal", seed = null, starterLoadout = "standard" } = {}) {
  return {
    mode: cleanMode(mode) === "standard" ? null : cleanMode(mode),
    difficulty,
    seed,
    starterLoadout,
  };
}

export function buildLeaderboardEntry({
  username,
  score,
  kills,
  wave,
  lastWords,
  rank,
  bestStreak,
  totalDamage,
  level,
  time,
  achievements,
  difficulty,
  starterLoadout,
  customSettings,
  inputDevice,
  seed,
  accountLevel,
  prestige,
  mode,
  runToken,
  summarySig,
  eventDigest,
  feedbackDifficulty = null,
  totalShots = 0,
  totalHits = 0,
  bossKills = 0,
  totalCrits = 0,
} = {}) {
  const claim = buildRunClaim({ mode, difficulty, seed, starterLoadout });
  return {
    name: username,
    score,
    kills,
    wave,
    lastWords,
    rank,
    bestStreak,
    totalDamage,
    level,
    time,
    achievements,
    difficulty: claim.difficulty,
    starterLoadout: claim.starterLoadout,
    customSettings,
    inputDevice,
    seed: claim.seed,
    accountLevel,
    prestige,
    mode: claim.mode ?? undefined,
    runToken,
    summarySig,
    eventDigest,
    feedbackDifficulty,
    totalShots,
    totalHits,
    bossKills,
    totalCrits,
  };
}

export function buildSessionSubmission({
  username,
  score,
  kills,
  wave,
  lastWords,
  rank,
  bestStreak,
  totalDamage,
  level,
  time,
  achievements,
  difficulty,
  starterLoadout,
  customSettings,
  inputDevice,
  seed,
  accountLevel,
  prestige,
  mode,
  runToken,
  summarySig,
  eventDigest,
  commandTrace = null,
  ghostPath = "",
  feedbackDifficulty = null,
  totalShots = 0,
  totalHits = 0,
  bossKills = 0,
  totalCrits = 0,
} = {}) {
  const validTrace = isValidReplayCommandTrace(commandTrace) ? commandTrace : null;
  const traceAnalysis = validTrace ? analyzeReplayCommandTrace(validTrace) : null;
  const traceDigest = validTrace?.digest || null;
  const traceLength = validTrace?.count ?? 0;
  const traceBody = typeof validTrace?.body === "string" ? validTrace.body : "";
  const entry = buildLeaderboardEntry({
    username,
    score,
    kills,
    wave,
    lastWords,
    rank,
    bestStreak,
    totalDamage,
    level,
    time,
    achievements,
    difficulty,
    starterLoadout,
    customSettings,
    inputDevice,
    seed,
    accountLevel,
    prestige,
    mode,
    runToken,
    summarySig,
    eventDigest,
    feedbackDifficulty,
    totalShots,
    totalHits,
    bossKills,
    totalCrits,
  });
  if (traceDigest) entry.traceDigest = traceDigest;
  if (traceLength > 0) entry.traceLength = traceLength;
  if (traceBody) entry.traceBody = traceBody;
  if (typeof ghostPath === "string" && ghostPath && ghostPath.length <= 8192) entry.ghostPath = ghostPath;
  if (traceAnalysis) {
    entry.traceEvidence = {
      level: traceAnalysis.evidenceLevel,
      count: traceAnalysis.count,
      durationFrames: traceAnalysis.durationFrames,
      movementCount: traceAnalysis.movementCount,
      aimCount: traceAnalysis.aimCount,
      shootCount: traceAnalysis.shootCount,
      interactionCount: traceAnalysis.interactionCount,
      weaknessReasons: traceAnalysis.weaknessReasons.slice(0, 6),
    };
    entry.traceReceipt = buildReplayProofReceipt(entry.traceEvidence);
  }
  return entry;
}
