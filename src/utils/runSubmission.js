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
} = {}) {
  const traceDigest = commandTrace?.digest || null;
  const traceLength = commandTrace?.count ?? 0;
  const traceBody = typeof commandTrace?.body === "string" ? commandTrace.body : "";
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
  });
  if (traceDigest) entry.traceDigest = traceDigest;
  if (traceLength > 0) entry.traceLength = traceLength;
  if (traceBody) entry.traceBody = traceBody;
  return entry;
}
