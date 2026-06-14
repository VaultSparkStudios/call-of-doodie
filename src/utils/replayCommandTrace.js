const MAX_EVENTS = 240;
export const MAX_TRACE_BODY_BYTES = 10000;
const FRAME_BUCKET = 6;
const VALID_ACTIONS = new Set([
  "move",
  "aim",
  "shoot",
  "reload",
  "dash",
  "grenade",
  "perk",
  "route",
  "shop",
  "swap",
  "pause",
]);

function safeInt(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? Math.floor(num) : fallback;
}

function clamp(num, min, max) {
  return Math.max(min, Math.min(max, num));
}

function cleanAction(action) {
  const value = String(action || "").trim().toLowerCase();
  return VALID_ACTIONS.has(value) ? value : "move";
}

function cleanValue(value) {
  if (value == null) return "";
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_.:-]/g, "")
    .slice(0, 24);
}

export function directionBucket(dx = 0, dy = 0) {
  const x = Number(dx) || 0;
  const y = Number(dy) || 0;
  if (Math.hypot(x, y) < 0.01) return "neutral";
  const angle = Math.atan2(y, x);
  const octants = ["e", "se", "s", "sw", "w", "nw", "n", "ne"];
  const idx = Math.round(angle / (Math.PI / 4));
  return octants[(idx + 8) % 8];
}

function checksum(serialized) {
  let hash = 2166136261;
  for (let i = 0; i < serialized.length; i++) {
    hash ^= serialized.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).toUpperCase().padStart(8, "0");
}

export function normalizeReplayCommandTrace(events = [], { maxEvents = MAX_EVENTS } = {}) {
  const normalized = events
    .map((event) => ({
      f: clamp(safeInt(event?.frame ?? event?.f, 0), 0, 999999),
      a: cleanAction(event?.action ?? event?.a),
      v: cleanValue(event?.value ?? event?.v),
    }))
    .filter((event) => event.f >= 0)
    .sort((left, right) => left.f - right.f || left.a.localeCompare(right.a) || left.v.localeCompare(right.v))
    .slice(0, clamp(safeInt(maxEvents, MAX_EVENTS), 1, MAX_EVENTS));

  let lastKey = "";
  return normalized.filter((event) => {
    event.f = Math.floor(event.f / FRAME_BUCKET) * FRAME_BUCKET;
    const key = `${event.f}:${event.a}:${event.v}`;
    if (key === lastKey) return false;
    lastKey = key;
    return true;
  });
}

export function recordReplayCommandEvent(events = [], event = {}, options = {}) {
  const maxEvents = clamp(safeInt(options.maxEvents, MAX_EVENTS), 1, MAX_EVENTS);
  const target = Array.isArray(events) ? events : [];
  target.push({
    frame: safeInt(event.frame ?? event.f, 0),
    action: cleanAction(event.action ?? event.a),
    value: cleanValue(event.value ?? event.v),
  });
  if (target.length > maxEvents) {
    target.splice(0, target.length - maxEvents);
  }
  return target;
}

export function serializeReplayCommandTrace(events = [], options = {}) {
  return normalizeReplayCommandTrace(events, options)
    .map((event) => `${event.f.toString(36)}.${event.a}.${event.v}`)
    .join("~");
}

export function encodeReplayCommandTrace(events = [], options = {}) {
  const body = serializeReplayCommandTrace(events, options);
  return {
    v: 1,
    bucket: FRAME_BUCKET,
    count: body ? body.split("~").length : 0,
    body,
    digest: checksum(body),
  };
}

export function isValidReplayCommandTrace(trace) {
  if (!trace || trace.v !== 1 || trace.bucket !== FRAME_BUCKET) return false;
  if (typeof trace.body !== "string" || !/^[a-z0-9._:~-]*$/.test(trace.body)) return false;
  if (trace.body.length > MAX_TRACE_BODY_BYTES) return false;
  const events = decodeReplayCommandTrace(trace);
  return events != null && trace.digest === checksum(trace.body) && events.length === trace.count;
}

