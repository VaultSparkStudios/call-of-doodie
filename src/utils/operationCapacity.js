export const OPERATION_CAPACITY_SCHEMA = "operation-capacity-model-v1";

export const DEFAULT_OPERATION_CAPACITY_MODEL = Object.freeze({
  schemaVersion: OPERATION_CAPACITY_SCHEMA,
  access: { inviteOnly: true, playersPerRoom: 2, publicMatchmaking: false },
  simulation: {
    authority: "server",
    tickRateHz: 20,
    stateBroadcastRateHz: 10,
    activeComputeMsPerTick: 4,
  },
  payload: { maxInputBytes: 64, maxStateBytes: 1024 },
  rooms: { targetConcurrent: 10, maxConcurrent: 20 },
  monthly: {
    hardMessageCap: 8_000_000,
    hardActiveComputeMsCap: 2_000_000,
    hardCostUsdCap: 5,
    assumedMessagesPerUsd: 1_000_000,
    assumedActiveComputeMsPerUsd: 1_000_000,
  },
  hibernation: {
    enabled: true,
    idleAfterSeconds: 30,
    activeTickingWhileHibernating: false,
    persistedState: ["operationId", "seed", "tick", "encounterState", "playerSlots", "scoreLedger"],
  },
  rateLimits: {
    maxInputsPerPlayerPerSecond: 30,
    inputBurst: 10,
    maxJoinAttemptsPerMinute: 5,
    maxReconnectAttempts: 3,
  },
  reconnect: {
    graceSeconds: 45,
    resumeFromAuthoritativeSnapshot: true,
    abandonedSlotPolicy: "hibernate-then-forfeit",
  },
  trust: {
    worldStateAuthority: "server-only",
    scoreAuthority: "server-only",
    clientScoreAccepted: false,
    signedFinalReceipt: true,
    allowedClientMessages: ["input", "ready", "reconnect", "ack"],
  },
  killSwitch: {
    enabled: true,
    tripAtMonthlyFraction: 0.9,
    denyNewRooms: true,
    preserveActiveRooms: true,
    soloPlayUnaffected: true,
  },
});

function mergeSection(base, override) {
  return { ...base, ...(override && typeof override === "object" ? override : {}) };
}

export function createOperationCapacityModel(overrides = {}) {
  const base = DEFAULT_OPERATION_CAPACITY_MODEL;
  return {
    schemaVersion: OPERATION_CAPACITY_SCHEMA,
    access: mergeSection(base.access, overrides.access),
    simulation: mergeSection(base.simulation, overrides.simulation),
    payload: mergeSection(base.payload, overrides.payload),
    rooms: mergeSection(base.rooms, overrides.rooms),
    monthly: mergeSection(base.monthly, overrides.monthly),
    hibernation: mergeSection(base.hibernation, overrides.hibernation),
    rateLimits: mergeSection(base.rateLimits, overrides.rateLimits),
    reconnect: mergeSection(base.reconnect, overrides.reconnect),
    trust: mergeSection(base.trust, overrides.trust),
    killSwitch: mergeSection(base.killSwitch, overrides.killSwitch),
  };
}

function positiveInteger(value) {
  return Number.isInteger(value) && value > 0;
}

