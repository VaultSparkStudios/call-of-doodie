import {
  decodeReplayCommandTrace,
  isValidReplayCommandTrace,
  summarizeReplayCommandTrace,
} from "./replayCommandTrace.js";
import { createWaveRng } from "../gameHelpers.js";

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

// ── Derived single-contact-enemy slice (S112) ────────────────────────────────
// Stored traces carry player commands only, so the REAL enemies of a run are
// not replayable. This slice derives ONE basic contact enemy from the seed
// (same createWaveRng stream family the live game uses) and steps it with the
// game's direct-vector chase math against the reconstructed player path.
// It is deterministic evidence, not a replay of the actual fight — hence the
// "derived" coverage label. Advisory gate labeling is unchanged (DECISIONS
// 2026-07-01).

// Mirrors ENEMY_TYPES[0] "Mall Cop" at wave 1: speed 1.2 × (1 + wave*0.05),
// size 40, contact damage 10 + typeIndex*5, 30-frame player invincibility.
const CONTACT_ENEMY_SPEED = 1.2 * 1.05;
const CONTACT_ENEMY_SIZE = 40;
const CONTACT_DAMAGE = 10;
const CONTACT_INVINCIBILITY_FRAMES = 30;
const CONTACT_RADIUS_PAD = 15;

function deriveContactEnemy(seed, canvasSize) {
  const w = Number(canvasSize?.w) || 800;
  const h = Number(canvasSize?.h) || 600;
  const rng = createWaveRng(clampInt(seed, 0, 999999999, 0), 1);
  const side = Math.floor(rng() * 4);
  let x, y;
  if (side === 0) { x = rng() * w; y = -30; }
  else if (side === 1) { x = w + 30; y = rng() * h; }
  else if (side === 2) { x = rng() * w; y = h + 30; }
  else { x = -30; y = rng() * h; }
  return { x, y, side, wobble: rng() * Math.PI * 2, speed: CONTACT_ENEMY_SPEED, size: CONTACT_ENEMY_SIZE };
}

function stepContactEnemy(enemy, player) {
  const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
  enemy.x += Math.cos(angle) * enemy.speed + Math.sin(enemy.wobble) * 0.5;
  enemy.y += Math.sin(angle) * enemy.speed + Math.cos(enemy.wobble) * 0.5;
  enemy.wobble += 0.1;
}

function contactEnemySnapshot(frame, player, enemy, contactState, reason) {
  return {
    frame,
    x: round3(player.x),
    y: round3(player.y),
    ex: round3(enemy.x),
    ey: round3(enemy.y),
    enemyDistance: round3(Math.hypot(player.x - enemy.x, player.y - enemy.y)),
    contacts: contactState.events.length,
    damageTaken: contactState.damageTaken,
    reason,
  };
}

export function runDeterministicContactEnemySlice(seed, traceBodyOrTrace, {
  maxFrames = 36000,
  submitted = {},
  initialPlayer = {},
  canvasSize = {},
} = {}) {
  const trace = parseTrace(traceBodyOrTrace, submitted.traceLength, submitted.traceDigest);
  if (!isValidReplayCommandTrace(trace)) {
    return {
      ok: false,
      method: "deterministic_contact_enemy_slice_v1",
      coverage: "trace_movement_one_contact_enemy_derived",
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
  const enemy = deriveContactEnemy(seed, canvasSize);
  const derivedSpawn = { side: enemy.side, x: round3(enemy.x), y: round3(enemy.y) };
  const contactState = { events: [], damageTaken: 0, invincibleFor: 0 };
  const checkpoints = [contactEnemySnapshot(0, player, enemy, contactState, "start")];
  let movement = DIRECTION_VECTORS.neutral;
  let aimBucket = "neutral";
  let dashCooldown = 0;
  let eventIdx = 0;

  for (let frame = 1; frame <= finalFrame; frame++) {
    // Apply this frame's trace events before integrating the frame.
    while (eventIdx < events.length && Math.min(frameCap, Math.max(0, events[eventIdx].f)) <= frame) {
      const event = events[eventIdx];
      eventIdx += 1;
      if (event.a === "move") movement = directionToVector(event.v);
      if (event.a === "aim") aimBucket = event.v || "neutral";
      if (event.a === "dash" && dashCooldown <= 0) {
        advanceState(player, directionToVector(event.v || aimBucket), STEP_FRAME_BUCKET * 2, canvasSize);
        dashCooldown = 90;
      }
      checkpoints.push(contactEnemySnapshot(frame, player, enemy, contactState, `${event.a}:${event.v || "none"}`));
    }
    if (dashCooldown > 0) dashCooldown -= 1;
    advanceState(player, movement, 1, canvasSize);
    stepContactEnemy(enemy, player);
    if (contactState.invincibleFor > 0) {
      contactState.invincibleFor -= 1;
    } else if (Math.hypot(player.x - enemy.x, player.y - enemy.y) < enemy.size / 2 + CONTACT_RADIUS_PAD) {
      contactState.events.push({ frame, x: round3(player.x), y: round3(player.y) });
      contactState.damageTaken += CONTACT_DAMAGE;
      contactState.invincibleFor = CONTACT_INVINCIBILITY_FRAMES;
    }
  }

  const finalState = contactEnemySnapshot(finalFrame, player, enemy, contactState, "final");
  return {
    ok: true,
    method: "deterministic_contact_enemy_slice_v1",
    coverage: "trace_movement_one_contact_enemy_derived",
    seed: clampInt(seed, 0, 999999999, 0),
    framesSimulated: finalFrame,
    commandCount: events.length,
    derivedSpawn,
    contactCount: contactState.events.length,
    contactEvents: contactState.events.slice(0, 24),
    damageTaken: contactState.damageTaken,
    checkpoints: checkpoints.slice(0, 240),
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
  const deterministicContactEnemySlice = deterministicContract.ready
    ? runDeterministicContactEnemySlice(seed, traceBodyOrTrace, { maxFrames, submitted })
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
    deterministicContactEnemySlice,
    reason: pressureProfile.valid ? null : "invalid-trace",
  };
}



