export const DEFAULT_GHOST_CAPACITY = 18000;

function capacity(value) {
  const number = Math.floor(Number(value));
  return Number.isFinite(number) ? Math.max(1, Math.min(100000, number)) : DEFAULT_GHOST_CAPACITY;
}

function integer(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number) : null;
}

function normalizeSample(sample) {
  const x = integer(sample?.x);
  const y = integer(sample?.y);
  const f = integer(sample?.f);
  if (x == null || y == null || f == null || f < 0) return null;
  const normalized = { x, y, f };
  if (sample?.killedByType != null && Number.isFinite(Number(sample.killedByType))) {
    normalized.killedByType = Math.max(0, Math.floor(Number(sample.killedByType)));
  }
  return normalized;
}

export function createGhostRecorder(maxSamples = DEFAULT_GHOST_CAPACITY) {
  const max = capacity(maxSamples);
  return {
    schemaVersion: "ghost-recorder-v1",
    capacity: max,
    buffer: new Array(max),
    start: 0,
    count: 0,
    overwrites: 0,
    rejected: 0,
  };
}

function isRecorder(recorder) {
  return recorder?.schemaVersion === "ghost-recorder-v1"
    && Array.isArray(recorder.buffer)
    && recorder.buffer.length === recorder.capacity;
}

export function recordGhostSample(recorder, sample) {
  if (!isRecorder(recorder)) return false;
  const normalized = normalizeSample(sample);
  if (!normalized) {
    recorder.rejected += 1;
    return false;
  }
  if (recorder.count < recorder.capacity) {
    recorder.buffer[(recorder.start + recorder.count) % recorder.capacity] = normalized;
    recorder.count += 1;
  } else {
    recorder.buffer[recorder.start] = normalized;
    recorder.start = (recorder.start + 1) % recorder.capacity;
    recorder.overwrites += 1;
  }
  return true;
}

export function exportGhostSamples(recorder) {
  if (!isRecorder(recorder)) return [];
  return Array.from({ length: recorder.count }, (_, index) => ({
    ...recorder.buffer[(recorder.start + index) % recorder.capacity],
  }));
}

export function hydrateGhostRecorder(samples, maxSamples = DEFAULT_GHOST_CAPACITY) {
  const recorder = createGhostRecorder(maxSamples);
  if (Array.isArray(samples)) {
    for (const sample of samples) recordGhostSample(recorder, sample);
  }
  return recorder;
}

export function finalizeGhostRecording(recorder, { killedByType = null } = {}) {
  if (isRecorder(recorder) && recorder.count > 0) {
    const lastIndex = (recorder.start + recorder.count - 1) % recorder.capacity;
    const last = recorder.buffer[lastIndex];
    recorder.buffer[lastIndex] = {
      ...last,
      killedByType: Number.isFinite(Number(killedByType)) ? Math.max(0, Math.floor(Number(killedByType))) : null,
    };
  }
  return {
    samples: exportGhostSamples(recorder),
    receipt: getGhostRecorderReceipt(recorder),
  };
}

export function getGhostRecorderReceipt(recorder) {
  if (!isRecorder(recorder)) {
    return { schemaVersion: "ghost-recorder-v1", valid: false, capacity: 0, count: 0, overwrites: 0, rejected: 0 };
  }
  return {
    schemaVersion: "ghost-recorder-v1",
    valid: true,
    capacity: recorder.capacity,
    count: recorder.count,
    overwrites: recorder.overwrites,
    rejected: recorder.rejected,
    claim: "bounded-chronological-position-samples",
  };
}
