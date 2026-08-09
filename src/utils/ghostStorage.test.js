import { beforeEach, describe, expect, it, vi } from "vitest";
import { createGhostRecorder, recordGhostSample } from "../systems/ghostRecorder.js";
import { loadGhostEnvelope, loadGhostPlayback, persistGhostRecording } from "./ghostStorage.js";
import { resetStorageHealthForTests } from "./storageHealth.js";

function recordedRun(samples = 12, capacity = 16) {
  const recorder = createGhostRecorder(capacity);
  for (let frame = 0; frame < samples; frame += 1) recordGhostSample(recorder, { x: frame, y: frame + 1, f: frame * 6 });
  return recorder;
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  resetStorageHealthForTests();
  vi.restoreAllMocks();
});

describe("ghost storage boundary (S145 — persistent localStorage envelope)", () => {
  it("preserves the chronological sample wire contract", () => {
    const result = persistGhostRecording("ghost", recordedRun(), { killedByType: 4, runScore: 500 });
    expect(result).toMatchObject({ persisted: true, persistenceEligible: true, newBestGhost: true });
    expect(loadGhostPlayback("ghost")).toEqual(result.samples);
    expect(result.samples.at(-1).killedByType).toBe(4);
  });

  it("persists to localStorage so ghosts survive the tab", () => {
    persistGhostRecording("ghost", recordedRun(), { runScore: 100 });
    expect(localStorage.getItem("ghost")).not.toBeNull();
    expect(sessionStorage.getItem("ghost")).toBeNull();
  });

  it("keeps the best-scoring run as the default rival", () => {
    persistGhostRecording("ghost", recordedRun(12), { runScore: 900 });
    const weaker = persistGhostRecording("ghost", recordedRun(14), { runScore: 300 });
    expect(weaker.newBestGhost).toBe(false);
    const envelope = loadGhostEnvelope("ghost");
    expect(envelope.best.score).toBe(900);
    expect(envelope.last.score).toBe(300);
    expect(loadGhostPlayback("ghost")).toEqual(envelope.best.samples);
    expect(loadGhostPlayback("ghost", { prefer: "last" })).toEqual(envelope.last.samples);
  });

  it("promotes a new best when the score is beaten", () => {
    persistGhostRecording("ghost", recordedRun(12), { runScore: 100 });
    const stronger = persistGhostRecording("ghost", recordedRun(14), { runScore: 700 });
    expect(stronger.newBestGhost).toBe(true);
    expect(loadGhostEnvelope("ghost").best.score).toBe(700);
  });

  it("reads legacy bare-array payloads as a last-run ghost", () => {
    const samples = [{ x: 1, y: 2, f: 6 }, { x: 2, y: 3, f: 12 }];
    localStorage.setItem("ghost", JSON.stringify(samples));
    expect(loadGhostPlayback("ghost")).toEqual(samples);
  });

  it("skips practice and short traces without claiming persistence", () => {
    const recorder = createGhostRecorder(4);
    recordGhostSample(recorder, { x: 1, y: 2, f: 6 });
    expect(persistGhostRecording("ghost", recorder, { practiceRun: true })).toMatchObject({ persisted: false, persistenceEligible: false });
    expect(localStorage.getItem("ghost")).toBeNull();
  });

  it("returns null for corrupt payloads instead of throwing", () => {
    localStorage.setItem("ghost", "{not json");
    expect(loadGhostPlayback("ghost")).toBeNull();
    localStorage.setItem("ghost", JSON.stringify({ v: 99, weird: true }));
    expect(loadGhostPlayback("ghost")).toBeNull();
  });

  it("fails open when storage is denied", () => {
    const recorder = recordedRun();
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw Object.assign(new Error("private"), { name: "SecurityError" });
    });
    expect(persistGhostRecording("ghost", recorder)).toMatchObject({ persisted: false, persistenceEligible: true });
  });
});