export function validateOperationCapacityModel(model) {
  const errors = [];
  if (model?.schemaVersion !== OPERATION_CAPACITY_SCHEMA) errors.push("schema_version");
  if (model?.access?.inviteOnly !== true || model?.access?.publicMatchmaking !== false) errors.push("invite_only_access");
  if (model?.access?.playersPerRoom !== 2) errors.push("two_players_per_room");
  if (model?.simulation?.authority !== "server") errors.push("authoritative_simulation");
  if (!positiveInteger(model?.simulation?.tickRateHz) || model.simulation.tickRateHz > 60) errors.push("tick_rate");
  if (!positiveInteger(model?.simulation?.activeComputeMsPerTick)) errors.push("compute_budget");
  if (!positiveInteger(model?.simulation?.stateBroadcastRateHz)
    || model.simulation.stateBroadcastRateHz > model.simulation.tickRateHz) errors.push("state_broadcast_rate");
  if (!positiveInteger(model?.payload?.maxInputBytes) || !positiveInteger(model?.payload?.maxStateBytes)) errors.push("payload_budget");
  if (!positiveInteger(model?.rooms?.maxConcurrent)
    || !positiveInteger(model?.rooms?.targetConcurrent)
    || model.rooms.targetConcurrent > model.rooms.maxConcurrent) errors.push("room_capacity");
  if (!positiveInteger(model?.monthly?.hardMessageCap)
    || !positiveInteger(model?.monthly?.hardActiveComputeMsCap)
    || !(model?.monthly?.hardCostUsdCap > 0)
    || !positiveInteger(model?.monthly?.assumedMessagesPerUsd)
    || !positiveInteger(model?.monthly?.assumedActiveComputeMsPerUsd)) errors.push("monthly_hard_cap");
  if (model?.hibernation?.enabled !== true || model?.hibernation?.activeTickingWhileHibernating !== false) errors.push("hibernation_boundary");
  if (!positiveInteger(model?.rateLimits?.maxInputsPerPlayerPerSecond)
    || !positiveInteger(model?.rateLimits?.maxJoinAttemptsPerMinute)
    || !positiveInteger(model?.rateLimits?.maxReconnectAttempts)) errors.push("rate_limits");
  if (!positiveInteger(model?.reconnect?.graceSeconds)
    || model?.reconnect?.resumeFromAuthoritativeSnapshot !== true) errors.push("reconnect_policy");
  if (model?.trust?.worldStateAuthority !== "server-only"
    || model?.trust?.scoreAuthority !== "server-only"
    || model?.trust?.clientScoreAccepted !== false
    || model?.trust?.signedFinalReceipt !== true) errors.push("score_and_world_trust_boundary");
  if (model?.killSwitch?.enabled !== true
    || model?.killSwitch?.denyNewRooms !== true
    || model?.killSwitch?.soloPlayUnaffected !== true
    || !(model?.killSwitch?.tripAtMonthlyFraction > 0 && model.killSwitch.tripAtMonthlyFraction <= 1)) errors.push("kill_switch");
  return { ok: errors.length === 0, errors };
}

export function estimateOperationCapacity(model, {
  roomMatches = 1,
  matchSeconds = 15 * 60,
} = {}) {
  const players = model.access.playersPerRoom;
  const duration = Math.max(1, Math.floor(Number(matchSeconds) || 1));
  const matches = Math.max(0, Math.floor(Number(roomMatches) || 0));
  const ticksPerMatch = duration * model.simulation.tickRateHz;
  const inputMessagesPerMatch = ticksPerMatch * players;
  const stateMessagesPerMatch = duration * model.simulation.stateBroadcastRateHz * players;
  const messagesPerMatch = inputMessagesPerMatch + stateMessagesPerMatch;
  const inputBytesPerMatch = inputMessagesPerMatch * model.payload.maxInputBytes;
  const stateBytesPerMatch = stateMessagesPerMatch * model.payload.maxStateBytes;
  const activeComputeMsPerMatch = ticksPerMatch * model.simulation.activeComputeMsPerTick;
  const totalMessages = messagesPerMatch * matches;
  const totalActiveComputeMs = activeComputeMsPerMatch * matches;
  const estimatedCostUsd = (totalMessages / model.monthly.assumedMessagesPerUsd)
    + (totalActiveComputeMs / model.monthly.assumedActiveComputeMsPerUsd);
  return {
    roomMatches: matches,
    matchSeconds: duration,
    ticksPerMatch,
    messagesPerMatch,
    inputMessagesPerMatch,
    stateMessagesPerMatch,
    payloadBytesPerMatch: inputBytesPerMatch + stateBytesPerMatch,
    activeComputeMsPerMatch,
    totalMessages,
    totalActiveComputeMs,
    estimatedCostUsd: Number(estimatedCostUsd.toFixed(6)),
  };
}

