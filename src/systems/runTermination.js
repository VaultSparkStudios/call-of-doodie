export const RUN_PHASE = Object.freeze({
  PLAYING: "playing",
  ENDING: "ending",
  ENDED: "ended",
});

export function resolveRunEndAttempt({
  phase = RUN_PHASE.PLAYING,
  cause = "lethal_damage",
  allowRecovery = cause === "lethal_damage",
  metaLastStandAvailable = false,
  metaLastStandUsed = false,
  extraLives = 0,
} = {}) {
  if (phase === RUN_PHASE.ENDING || phase === RUN_PHASE.ENDED) {
    return {
      kind: "duplicate",
      phase,
      cause,
      claim: "run-end-side-effects-already-started",
    };
  }

  if (allowRecovery && metaLastStandAvailable && !metaLastStandUsed) {
    return {
      kind: "recover",
      recovery: "meta-last-stand",
      health: 50,
      invincibleFrames: 120,
      phase: RUN_PHASE.PLAYING,
      cause,
    };
  }

  if (allowRecovery && Number(extraLives) > 0) {
    return {
      kind: "recover",
      recovery: "guardian-angel",
      remainingExtraLives: Math.max(0, Number(extraLives) - 1),
      invincibleFrames: 120,
      phase: RUN_PHASE.PLAYING,
      cause,
    };
  }

  return {
    kind: "terminal",
    phase: RUN_PHASE.ENDING,
    cause,
    recoveryBypassed: !allowRecovery,
    claim: "terminal-run-end-claimed-once-before-finalizers",
  };
}
