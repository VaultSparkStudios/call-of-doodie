export const RUN_RNG_STREAMS = Object.freeze([
  "spawn",
  "combat",
  "loot",
  "choices",
  "hazards",
]);

const STREAM_SET = new Set(RUN_RNG_STREAMS);
const STEP = 0x6d2b79f5;

function uint(value) {
  return Number(value) >>> 0;
}

function hashName(name) {
  let hash = 2166136261;
  for (const char of String(name)) {
    hash ^= char.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function initialState(seed, wave, name) {
  // Spawn is a compatibility contract shared with replayResim and the edge
  // validator. Preserve the original createWaveRng derivation byte-for-byte.
  if (name === "spawn") {
    return (Math.imul((uint(seed || 1)) ^ 0x9e3779b9, 0x85ebca6b)
      ^ Math.imul((uint(wave) + STEP) | 0, 0xc2b2ae35)) >>> 0;
  }
  let value = uint(seed || 1) ^ hashName(name) ^ Math.imul(uint(wave) + STEP, 0x85ebca6b);
  value = Math.imul(value ^ (value >>> 16), 0x7feb352d);
  value = Math.imul(value ^ (value >>> 15), 0x846ca68b);
  return (value ^ (value >>> 16)) >>> 0;
}

export function createNamedRunRng({
  seed,
  wave = 1,
  name,
  state,
  calls = 0,
} = {}) {
  if (!STREAM_SET.has(name)) throw new Error(`Unknown run RNG stream: ${name}`);
  let cursor = Number.isFinite(Number(state)) ? uint(state) : initialState(seed, wave, name);
  let callCount = Math.max(0, Math.floor(Number(calls) || 0));

  const random = () => {
    cursor = (cursor + STEP) >>> 0;
    let value = cursor;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    callCount += 1;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
  random.snapshot = () => ({
    name,
    wave: Math.max(1, Math.floor(Number(wave) || 1)),
    state: cursor,
    calls: callCount,
  });
  return random;
}

function streamKey(name, wave) {
  return `${Math.max(1, Math.floor(Number(wave) || 1))}:${name}`;
}

export function getRunRng(gs, name, { wave = gs?.currentWave || 1 } = {}) {
  if (!STREAM_SET.has(name)) throw new Error(`Unknown run RNG stream: ${name}`);
  if (!gs || !Number.isFinite(Number(gs.runSeed))) return Math.random;

  const seed = uint(gs.runSeed);
  if (gs._runRngSeed !== seed || !(gs._runRngStreams instanceof Map)) {
    gs._runRngSeed = seed;
    gs._runRngStreams = new Map();
  }

  const key = streamKey(name, wave);
  if (!gs._runRngStreams.has(key)) {
    const restored = gs.runRngState?.streams?.[key];
    gs._runRngStreams.set(key, createNamedRunRng({
      seed,
      wave,
      name,
      state: restored?.state,
      calls: restored?.calls,
    }));
  }
  return gs._runRngStreams.get(key);
}

export function snapshotRunRng(gs) {
  const streams = { ...(gs?.runRngState?.streams || {}) };
  if (gs?._runRngStreams instanceof Map) {
    for (const [key, random] of gs._runRngStreams) streams[key] = random.snapshot();
  }
  return {
    schemaVersion: "1.0",
    seed: Number(gs?.runSeed) || 0,
    streams,
  };
}

export function restoreRunRng(gs, snapshot) {
  if (!gs || !snapshot || Number(snapshot.seed) !== Number(gs.runSeed)) return false;
  gs.runRngState = {
    schemaVersion: "1.0",
    seed: Number(snapshot.seed),
    streams: { ...(snapshot.streams || {}) },
  };
  gs._runRngSeed = undefined;
  gs._runRngStreams = undefined;
  return true;
}

export function cosmeticRandom() {
  return Math.random();
}

export function shuffleWithRng(list, random = Math.random) {
  const copy = [...(list || [])];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

export function buildCompetitiveRngReceipt({
  seed,
  waves = 10,
  commandSchedule = [],
} = {}) {
  const safeWaves = Math.max(1, Math.min(50, Math.floor(Number(waves) || 10)));
  const commands = Array.isArray(commandSchedule) ? commandSchedule : [];
  const decisions = [];
  const state = { runSeed: Number(seed) || 0, currentWave: 1 };

  for (let wave = 1; wave <= safeWaves; wave += 1) {
    state.currentWave = wave;
    const streams = Object.fromEntries(RUN_RNG_STREAMS.map((name) => [name, getRunRng(state, name)]));
    const waveCommands = commands.filter((command) => Number(command?.wave) === wave);
    decisions.push({
      wave,
      spawn: [streams.spawn(), streams.spawn(), streams.spawn()],
      objective: [streams.choices(), streams.choices()],
      combat: waveCommands.map((command) => ({
        action: String(command.action || "idle"),
        roll: streams.combat(),
      })),
      loot: waveCommands.filter((command) => command.action === "kill").map(() => streams.loot()),
      hazard: streams.hazards(),
    });
  }

  return {
    schemaVersion: "1.0",
    contract: "competitive-rng-receipt-not-full-physics-resimulation",
    seed: Number(seed) || 0,
    waves: safeWaves,
    decisions,
    rngState: snapshotRunRng(state),
  };
}