export function evaluateOperationKillSwitch(model, usage = {}) {
  const fraction = model.killSwitch.tripAtMonthlyFraction;
  const messages = Math.max(0, Number(usage.messages) || 0);
  const activeComputeMs = Math.max(0, Number(usage.activeComputeMs) || 0);
  const costUsd = Math.max(0, Number(usage.costUsd) || 0);
  const reasons = [];
  if (usage.manualDisabled === true) reasons.push("manual");
  if (messages >= model.monthly.hardMessageCap * fraction) reasons.push("message_cap");
  if (activeComputeMs >= model.monthly.hardActiveComputeMsCap * fraction) reasons.push("compute_cap");
  if (costUsd >= model.monthly.hardCostUsdCap * fraction) reasons.push("cost_cap");
  return {
    tripped: reasons.length > 0,
    reasons,
    allowNewRooms: reasons.length === 0,
    preserveActiveRooms: model.killSwitch.preserveActiveRooms,
    soloPlayAvailable: model.killSwitch.soloPlayUnaffected,
  };
}

function benchmarkChecksum(value) {
  const text = JSON.stringify(value);
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash = Math.imul(hash ^ text.charCodeAt(index), 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

/** Pure arithmetic load court: identical model, seed, and inputs yield identical evidence. */
export function runSyntheticOperationCapacityBenchmark(model, {
  rooms = model?.rooms?.targetConcurrent || 0,
  matchSeconds = 15 * 60,
  monthlyRoomMatches = 1,
  seed = 1,
  attemptedInputsPerPlayerPerSecond = model?.simulation?.tickRateHz || 0,
} = {}) {
  const validation = validateOperationCapacityModel(model);
  if (!validation.ok) return { pass: false, deterministic: true, validation, failures: ["invalid_model"] };
  const concurrentRooms = Math.max(0, Math.floor(Number(rooms) || 0));
  const estimate = estimateOperationCapacity(model, { roomMatches: monthlyRoomMatches, matchSeconds });
  const attemptedRate = Math.max(0, Math.floor(Number(attemptedInputsPerPlayerPerSecond) || 0));
  const acceptedRate = Math.min(attemptedRate, model.rateLimits.maxInputsPerPlayerPerSecond);
  const droppedInputs = Math.max(0, attemptedRate - acceptedRate)
    * model.access.playersPerRoom * Math.max(1, Math.floor(matchSeconds)) * concurrentRooms;
  const killSwitch = evaluateOperationKillSwitch(model, {
    messages: estimate.totalMessages,
    activeComputeMs: estimate.totalActiveComputeMs,
    costUsd: estimate.estimatedCostUsd,
  });
  const failures = [];
  if (concurrentRooms < 1 || monthlyRoomMatches < 1) failures.push("no_room_load");
  if (concurrentRooms > model.rooms.maxConcurrent) failures.push("max_rooms");
  if (estimate.totalMessages >= model.monthly.hardMessageCap) failures.push("monthly_message_cap");
  if (estimate.totalActiveComputeMs >= model.monthly.hardActiveComputeMsCap) failures.push("monthly_compute_cap");
  if (estimate.estimatedCostUsd >= model.monthly.hardCostUsdCap) failures.push("monthly_cost_cap");
  const result = {
    schemaVersion: "operation-capacity-benchmark-v1",
    deterministic: true,
    seed: Math.floor(Number(seed) || 0) >>> 0,
    concurrentRooms,
    estimate,
    rateLimitCourt: { attemptedRate, acceptedRate, droppedInputs },
    killSwitch,
    failures,
    pass: failures.length === 0,
  };
  return { ...result, checksum: benchmarkChecksum(result) };
}
