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
} = {}) {
  return {
    score,
    kills,
    wave,
    time: timeSeconds,
    difficulty,
    mode: resolveRunModeFromFlags(flags),
    runSeed,
    modifier,
    ts: Date.now(),
  };
}

export function createDeathStudioEvents({
  score = 0,
  kills = 0,
  wave = 1,
  difficulty = "normal",
  flags = {},
  runSeed = null,
} = {}) {
  const mode = resolveRunModeFromFlags(flags);
  return [
    buildStudioGameEvent("weekly_contract_progress", {
      surface: "death_screen",
      contractId: runSeed ? "seeded_progress" : "baseline_progress",
      progressLabel: runSeed
        ? `Seed #${runSeed} banked at wave ${wave}`
        : `Wave ${wave} baseline recorded`,
      seed: runSeed || null,
      mode,
      score,
      wave,
    }),
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
      }),
    );
  }

  return { mode, events };
}
