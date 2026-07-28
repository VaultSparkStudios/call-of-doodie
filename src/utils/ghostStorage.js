import { finalizeGhostRecording } from "../systems/ghostRecorder.js";
import { readJsonState, writeJsonState } from "./storageHealth.js";

export function loadGhostPlayback(key) {
  const result = readJsonState(key, {
    storageType: "session",
    surface: "ghost.playback",
    fallback: null,
  });
  return Array.isArray(result.value) ? result.value : null;
}

export function persistGhostRecording(key, recorder, {
  killedByType = null,
  practiceRun = false,
  minimumSamples = 11,
} = {}) {
  const finalized = finalizeGhostRecording(recorder, { killedByType });
  const eligible = !practiceRun && finalized.samples.length >= Math.max(1, Math.floor(Number(minimumSamples) || 11));
  const storage = eligible
    ? writeJsonState(key, finalized.samples, { storageType: "session", surface: "ghost.recording" })
    : null;
  return {
    ...finalized,
    persisted: Boolean(storage?.ok),
    persistenceEligible: eligible,
    storageReceipt: storage?.receipt || null,
  };
}
