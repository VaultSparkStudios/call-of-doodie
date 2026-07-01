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

const STEP_FRAME_BUCKET = 6;
const DIRECTION_VECTORS = {
  e: { dx: 1, dy: 0 },
  se: { dx: Math.SQRT1_2, dy: Math.SQRT1_2 },
  s: { dx: 0, dy: 1 },
  sw: { dx: -Math.SQRT1_2, dy: Math.SQRT1_2 },
  w: { dx: -1, dy: 0 },
  nw: { dx: -Math.SQRT1_2, dy: -Math.SQRT1_2 },
  n: { dx: 0, dy: -1 },
  ne: { dx: Math.SQRT1_2, dy: -Math.SQRT1_2 },
  neutral: { dx: 0, dy: 0 },
};

function round3(value) {
  return Math.round((Number(value) || 0) * 1000) / 1000;
}

function directionToVector(bucket = "neutral") {
  return DIRECTION_VECTORS[String(bucket || "neutral").toLowerCase()] || DIRECTION_VECTORS.neutral;
}

function clampPlayerState(player, canvasSize) {
  const w = Number(canvasSize?.w) || 800;
  const h = Number(canvasSize?.h) || 600;
  player.x = Math.max(20, Math.min(w - 20, player.x));
  player.y = Math.max(20, Math.min(h - 20, player.y));
  return player;
}

function advanceState(player, movement, frames, canvasSize) {
  const frameCount = clampInt(frames, 0, 36000, 0);
  if (frameCount <= 0) return player;
  player.x += movement.dx * player.speed * frameCount;
  player.y += movement.dy * player.speed * frameCount;
  return clampPlayerState(player, canvasSize);
}

function snapshot(frame, player, aimBucket, actionCounts, reason) {
  return {
    frame,
    x: round3(player.x),
    y: round3(player.y),
    aimBucket,
    actionCounts: { ...actionCounts },
    reason,
  };
}

function makeCombatState(initialCombat = {}) {
  return {
    ammo: clampInt(initialCombat.ammo, 0, 999, 12),
    maxAmmo: clampInt(initialCombat.maxAmmo, 1, 999, 12),
    reserveAmmo: clampInt(initialCombat.reserveAmmo, 0, 9999, 36),
    reloadFrames: 0,
    fireCooldown: 0,
    dashCooldown: 0,
    grenadeCooldown: 0,
    grenades: clampInt(initialCombat.grenades, 0, 99, 2),
    shotsFired: 0,
    reloadsStarted: 0,
    reloadsCompleted: 0,
    dashes: 0,
    grenadesThrown: 0,
    blockedActions: [],
  };
}

function advanceCombat(combat, frames) {
  const frameCount = clampInt(frames, 0, 36000, 0);
  if (frameCount <= 0) return combat;
  const reloadBefore = combat.reloadFrames;
  combat.reloadFrames = Math.max(0, combat.reloadFrames - frameCount);
  combat.fireCooldown = Math.max(0, combat.fireCooldown - frameCount);
  combat.dashCooldown = Math.max(0, combat.dashCooldown - frameCount);
  combat.grenadeCooldown = Math.max(0, combat.grenadeCooldown - frameCount);
  if (reloadBefore > 0 && combat.reloadFrames === 0) {
    const needed = Math.max(0, combat.maxAmmo - combat.ammo);
    const loaded = Math.min(needed, combat.reserveAmmo);
    combat.ammo += loaded;
    combat.reserveAmmo -= loaded;
    combat.reloadsCompleted += 1;
  }
  return combat;
}

function combatSnapshot(frame, player, aimBucket, combat, reason) {
  return {
    frame,
    x: round3(player.x),
    y: round3(player.y),
    aimBucket,
    ammo: combat.ammo,
    reserveAmmo: combat.reserveAmmo,
    grenades: combat.grenades,
    shotsFired: combat.shotsFired,
    reloadsCompleted: combat.reloadsCompleted,
    dashes: combat.dashes,
    grenadesThrown: combat.grenadesThrown,
    fireCooldown: combat.fireCooldown,
    dashCooldown: combat.dashCooldown,
    grenadeCooldown: combat.grenadeCooldown,
    reloadFrames: combat.reloadFrames,
    blockedActions: combat.blockedActions.slice(-6),
    reason,
  };
}