export function decodeReplayCommandTrace(trace) {
  if (!trace || typeof trace.body !== "string") return null;
  if (trace.body === "") return [];
  const events = trace.body.split("~").map((part) => {
    const [frame, action, value = ""] = part.split(".");
    return {
      f: parseInt(frame, 36),
      a: action,
      v: value,
    };
  });
  if (events.some((event) => !Number.isFinite(event.f) || !VALID_ACTIONS.has(event.a))) return null;
  return events;
}

export function summarizeReplayCommandTrace(trace) {
  const events = decodeReplayCommandTrace(trace) || [];
  const actions = {};
  for (const event of events) actions[event.a] = (actions[event.a] || 0) + 1;
  return {
    v: trace?.v ?? 1,
    count: events.length,
    firstFrame: events[0]?.f ?? null,
    lastFrame: events.at(-1)?.f ?? null,
    actions,
    digest: trace?.digest ?? checksum(""),
  };
}

export function analyzeReplayCommandTrace(trace) {
  const valid = isValidReplayCommandTrace(trace);
  const events = valid ? decodeReplayCommandTrace(trace) || [] : [];
  const summary = summarizeReplayCommandTrace(valid ? trace : null);
  const durationFrames = events.length > 1 ? Math.max(0, events.at(-1).f - events[0].f) : 0;
  const movementCount = summary.actions.move || 0;
  const aimCount = summary.actions.aim || 0;
  const shootCount = summary.actions.shoot || 0;
  const interactionCount = ["shoot", "reload", "dash", "grenade", "perk", "route", "shop", "swap", "pause"]
    .reduce((total, action) => total + (summary.actions[action] || 0), 0);
  const weaknessReasons = [];

  if (!valid) weaknessReasons.push("invalid-trace");
  if (events.length === 0) weaknessReasons.push("no-events");
  if (events.length > 0 && events.length < 3) weaknessReasons.push("too-few-events");
  if (durationFrames > 0 && durationFrames < 60) weaknessReasons.push("short-duration");
  if (movementCount < 2) weaknessReasons.push("low-movement-evidence");
  if (aimCount < 1 && shootCount > 0) weaknessReasons.push("missing-aim-evidence");
  if (interactionCount < 2) weaknessReasons.push("low-interaction-evidence");

  let evidenceLevel = "none";
  if (valid && events.length > 0) evidenceLevel = "weak";
  if (valid && events.length >= 3 && interactionCount >= 1 && durationFrames >= 24) evidenceLevel = "basic";
  if (valid && events.length >= 6 && durationFrames >= 60 && movementCount >= 2 && aimCount >= 1 && interactionCount >= 2) {
    evidenceLevel = "rich";
  }

  return {
    valid,
    evidenceLevel,
    count: events.length,
    durationFrames,
    firstFrame: summary.firstFrame,
    lastFrame: summary.lastFrame,
    actions: summary.actions,
    movementCount,
    aimCount,
    shootCount,
    interactionCount,
    digest: summary.digest,
    weaknessReasons,
  };
}

