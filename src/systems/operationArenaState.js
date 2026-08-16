export const OPERATION_ARENA_SCHEMA_VERSION = "operation-arena-state-v0";

export const OPERATION_INTERACTABLE_KINDS = Object.freeze([
  "door", "pump", "valve", "barricade", "turret", "extraction-toilet", "watchtower",
]);

export const OPERATION_INPUT_AFFORDANCES = Object.freeze({
  keyboard: Object.freeze({ binding: "KeyE", shortLabel: "E", instruction: "Press E to interact" }),
  controller: Object.freeze({ binding: "button-south", shortLabel: "A / Cross", instruction: "Press the south face button to interact" }),
  touch: Object.freeze({ gesture: "tap", shortLabel: "USE", instruction: "Tap USE to interact", minTargetPx: 44 }),
});

const MIN_WIDTH = 320;
const MIN_HEIGHT = 240;
const RECEIPT_LIMIT = 64;

const DEFINITIONS = Object.freeze({
  door: {
    initial: "closed",
    states: {
      closed: { label: "CLOSED", cue: "Door sealed", tone: "warning", passable: false },
      open: { label: "OPEN", cue: "Passage clear", tone: "ready", passable: true },
    },
    commands: { open: "open", close: "closed" },
  },
  pump: {
    initial: "drained",
    states: {
      drained: { label: "DRAINED", cue: "Floor dry", tone: "ready", flooded: false },
      flooded: { label: "FLOODED", cue: "Hazard water active", tone: "danger", flooded: true },
    },
    commands: { flood: "flooded", drain: "drained" },
  },
  valve: {
    initial: "contaminated",
    states: {
      contaminated: { label: "CONTAMINATED", cue: "Waste feed unsafe", tone: "danger", powered: false },
      powered: { label: "POWERED", cue: "Clean pressure online", tone: "ready", powered: true },
    },
    commands: { power: "powered", contaminate: "contaminated" },
  },
  barricade: {
    initial: "reinforced",
    states: {
      reinforced: { label: "REINFORCED", cue: "Lane blocked", tone: "ready", blocking: true },
      breached: { label: "BREACHED", cue: "Lane exposed", tone: "danger", blocking: false },
    },
    commands: { reinforce: "reinforced", breach: "breached" },
  },
  turret: {
    initial: "offline",
    states: {
      offline: { label: "OFFLINE", cue: "Turret unpowered", tone: "muted", powered: false },
      powered: { label: "POWERED", cue: "Auto-defense ready", tone: "ready", powered: true },
    },
    commands: { power: "powered", disable: "offline" },
  },
  "extraction-toilet": {
    initial: "locked",
    states: {
      locked: { label: "LOCKED", cue: "Extraction unavailable", tone: "muted", extractable: false },
      ready: { label: "READY", cue: "Extraction toilet armed", tone: "ready", extractable: true },
      contaminated: { label: "CONTAMINATED", cue: "Extraction unsafe", tone: "danger", extractable: false },
    },
    commands: { arm: "ready", lock: "locked", contaminate: "contaminated", sanitize: "ready" },
  },
  watchtower: {
    initial: "idle",
    states: {
      idle: { label: "VACANT", cue: "Lookout available", tone: "muted", occupied: false },
      occupied: { label: "OCCUPIED", cue: "Lookout sightline active", tone: "ready", occupied: true },
    },
    commands: { enter: "occupied", exit: "idle" },
  },
});

const BLUEPRINT = Object.freeze([
  ["door-north", "door", .5, .1, 24], ["door-south", "door", .5, .9, 24],
  ["pump-west", "pump", .16, .34, 28], ["valve-east", "valve", .84, .34, 24],
  ["barricade-west", "barricade", .24, .66, 26], ["barricade-east", "barricade", .76, .66, 26],
  ["turret-northwest", "turret", .28, .25, 26], ["turret-northeast", "turret", .72, .25, 26],
  ["extraction-toilet-alpha", "extraction-toilet", .4, .82, 28],
  ["extraction-toilet-bravo", "extraction-toilet", .6, .82, 28],
  ["watchtower-center", "watchtower", .5, .5, 34],
]);

function integer(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.trunc(number) : fallback;
}

