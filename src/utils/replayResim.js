import {
  decodeReplayCommandTrace,
  isValidReplayCommandTrace,
  summarizeReplayCommandTrace,
} from "./replayCommandTrace.js";

function clampInt(value, min, max, fallback = min) {
  const num = Number.parseInt(value, 10);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(max, Math.max(min, num));
}

function parseTrace(traceBodyOrTrace, traceLength = null, traceDigest = "") {
  if (traceBodyOrTrace && typeof traceBodyOrTrace === "object") return traceBodyOrTrace;
  const body = String(traceBodyOrTrace || "");
  return {
    v: 1,
    bucket: 6,
    count: traceLength == null ? (body ? body.split("~").filter(Boolean).length : 0) : clampInt(traceLength, 0, 240, 0),
    body,
    digest: String(traceDigest || ""),
  };
}

export function buildReplayPressureProfile(seed, traceBodyOrTrace, maxFrames = 36000, submitted = {}) {
  const trace = parseTrace(traceBodyOrTrace, submitted.traceLength, submitted.traceDigest);
  const valid = isValidReplayCommandTrace(trace);
  const events = valid ? decodeReplayCommandTrace(trace) || [] : [];
  const summary = summarizeReplayCommandTrace(valid ? trace : null);
  const frameCap = clampInt(maxFrames, 60, 36000, 36000);
  const lastFrame = Math.min(frameCap, Math.max(0, summary.lastFrame ?? 0));
  const durationSec = Math.max(1, lastFrame / 60);
  const actionPressure = (summary.actions.shoot || 0)
    + (summary.actions.grenade || 0) * 2
    + (summary.actions.dash || 0)
    + (summary.actions.perk || 0) * 3
    + (summary.actions.shop || 0) * 2
    + (summary.actions.route || 0) * 2;
  const movementPressure = (summary.actions.move || 0) + (summary.actions.aim || 0);
  const seedBias = Math.abs(clampInt(seed, 0, 999999999, 0) % 17) / 100;
  const finalWave = Math.max(1, Math.floor(durationSec / 35 + actionPressure / 18 + movementPressure / 35 + 1 + seedBias));
  const finalScore = Math.max(0, Math.floor(actionPressure * 95 + movementPressure * 22 + finalWave * 420));
  const pressureScore = actionPressure * 2 + movementPressure;
  const pressureClass = pressureScore >= 22 ? "high" : pressureScore >= 10 ? "medium" : pressureScore > 0 ? "low" : "none";
  return {
    valid,
    seed: clampInt(seed, 0, 999999999, 0),
    durationSec: Math.round(durationSec * 10) / 10,
    actionPressure,
    movementPressure,
    pressureScore,
    pressureClass,
    finalWave,
    finalScore,
    framesSimulated: lastFrame,
    commandCount: events.length,
    actions: summary.actions,
  };
}

export function runResim(seed, traceBodyOrTrace, maxFrames = 36000, submitted = {}) {
  const pressureProfile = buildReplayPressureProfile(seed, traceBodyOrTrace, maxFrames, submitted);
  const submittedWave = clampInt(submitted.wave, 1, 10000, pressureProfile.finalWave);
  const submittedScore = clampInt(submitted.score, 0, 10000000, pressureProfile.finalScore);
  const waveDrift = Math.abs(submittedWave - pressureProfile.finalWave) / Math.max(4, submittedWave);
  const scoreDrift = submittedScore > 0 ? Math.abs(submittedScore - pressureProfile.finalScore) / Math.max(2500, submittedScore) : 0;
  const driftPct = pressureProfile.valid ? Math.round(Math.max(waveDrift, scoreDrift) * 10000) / 100 : 100;

  return {
    ok: pressureProfile.valid,
    method: "heuristic_pressure_estimate",
    confidence: pressureProfile.valid ? "advisory" : "invalid",
    gate: "pressure-estimate-v1",
    seed: pressureProfile.seed,
    finalWave: pressureProfile.finalWave,
    finalScore: pressureProfile.finalScore,
    driftPct,
    framesSimulated: pressureProfile.framesSimulated,
    commandCount: pressureProfile.commandCount,
    actions: pressureProfile.actions,
    pressureProfile,
    reason: pressureProfile.valid ? null : "invalid-trace",
  };
}