function safeNum(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function normalizeEvidence(traceEvidence = null) {
  const level = String(traceEvidence?.level || traceEvidence?.evidenceLevel || "none");
  return {
    level,
    count: safeNum(traceEvidence?.count),
    durationFrames: safeNum(traceEvidence?.durationFrames),
    movementCount: safeNum(traceEvidence?.movementCount),
    aimCount: safeNum(traceEvidence?.aimCount),
    shootCount: safeNum(traceEvidence?.shootCount),
    interactionCount: safeNum(traceEvidence?.interactionCount),
    weaknessReasons: Array.isArray(traceEvidence?.weaknessReasons) ? traceEvidence.weaknessReasons.map(String) : [],
  };
}

export function buildReplayProofReceipt(traceEvidence = null) {
  const evidence = normalizeEvidence(traceEvidence);
  let score = 0;
  score += Math.min(25, evidence.count * 4);
  score += Math.min(20, Math.floor(evidence.durationFrames / 3));
  score += Math.min(20, evidence.movementCount * 8);
  score += Math.min(15, evidence.aimCount * 8);
  score += Math.min(20, evidence.interactionCount * 8);
  score -= evidence.weaknessReasons.length * 8;
  if (evidence.level === "rich") score = Math.max(score, 88);
  else if (evidence.level === "basic") score = Math.max(score, 58);
  else if (evidence.level === "weak") score = Math.max(score, 24);
  score = clamp(score, 0, 100);

  const status = score >= 85 ? "verified" : score >= 55 ? "building" : score > 0 ? "needs-proof" : "missing";
  const label = status === "verified"
    ? "Replay Proof Ready"
    : status === "building"
      ? "Replay Proof Building"
      : status === "needs-proof"
        ? "Replay Proof Needs Signal"
        : "Replay Proof Missing";
  const color = status === "verified" ? "#00FF88" : status === "building" ? "#FFD700" : status === "needs-proof" ? "#FF9A3D" : "#888";
  const proofLines = [
    `${evidence.count} trace events across ${evidence.durationFrames} frames`,
    `${evidence.movementCount} movement · ${evidence.aimCount} aim · ${evidence.interactionCount} interaction`,
  ];
  const nextAction = (() => {
    if (status === "verified") return "Keep trace capture active; this run carries strong movement, aim, and action evidence.";
    if (evidence.weaknessReasons.includes("too-few-events") || evidence.weaknessReasons.includes("no-events")) return "Bank at least 6 trace events before score submission.";
    if (evidence.weaknessReasons.includes("short-duration")) return "Keep the run active for at least 60 traced frames.";
    if (evidence.weaknessReasons.includes("low-movement-evidence")) return "Move in two distinct windows so the proof shows path intent.";
    if (evidence.weaknessReasons.includes("missing-aim-evidence")) return "Aim before firing so the proof shows target intent.";
    if (evidence.weaknessReasons.includes("low-interaction-evidence")) return "Fire, dash, reload, route, shop, or use a grenade at least twice.";
    if (evidence.weaknessReasons.includes("invalid-trace")) return "Submit a valid trace body before replay trust can advance.";
    return "Add movement, aim, and interaction variety to upgrade the proof receipt.";
  })();

  return {
    status,
    label,
    score,
    color,
    level: evidence.level,
    proofLines,
    nextAction,
    weaknessReasons: evidence.weaknessReasons.slice(0, 6),
  };
}

export function buildReplayProofTrend(runs = []) {
  const receipts = (Array.isArray(runs) ? runs : [])
    .map((run) => run?.traceReceipt || run?.replayProofReceipt || null)
    .filter((receipt) => receipt && Number.isFinite(Number(receipt.score)))
    .slice(0, 10);
  if (receipts.length === 0) {
    return {
      sampleSize: 0,
      averageScore: 0,
      verifiedCount: 0,
      label: "No proof trend yet",
      detail: "Submit traced runs to build a local proof-quality trend.",
      status: "empty",
      color: "#888",
    };
  }

  const total = receipts.reduce((sum, receipt) => sum + Number(receipt.score), 0);
  const averageScore = Math.round(total / receipts.length);
  const verifiedCount = receipts.filter((receipt) => receipt.status === "verified" || Number(receipt.score) >= 85).length;
  const status = averageScore >= 85 ? "verified-trend" : averageScore >= 55 ? "building-trend" : "thin-trend";
  const color = status === "verified-trend" ? "#00FF88" : status === "building-trend" ? "#FFD700" : "#FF9A3D";
  const label = status === "verified-trend"
    ? "Proof trend strong"
    : status === "building-trend"
      ? "Proof trend building"
      : "Proof trend thin";

  return {
    sampleSize: receipts.length,
    averageScore,
    verifiedCount,
    label,
    detail: `${verifiedCount}/${receipts.length} recent runs verified · ${averageScore}% average proof`,
    status,
    color,
  };
}