function fingerprint(value) {
  let hash = 2166136261;
  for (const char of String(value)) {
    hash ^= char.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0").toUpperCase();
}

function visual(kind, state) {
  const detail = DEFINITIONS[kind].states[state];
  return {
    stateLabel: detail.label,
    worldCue: detail.cue,
    tone: detail.tone,
    pattern: detail.tone === "danger" ? "diagonal-stripes" : detail.tone === "ready" ? "solid" : "outline",
  };
}

function makeInteractable([id, kind, xRatio, yRatio, radius], width, height, mirrored) {
  const state = DEFINITIONS[kind].initial;
  const item = {
    id,
    kind,
    position: { x: Math.round(width * (mirrored ? 1 - xRatio : xRatio)), y: Math.round(height * yRatio) },
    interactionRadius: radius,
    state,
    supportedCommands: Object.keys(DEFINITIONS[kind].commands),
    inputAffordances: OPERATION_INPUT_AFFORDANCES,
    visual: visual(kind, state),
  };
  if (kind === "watchtower") {
    item.watchtowerV0 = {
      footprint: { width: 56, height: 56 },
      viewRadius: 160,
      elevationModel: "abstract-sightline-only",
    };
  }
  return item;
}

/**
 * Creates a deterministic renderer-neutral Operation arena. Positions are
 * bounded 2D interaction metadata, never a full 3D physics representation.
 */
export function createOperationArenaState({ width = 960, height = 640, seed = 0 } = {}) {
  const arenaWidth = integer(width);
  const arenaHeight = integer(height);
  if (arenaWidth < MIN_WIDTH || arenaHeight < MIN_HEIGHT) {
    throw new RangeError(`Operation arena must be at least ${MIN_WIDTH}x${MIN_HEIGHT}`);
  }
  const normalizedSeed = integer(seed) >>> 0;
  const state = {
    schemaVersion: OPERATION_ARENA_SCHEMA_VERSION,
    arenaId: `operation-${normalizedSeed.toString(16).padStart(8, "0")}-${arenaWidth}x${arenaHeight}`,
    seed: normalizedSeed,
    bounds: { width: arenaWidth, height: arenaHeight },
    spatialModel: "bounded-2d-interaction-zones-no-3d-physics",
    sequence: 0,
    interactables: BLUEPRINT.map((item) => makeInteractable(
      item, arenaWidth, arenaHeight, (normalizedSeed & 1) === 1,
    )),
    transitionReceipts: [],
  };
  const validation = validateOperationArenaState(state);
  if (!validation.valid) throw new RangeError(validation.errors.join("; "));
  return state;
}

/** Applies one immutable, replayable interaction command. */
export function applyOperationArenaTransition(state, action = {}) {
  const validation = validateOperationArenaState(state);
  if (!validation.valid) throw new TypeError(`Invalid Operation arena state: ${validation.errors.join("; ")}`);

  const targetId = String(action.targetId || "");
  const command = String(action.command || "").toLowerCase();
  const targetIndex = state.interactables.findIndex((item) => item.id === targetId);
  if (targetIndex < 0) throw new RangeError(`Unknown Operation interactable: ${targetId || "(empty)"}`);

  const target = state.interactables[targetIndex];
  const nextValue = DEFINITIONS[target.kind].commands[command];
  if (!nextValue) throw new RangeError(`Command ${command || "(empty)"} is not supported by ${target.id}`);

  const inputSource = String(action.inputSource || "keyboard").toLowerCase();
  if (!Object.hasOwn(OPERATION_INPUT_AFFORDANCES, inputSource)) {
    throw new RangeError(`Unsupported input source: ${inputSource}`);
  }

  const nextSequence = state.sequence + 1;
  const afterVisual = visual(target.kind, nextValue);
  const receiptPayload = {
    schemaVersion: "operation-arena-transition-v0",
    arenaId: state.arenaId,
    sequence: nextSequence,
    targetId,
    kind: target.kind,
    command,
    inputSource,
    actorId: String(action.actorId || "player-1").slice(0, 32),
    before: { state: target.state, visual: target.visual },
    after: { state: nextValue, visual: afterVisual },
  };
  const receipt = {
    ...receiptPayload,
    fingerprint: fingerprint(JSON.stringify(receiptPayload)),
  };
  const nextTarget = { ...target, state: nextValue, visual: afterVisual };
  const nextState = {
    ...state,
    sequence: nextSequence,
    interactables: state.interactables.map((item, index) => index === targetIndex ? nextTarget : item),
    transitionReceipts: [...state.transitionReceipts, receipt].slice(-RECEIPT_LIMIT),
  };
  const nextValidation = validateOperationArenaState(nextState);
  if (!nextValidation.valid) throw new TypeError(`Transition produced invalid state: ${nextValidation.errors.join("; ")}`);
  return nextState;
}

/** Returns accessible renderer cues without prescribing canvas or DOM output. */
export function getOperationArenaCues(state) {
  return state.interactables.map((item) => ({
    id: item.id,
    kind: item.kind,
    position: { ...item.position },
    stateLabel: item.visual.stateLabel,
    worldCue: item.visual.worldCue,
    tone: item.visual.tone,
    pattern: item.visual.pattern,
    interactionPrompt: [
      OPERATION_INPUT_AFFORDANCES.keyboard.shortLabel,
      OPERATION_INPUT_AFFORDANCES.controller.shortLabel,
      OPERATION_INPUT_AFFORDANCES.touch.shortLabel,
    ].join(" / "),
  }));
}

/** Validates state machines, interaction bounds, input metadata, and tower v0. */
export function validateOperationArenaState(state) {
  const errors = [];
  if (!state || typeof state !== "object") return { valid: false, errors: ["state must be an object"] };
  const width = Number(state.bounds?.width);
  const height = Number(state.bounds?.height);
  if (!Number.isInteger(width) || width < MIN_WIDTH) errors.push("arena width is out of bounds");
  if (!Number.isInteger(height) || height < MIN_HEIGHT) errors.push("arena height is out of bounds");
  if (state.spatialModel !== "bounded-2d-interaction-zones-no-3d-physics") {
    errors.push("unsupported spatial model");
  }
  if (!Array.isArray(state.interactables)) errors.push("interactables must be an array");

  const items = Array.isArray(state.interactables) ? state.interactables : [];
  const ids = new Set();
  for (const item of items) {
    if (ids.has(item.id)) errors.push(`duplicate interactable id: ${item.id}`);
    ids.add(item.id);
    if (!OPERATION_INTERACTABLE_KINDS.includes(item.kind)) {
      errors.push(`unknown interactable kind: ${item.kind}`);
      continue;
    }
    if (!Object.hasOwn(DEFINITIONS[item.kind].states, item.state)) errors.push(`invalid state for ${item.id}`);
    const x = Number(item.position?.x);
    const y = Number(item.position?.y);
    const radius = Number(item.interactionRadius);
    if (![x, y, radius].every(Number.isFinite) || radius < 1) {
      errors.push(`invalid interaction zone for ${item.id}`);
    } else if (x - radius < 0 || x + radius > width || y - radius < 0 || y + radius > height) {
      errors.push(`interaction zone outside bounds for ${item.id}`);
    }
    for (const inputType of Object.keys(OPERATION_INPUT_AFFORDANCES)) {
      if (!item.inputAffordances?.[inputType]) errors.push(`missing ${inputType} affordance for ${item.id}`);
    }
    if (!item.visual?.stateLabel || !item.visual?.worldCue || !item.visual?.pattern) {
      errors.push(`missing readable visual cue for ${item.id}`);
    }
    if (item.kind === "watchtower") {
      const tower = item.watchtowerV0;
      const towerWidth = Number(tower?.footprint?.width);
      const towerHeight = Number(tower?.footprint?.height);
      const viewRadius = Number(tower?.viewRadius);
      if (tower?.elevationModel !== "abstract-sightline-only") {
        errors.push("watchtower v0 cannot use physical elevation");
      }
      if (![towerWidth, towerHeight].every(Number.isFinite)
        || towerWidth < 1 || towerHeight < 1 || towerWidth > 72 || towerHeight > 72) {
        errors.push("watchtower v0 footprint exceeds its limit");
      } else if (x - towerWidth / 2 < 0 || x + towerWidth / 2 > width
        || y - towerHeight / 2 < 0 || y + towerHeight / 2 > height) {
        errors.push("watchtower v0 footprint is outside arena bounds");
      }
      if (!Number.isFinite(viewRadius) || viewRadius < 1 || viewRadius > 180) {
        errors.push("watchtower v0 view radius exceeds its limit");
      }
    }
  }

  for (const kind of OPERATION_INTERACTABLE_KINDS) {
    if (!items.some((item) => item.kind === kind)) errors.push(`missing required interactable kind: ${kind}`);
  }
  return { valid: errors.length === 0, errors };
}

/** Builds replay-stable proof over state and its bounded transition history. */
export function buildOperationArenaReceipt(state) {
  const validation = validateOperationArenaState(state);
  if (!validation.valid) throw new TypeError(`Invalid Operation arena state: ${validation.errors.join("; ")}`);
  const snapshot = {
    arenaId: state.arenaId,
    seed: state.seed,
    bounds: state.bounds,
    sequence: state.sequence,
    interactables: state.interactables.map((item) => ({ id: item.id, kind: item.kind, state: item.state })),
  };
  return {
    schemaVersion: "operation-arena-receipt-v0",
    contract: "deterministic-interaction-state-not-rendering-or-3d-physics",
    arenaId: state.arenaId,
    sequence: state.sequence,
    stateFingerprint: fingerprint(JSON.stringify(snapshot)),
    transitionFingerprint: fingerprint(
      state.transitionReceipts.map((item) => `${item.sequence}:${item.fingerprint}`).join("|"),
    ),
    transitions: state.transitionReceipts.map((item) => ({ ...item })),
  };
}
