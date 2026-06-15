const VALID_TRACE_ACTIONS = new Set(["move", "aim", "shoot", "reload", "dash", "grenade", "perk", "route", "shop", "swap", "pause"]);
const MAX_TRACE_BODY_BYTES = 10000;
const encoder = new TextEncoder();

function checksum(serialized) {
  let hash = 2166136261;
  for (let i = 0; i < serialized.length; i++) {
    hash ^= serialized.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).toUpperCase().padStart(8, "0");
}

function clampInt(value, min, max, fallback = min) {
  const num = Number.parseInt(value, 10);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(max, Math.max(min, num));
}

export function collectTraceBodyFailures(traceDigest, traceLength, traceBody) {
  const reasons = [];
  if (!traceBody) return reasons;
  if (!/^[a-z0-9._:~-]+$/i.test(traceBody)) reasons.push("traceBody malformed");
  if (encoder.encode(traceBody).length > MAX_TRACE_BODY_BYTES) reasons.push("traceBody exceeds byte budget");
  const parts = traceBody.split("~").filter(Boolean);
  if (parts.length !== traceLength) reasons.push("traceBody count mismatch");
  if (traceDigest && checksum(traceBody).toUpperCase() !== traceDigest.toUpperCase()) {
    reasons.push("traceBody digest mismatch");
  }
  for (const part of parts) {
    const [frame, action] = part.split(".");
    const parsedFrame = Number.parseInt(frame || "", 36);
    if (!Number.isFinite(parsedFrame) || parsedFrame < 0) {
      reasons.push("traceBody frame malformed");
      break;
    }
    if (!VALID_TRACE_ACTIONS.has(action || "")) {
      reasons.push("traceBody action malformed");
      break;
    }
  }
  return reasons;
}

export function analyzeTraceEvidence(traceBody) {
  const weaknessReasons = [];
  const parts = traceBody ? traceBody.split("~").filter(Boolean) : [];
  const actions = {};
  let firstFrame = null;
  let lastFrame = null;

  for (const part of parts) {
    const [frame, action] = part.split(".");
    const parsedFrame = Number.parseInt(frame || "", 36);
    if (!Number.isFinite(parsedFrame)) continue;
    if (firstFrame == null) firstFrame = parsedFrame;
    lastFrame = parsedFrame;
    actions[action || ""] = (actions[action || ""] || 0) + 1;
  }

  const durationFrames = firstFrame != null && lastFrame != null ? Math.max(0, lastFrame - firstFrame) : 0;
  const movementCount = actions.move || 0;
  const aimCount = actions.aim || 0;
  const shootCount = actions.shoot || 0;
  const interactionCount = ["shoot", "reload", "dash", "grenade", "perk", "route", "shop", "swap", "pause"]
    .reduce((total, action) => total + (actions[action] || 0), 0);

  if (parts.length === 0) weaknessReasons.push("no-events");
  if (parts.length > 0 && parts.length < 3) weaknessReasons.push("too-few-events");
  if (durationFrames > 0 && durationFrames < 60) weaknessReasons.push("short-duration");
  if (movementCount < 2) weaknessReasons.push("low-movement-evidence");
  if (aimCount < 1 && shootCount > 0) weaknessReasons.push("missing-aim-evidence");
  if (interactionCount < 2) weaknessReasons.push("low-interaction-evidence");

  let level = "none";
  if (parts.length > 0) level = "weak";
  if (parts.length >= 3 && interactionCount >= 1 && durationFrames >= 24) level = "basic";
  if (parts.length >= 6 && durationFrames >= 60 && movementCount >= 2 && aimCount >= 1 && interactionCount >= 2) {
    level = "rich";
  }

  return { level, weaknessReasons };
}

export function buildTracePressureReceipt(req, traceBody, traceLength) {
  const parts = traceBody ? traceBody.split("~").filter(Boolean) : [];
  const actions = {};
  let lastFrame = 0;
  for (const part of parts) {
    const [frame, action] = part.split(".");
    const parsedFrame = Number.parseInt(frame || "", 36);
    if (Number.isFinite(parsedFrame)) lastFrame = Math.max(lastFrame, parsedFrame);
    actions[action || ""] = (actions[action || ""] || 0) + 1;
  }
  const durationSec = Math.max(1, lastFrame / 60);
  const actionPressure = (actions.shoot || 0)
    + (actions.grenade || 0) * 2
    + (actions.dash || 0)
    + (actions.perk || 0) * 3
    + (actions.shop || 0) * 2
    + (actions.route || 0) * 2;
  const movementPressure = (actions.move || 0) + (actions.aim || 0);
  const seedBias = Math.abs(clampInt(req?.seed, 0, 999999999, 0) % 17) / 100;
  const finalWave = Math.max(1, Math.floor(durationSec / 35 + actionPressure / 18 + movementPressure / 35 + 1 + seedBias));
  const finalScore = Math.max(0, Math.floor(actionPressure * 95 + movementPressure * 22 + finalWave * 420));
  const submittedWave = Math.max(1, Math.floor(Number(req?.wave || finalWave)));
  const submittedScore = Math.max(0, Math.floor(Number(req?.score || finalScore)));
  const waveDrift = Math.abs(submittedWave - finalWave) / Math.max(4, submittedWave);
  const scoreDrift = submittedScore > 0 ? Math.abs(submittedScore - finalScore) / Math.max(2500, submittedScore) : 0;
  const pressureScore = actionPressure * 2 + movementPressure;
  const pressureClass = pressureScore >= 22 ? "high" : pressureScore >= 10 ? "medium" : pressureScore > 0 ? "low" : "none";

  return {
    method: "heuristic_pressure_estimate",
    confidence: "advisory",
    gate: "pressure-estimate-v1",
    finalWave,
    finalScore,
    driftPct: Math.round(Math.max(waveDrift, scoreDrift) * 10000) / 100,
    commandCount: traceLength || parts.length,
    pressureClass,
    pressureScore,
    actionPressure,
    movementPressure,
  };
}
