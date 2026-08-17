const PLAYER_MUSIC_VIBES = new Set(["chill", "action", "intense", "retro", "spooky"]);

export const OPERATION_ENCOUNTER_SCORE = Object.freeze({
  BREACH: "intense",
  HOLD: "action",
  ESCORT: "chill",
  HUNT: "spooky",
  SABOTAGE: "intense",
  ESCAPE: "intense",
  BOSS: null,
});

export const OPERATION_OBJECTIVE_MOTIFS = Object.freeze({
  BREACH: Object.freeze({ notes: Object.freeze([196, 294, 392]), type: "sawtooth", duration: 0.07, volume: 0.055, gap: 0.035, accentNoise: 0.025 }),
  HOLD: Object.freeze({ notes: Object.freeze([220, 220, 330]), type: "square", duration: 0.065, volume: 0.05, gap: 0.04, accentNoise: 0.015 }),
  ESCORT: Object.freeze({ notes: Object.freeze([262, 330, 392]), type: "triangle", duration: 0.08, volume: 0.052, gap: 0.045, accentNoise: 0 }),
  HUNT: Object.freeze({ notes: Object.freeze([440, 370, 311]), type: "sine", duration: 0.09, volume: 0.045, gap: 0.05, accentNoise: 0 }),
  SABOTAGE: Object.freeze({ notes: Object.freeze([165, 247, 370]), type: "sawtooth", duration: 0.06, volume: 0.06, gap: 0.03, accentNoise: 0.035 }),
  ESCAPE: Object.freeze({ notes: Object.freeze([330, 440, 660]), type: "triangle", duration: 0.07, volume: 0.06, gap: 0.035, accentNoise: 0.018 }),
  BOSS: Object.freeze({ notes: Object.freeze([110, 165, 220]), type: "sawtooth", duration: 0.09, volume: 0.065, gap: 0.04, accentNoise: 0.04 }),
});

function verbOf(value) {
  return String(value || "").trim().toUpperCase();
}

export function normalizePlayerMusicVibe(value) {
  const vibe = String(value || "action").trim().toLowerCase();
  return PLAYER_MUSIC_VIBES.has(vibe) ? vibe : "action";
}

export function resolveOperationEncounterScore(verb, playerVibe) {
  const normalizedVerb = verbOf(verb);
  const normalizedPlayerVibe = normalizePlayerMusicVibe(playerVibe);
  if (!Object.hasOwn(OPERATION_ENCOUNTER_SCORE, normalizedVerb)) {
    return { verb: normalizedVerb || null, playerVibe: normalizedPlayerVibe, targetVibe: null, reasonCode: "UNKNOWN_ENCOUNTER" };
  }
  if (normalizedPlayerVibe !== "action") {
    return { verb: normalizedVerb, playerVibe: normalizedPlayerVibe, targetVibe: null, reasonCode: "PLAYER_VIBE_PRESERVED" };
  }
  const targetVibe = OPERATION_ENCOUNTER_SCORE[normalizedVerb];
  return {
    verb: normalizedVerb,
    playerVibe: normalizedPlayerVibe,
    targetVibe,
    reasonCode: targetVibe ? "OPERATION_SCORE_APPLIED" : "BOSS_SCORE_OWNED_BY_RUNTIME",
  };
}

export function getOperationObjectiveMotif(verb) {
  return OPERATION_OBJECTIVE_MOTIFS[verbOf(verb)] || null;
}

export function buildOperationReinforcementCue(reinforcementCount = 1) {
  const count = Math.max(1, Math.min(6, Math.floor(Number(reinforcementCount) || 1)));
  const startFrequency = 230 - count * 12;
  return Object.freeze({
    count,
    startFrequency,
    endFrequency: Math.max(72, startFrequency - 92),
    duration: 0.16 + count * 0.015,
    volume: Math.min(0.085, 0.052 + count * 0.005),
  });
}