function blockCombatAction(combat, frame, action, reason) {
  combat.blockedActions.push({ frame, action, reason });
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


export function runDeterministicReplayStateStepper(seed, traceBodyOrTrace, {
  maxFrames = 36000,
  submitted = {},
  initialPlayer = {},
  canvasSize = {},
} = {}) {
  const trace = parseTrace(traceBodyOrTrace, submitted.traceLength, submitted.traceDigest);
  if (!isValidReplayCommandTrace(trace)) {
    return {
      ok: false,
      method: "deterministic_replay_state_stepper_v1",
      coverage: "movement_aim_only",
      reason: "invalid-trace",
      checkpoints: [],
      finalState: null,
    };
  }

  const events = decodeReplayCommandTrace(trace) || [];
  const frameCap = clampInt(maxFrames, STEP_FRAME_BUCKET, 36000, 36000);
  const lastEventFrame = events.at(-1)?.f ?? 0;
  const finalFrame = Math.min(frameCap, lastEventFrame + STEP_FRAME_BUCKET);
  const player = clampPlayerState({
    x: Number(initialPlayer.x) || 400,
    y: Number(initialPlayer.y) || 300,
    speed: Number(initialPlayer.speed) || 4,
  }, canvasSize);
  const actionCounts = {};
  const checkpoints = [snapshot(0, player, "neutral", actionCounts, "start")];
  let movement = DIRECTION_VECTORS.neutral;
  let aimBucket = "neutral";
  let currentFrame = 0;

  for (const event of events) {
    const eventFrame = Math.min(frameCap, Math.max(0, event.f));
    advanceState(player, movement, eventFrame - currentFrame, canvasSize);
    currentFrame = eventFrame;
    actionCounts[event.a] = (actionCounts[event.a] || 0) + 1;
    if (event.a === "move") movement = directionToVector(event.v);
    if (event.a === "aim") aimBucket = event.v || "neutral";
    checkpoints.push(snapshot(currentFrame, player, aimBucket, actionCounts, `${event.a}:${event.v || "none"}`));
  }

  advanceState(player, movement, finalFrame - currentFrame, canvasSize);
  currentFrame = finalFrame;
  const finalState = snapshot(currentFrame, player, aimBucket, actionCounts, "final");

  return {
    ok: true,
    method: "deterministic_replay_state_stepper_v1",
    coverage: "movement_aim_only",
    seed: clampInt(seed, 0, 999999999, 0),
    framesSimulated: currentFrame,
    commandCount: events.length,
    checkpoints,
    finalState,
  };
}
export function runDeterministicReplayCombatSlice(seed, traceBodyOrTrace, {
  maxFrames = 36000,
  submitted = {},
  initialPlayer = {},
  initialCombat = {},
  canvasSize = {},
} = {}) {
  const trace = parseTrace(traceBodyOrTrace, submitted.traceLength, submitted.traceDigest);
  if (!isValidReplayCommandTrace(trace)) {
    return {
      ok: false,
      method: "deterministic_replay_combat_slice_v1",
      coverage: "trace_movement_actions_no_enemies",
      reason: "invalid-trace",
      checkpoints: [],
      finalState: null,
    };
  }

  const events = decodeReplayCommandTrace(trace) || [];
  const frameCap = clampInt(maxFrames, STEP_FRAME_BUCKET, 36000, 36000);
  const lastEventFrame = events.at(-1)?.f ?? 0;
  const finalFrame = Math.min(frameCap, lastEventFrame + STEP_FRAME_BUCKET);
  const player = clampPlayerState({
    x: Number(initialPlayer.x) || 400,
    y: Number(initialPlayer.y) || 300,
    speed: Number(initialPlayer.speed) || 4,
  }, canvasSize);
  const combat = makeCombatState(initialCombat);
  const checkpoints = [combatSnapshot(0, player, "neutral", combat, "start")];
  let movement = DIRECTION_VECTORS.neutral;
  let aimBucket = "neutral";
  let currentFrame = 0;

  for (const event of events) {
    const eventFrame = Math.min(frameCap, Math.max(0, event.f));
    const elapsed = eventFrame - currentFrame;
    advanceState(player, movement, elapsed, canvasSize);
    advanceCombat(combat, elapsed);
    currentFrame = eventFrame;

    if (event.a === "move") movement = directionToVector(event.v);
    if (event.a === "aim") aimBucket = event.v || "neutral";
    if (event.a === "dash") {
      if (combat.dashCooldown > 0) {
        blockCombatAction(combat, currentFrame, "dash", "cooldown");
      } else {
        advanceState(player, directionToVector(event.v || aimBucket), STEP_FRAME_BUCKET * 2, canvasSize);
        combat.dashes += 1;
        combat.dashCooldown = 90;
      }
    }
    if (event.a === "shoot") {
      if (combat.reloadFrames > 0) blockCombatAction(combat, currentFrame, "shoot", "reloading");
      else if (combat.fireCooldown > 0) blockCombatAction(combat, currentFrame, "shoot", "cooldown");
      else if (combat.ammo <= 0) blockCombatAction(combat, currentFrame, "shoot", "empty");
      else {
        combat.ammo -= 1;
        combat.shotsFired += 1;
        combat.fireCooldown = 12;
      }
    }
    if (event.a === "reload") {
      if (combat.reloadFrames > 0) blockCombatAction(combat, currentFrame, "reload", "already-reloading");
      else if (combat.ammo >= combat.maxAmmo) blockCombatAction(combat, currentFrame, "reload", "full");
      else if (combat.reserveAmmo <= 0) blockCombatAction(combat, currentFrame, "reload", "no-reserve");
      else {
        combat.reloadFrames = 90;
        combat.reloadsStarted += 1;
      }
    }
    if (event.a === "grenade") {
      if (combat.grenadeCooldown > 0) blockCombatAction(combat, currentFrame, "grenade", "cooldown");
      else if (combat.grenades <= 0) blockCombatAction(combat, currentFrame, "grenade", "empty");
      else {
        combat.grenades -= 1;
        combat.grenadesThrown += 1;
        combat.grenadeCooldown = 180;
      }
    }

    checkpoints.push(combatSnapshot(currentFrame, player, aimBucket, combat, `${event.a}:${event.v || "none"}`));
  }

  const tailFrames = finalFrame - currentFrame;
  advanceState(player, movement, tailFrames, canvasSize);
  advanceCombat(combat, tailFrames);
  currentFrame = finalFrame;
  const finalState = combatSnapshot(currentFrame, player, aimBucket, combat, "final");

  return {
    ok: true,
    method: "deterministic_replay_combat_slice_v1",
    coverage: "trace_movement_actions_no_enemies",
    seed: clampInt(seed, 0, 999999999, 0),
    framesSimulated: currentFrame,
    commandCount: events.length,
    checkpoints,
    finalState,
  };
}

export function buildDeterministicResimInputContract({
  seed = null,
  trace = null,
  submitted = {},
} = {}) {
  const parsedTrace = parseTrace(trace, submitted.traceLength, submitted.traceDigest);
  const validTrace = isValidReplayCommandTrace(parsedTrace);
  const missing = [];
  if (seed == null || seed === "" || !Number.isFinite(Number(seed))) missing.push("seed");
  if (!parsedTrace.body) missing.push("trace.body");
  if (!parsedTrace.digest) missing.push("trace.digest");
  if (!validTrace) missing.push("validTrace");
  if (!Number.isFinite(Number(submitted.wave))) missing.push("submitted.wave");
  if (!Number.isFinite(Number(submitted.score))) missing.push("submitted.score");

  return {
    method: "deterministic_resim_contract_v0",
    ready: missing.length === 0,
    confidence: missing.length === 0 ? "contract-ready" : "missing-inputs",
    seed: seed == null || seed === "" || !Number.isFinite(Number(seed)) ? null : clampInt(seed, 0, 999999999, 0),
    traceDigest: parsedTrace.digest || "",
    commandCount: validTrace ? decodeReplayCommandTrace(parsedTrace).length : 0,
    submittedWave: Number.isFinite(Number(submitted.wave)) ? clampInt(submitted.wave, 1, 10000, 1) : null,
    submittedScore: Number.isFinite(Number(submitted.score)) ? clampInt(submitted.score, 0, 10000000, 0) : null,
    missing,
  };
}
export function runResim(seed, traceBodyOrTrace, maxFrames = 36000, submitted = {}) {
  const pressureProfile = buildReplayPressureProfile(seed, traceBodyOrTrace, maxFrames, submitted);
  const submittedWave = clampInt(submitted.wave, 1, 10000, pressureProfile.finalWave);
  const submittedScore = clampInt(submitted.score, 0, 10000000, pressureProfile.finalScore);
  const deterministicContract = buildDeterministicResimInputContract({
    seed,
    trace: traceBodyOrTrace,
    submitted,
  });
  const deterministicStepper = deterministicContract.ready
    ? runDeterministicReplayStateStepper(seed, traceBodyOrTrace, { maxFrames, submitted })
    : null;
  const deterministicCombatSlice = deterministicContract.ready
    ? runDeterministicReplayCombatSlice(seed, traceBodyOrTrace, { maxFrames, submitted })
    : null;
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
    deterministicContract,
    deterministicStepper,
    deterministicCombatSlice,
    reason: pressureProfile.valid ? null : "invalid-trace",
  };
}



