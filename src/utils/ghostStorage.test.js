import { beforeEach, describe, expect, it, vi } from "vitest";
import { createGhostRecorder, recordGhostSample } from "../systems/ghostRecorder.js";
import { loadGhostPlayback, persistGhostRecording } from "./ghostStorage.js";
import { resetStorageHealthForTests } from "./storageHealth.js";

beforeEach(() => {
  sessionStorage.clear();
  resetStorageHealthForTests();
  vi.restoreAllMocks();
});

describe("ghost storage boundary", () => {
  it("preserves the chronological array wire contract", () => {
    const recorder = createGhostRecorder(16);
    for (let frame = 0; frame < 12; frame += 1) recordGhostSample(recorder, { x: frame, y: frame + 1, f: frame * 6 });
    const result = persistGhostRecording("ghost", recorder, { killedByType: 4 });
    expect(result).toMatchObject({ persisted: true, persistenceEligible: true });
    expect(loadGhostPlayback("ghost")).toEqual(result.samples);
    expect(result.samples.at(-1).killedByType).toBe(4);
  });

  it("skips practice and short traces without claiming persistence", () => {
    const recorder = createGhostRecorder(4);
    recordGhostSample(recorder, { x: 1, y: 2, f: 6 });
    expect(persistGhostRecording("ghost", recorder, { practiceRun: true })).toMatchObject({ persisted: false, persistenceEligible: false });
    expect(sessionStorage.getItem("ghost")).toBeNull();
  });

  it("fails open when session storage is denied", () => {
    const recorder = createGhostRecorder(16);
    for (let frame = 0; frame < 12; frame += 1) recordGhostSample(recorder, { x: frame, y: frame, f: frame });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw Object.assign(new Error("private"), { name: "SecurityError" });
    });
    expect(persistGhostRecording("ghost", recorder)).toMatchObject({ persisted: false, persistenceEligible: true });
  });
});
