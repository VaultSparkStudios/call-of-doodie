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

const CONTACT_ENEMY_SPEED = 1.2 * 1.05;
const CONTACT_ENEMY_SIZE = 40;
const CONTACT_DAMAGE = 10;
const CONTACT_INVINCIBILITY_FRAMES = 30;
const CONTACT_RADIUS_PAD = 15;

function round3(value) {
  return Math.round((Number(value) || 0) * 1000) / 1000;
}

function directionToVector(bucket = "neutral") {
  return DIRECTION_VECTORS[String(bucket || "neutral").toLowerCase()] || DIRECTION_VECTORS.neutral;
}

function decodeTraceBody(traceBody) {
  if (!traceBody) return [];
  return traceBody.split("~").filter(Boolean).map((part) => {
    const [frame, action, value = ""] = part.split(".");
    return { f: Number.parseInt(frame || "", 36), a: action, v: value };
  }).filter((event) => Number.isFinite(event.f) && VALID_TRACE_ACTIONS.has(event.a || ""));
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

function makeCombatState() {
  return {
    ammo: 12,
    maxAmmo: 12,
    reserveAmmo: 36,
    reloadFrames: 0,
    fireCooldown: 0,
    dashCooldown: 0,
    grenadeCooldown: 0,
    grenades: 2,
    shotsFired: 0,
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

function createWaveRng(seed, wave) {
  let h = (Math.imul(((seed >>> 0) || 1) ^ 0x9e3779b9, 0x85ebca6b) ^
           Math.imul(((wave >>> 0) + 0x6d2b79f5) | 0, 0xc2b2ae35)) >>> 0;
  return function waveRng() {
    h = (h + 0x6d2b79f5) >>> 0;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

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

function runDeterministicEdgeSlices(req, traceBody, traceLength) {
  const events = decodeTraceBody(traceBody);
  const seed = clampInt(req?.seed, 0, 999999999, 0);
  const frameCap = 36000;
  const lastEventFrame = events.at(-1)?.f ?? 0;
  const finalFrame = Math.min(frameCap, lastEventFrame + STEP_FRAME_BUCKET);
  const canvasSize = { w: 800, h: 600 };
  const player = clampPlayerState({ x: 400, y: 300, speed: 4 }, canvasSize);
  const combat = makeCombatState();
  const enemy = deriveContactEnemy(seed, canvasSize);
  const derivedSpawn = { side: enemy.side, x: round3(enemy.x), y: round3(enemy.y) };
  const contactState = { events: [], damageTaken: 0, invincibleFor: 0 };
  let movement = DIRECTION_VECTORS.neutral;
  let aimBucket = "neutral";
  let currentFrame = 0;
  let eventIdx = 0;

  for (let frame = 1; frame <= finalFrame; frame++) {
    while (eventIdx < events.length && Math.min(frameCap, Math.max(0, events[eventIdx].f)) <= frame) {
      const event = events[eventIdx];
      const eventFrame = Math.min(frameCap, Math.max(0, event.f));
      const elapsed = eventFrame - currentFrame;
      advanceCombat(combat, elapsed);
      currentFrame = eventFrame;
      eventIdx += 1;

      if (event.a === "move") movement = directionToVector(event.v);
      if (event.a === "aim") aimBucket = event.v || "neutral";
      if (event.a === "dash") {
        if (combat.dashCooldown <= 0) {
          advanceState(player, directionToVector(event.v || aimBucket), STEP_FRAME_BUCKET * 2, canvasSize);
          combat.dashes += 1;
          combat.dashCooldown = 90;
        } else {
          combat.blockedActions.push({ frame: currentFrame, action: "dash", reason: "cooldown" });
        }
      }
      if (event.a === "shoot") {
        if (combat.reloadFrames > 0) combat.blockedActions.push({ frame: currentFrame, action: "shoot", reason: "reloading" });
        else if (combat.fireCooldown > 0) combat.blockedActions.push({ frame: currentFrame, action: "shoot", reason: "cooldown" });
        else if (combat.ammo <= 0) combat.blockedActions.push({ frame: currentFrame, action: "shoot", reason: "empty" });
        else {
          combat.ammo -= 1;
          combat.shotsFired += 1;
          combat.fireCooldown = 12;
        }
      }
      if (event.a === "reload") {
        if (combat.reloadFrames > 0) combat.blockedActions.push({ frame: currentFrame, action: "reload", reason: "already-reloading" });
        else if (combat.ammo >= combat.maxAmmo) combat.blockedActions.push({ frame: currentFrame, action: "reload", reason: "full" });
        else if (combat.reserveAmmo <= 0) combat.blockedActions.push({ frame: currentFrame, action: "reload", reason: "no-reserve" });
        else combat.reloadFrames = 90;
      }
      if (event.a === "grenade") {
        if (combat.grenadeCooldown > 0) combat.blockedActions.push({ frame: currentFrame, action: "grenade", reason: "cooldown" });
        else if (combat.grenades <= 0) combat.blockedActions.push({ frame: currentFrame, action: "grenade", reason: "empty" });
        else {
          combat.grenades -= 1;
          combat.grenadesThrown += 1;
          combat.grenadeCooldown = 180;
        }
      }
    }
    if (combat.dashCooldown > 0) combat.dashCooldown -= 1;
    advanceState(player, movement, 1, canvasSize);
    advanceCombat(combat, 1);
    stepContactEnemy(enemy, player);
    if (contactState.invincibleFor > 0) {
      contactState.invincibleFor -= 1;
    } else if (Math.hypot(player.x - enemy.x, player.y - enemy.y) < enemy.size / 2 + CONTACT_RADIUS_PAD) {
      contactState.events.push({ frame, x: round3(player.x), y: round3(player.y) });
      contactState.damageTaken += CONTACT_DAMAGE;
      contactState.invincibleFor = CONTACT_INVINCIBILITY_FRAMES;
    }
  }

  return {
    contract: {
      method: "deterministic_resim_contract_v0",
      ready: true,
      confidence: "contract-ready",
      seed,
      commandCount: traceLength || events.length,
      submittedWave: Number.isFinite(Number(req?.wave)) ? clampInt(req.wave, 1, 10000, 1) : null,
      submittedScore: Number.isFinite(Number(req?.score)) ? clampInt(req.score, 0, 10000000, 0) : null,
    },
    stepper: {
      ok: true,
      method: "deterministic_replay_state_stepper_v1",
      coverage: "movement_aim_only",
      framesSimulated: finalFrame,
      finalState: { frame: finalFrame, x: round3(player.x), y: round3(player.y), aimBucket },
    },
    combatSlice: {
      ok: true,
      method: "deterministic_replay_combat_slice_v1",
      coverage: "trace_movement_actions_no_enemies",
      shotsFired: combat.shotsFired,
      reloadsCompleted: combat.reloadsCompleted,
      dashes: combat.dashes,
      grenadesThrown: combat.grenadesThrown,
      blockedActionCount: combat.blockedActions.length,
    },
    contactEnemySlice: {
      ok: true,
      method: "deterministic_contact_enemy_slice_v1",
      coverage: "trace_movement_one_contact_enemy_derived",
      derivedSpawn,
      contactCount: contactState.events.length,
      damageTaken: contactState.damageTaken,
    },
  };
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
    deterministicSlices: runDeterministicEdgeSlices(req, traceBody, traceLength),
  };
}
