import { finalizeGhostRecording } from "../systems/ghostRecorder.js";
import { readJsonState, writeJsonState } from "./storageHealth.js";

// S145 — ghosts survive the tab. Storage moved from sessionStorage to
// localStorage with a bounded per-mode envelope holding the LAST run and the
// BEST run (by score). The rival you race defaults to your best self; the
// recorder's fixed-capacity ring already bounds sample counts.

const GHOST_SCHEMA_VERSION = 2;

function normalizeEnvelope(value) {
  if (!value || typeof value !== "object") return null;
  // v1 payloads were bare sample arrays (sessionStorage era) — treat as last-run.
  if (Array.isArray(value)) {
    return { v: GHOST_SCHEMA_VERSION, last: { samples: value, score: 0, at: 0 }, best: null };
  }
  if (value.v !== GHOST_SCHEMA_VERSION) return null;
  const entry = (record) => (record && Array.isArray(record.samples) && record.samples.length > 0)
    ? { samples: record.samples, score: Math.max(0, Number(record.score) || 0), at: Math.max(0, Number(record.at) || 0) }
    : null;
  return { v: GHOST_SCHEMA_VERSION, last: entry(value.last), best: entry(value.best) };
}

function readEnvelope(key) {
  const result = readJsonState(key, {
    storageType: "local",
    surface: "ghost.playback",
    fallback: null,
  });
  return normalizeEnvelope(result.value);
}

export function loadGhostPlayback(key, { prefer = "best" } = {}) {
  const envelope = readEnvelope(key);
  if (!envelope) return null;
  const pick = prefer === "last"
    ? (envelope.last || envelope.best)
    : (envelope.best || envelope.last);
  return pick ? pick.samples : null;
}

export function loadGhostEnvelope(key) {
  return readEnvelope(key);
}

export function persistGhostRecording(key, recorder, {
  killedByType = null,
  practiceRun = false,
  minimumSamples = 11,
  runScore = 0,
} = {}) {
  const finalized = finalizeGhostRecording(recorder, { killedByType });
  const eligible = !practiceRun && finalized.samples.length >= Math.max(1, Math.floor(Number(minimumSamples) || 11));
  let storage = null;
  let newBest = false;
  if (eligible) {
    const previous = readEnvelope(key);
    const score = Math.max(0, Math.floor(Number(runScore) || 0));
    const record = { samples: finalized.samples, score, at: Date.now() };
    newBest = !previous?.best || score >= previous.best.score;
    const envelope = {
      v: GHOST_SCHEMA_VERSION,
      last: record,
      best: newBest ? record : previous.best,
    };
    storage = writeJsonState(key, envelope, { storageType: "local", surface: "ghost.recording" });
  }
  return {
    ...finalized,
    persisted: Boolean(storage?.ok),
    persistenceEligible: eligible,
    newBestGhost: Boolean(storage?.ok && newBest),
    storageReceipt: storage?.receipt || null,
  };
}
