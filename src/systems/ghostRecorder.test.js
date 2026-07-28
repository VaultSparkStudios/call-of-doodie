import { describe, expect, it } from "vitest";
import {
  createGhostRecorder,
  exportGhostSamples,
  finalizeGhostRecording,
  getGhostRecorderReceipt,
  hydrateGhostRecorder,
  recordGhostSample,
} from "./ghostRecorder.js";

describe("bounded ghost recorder", () => {
  it("exports chronological samples before and after wraparound", () => {
    const recorder = createGhostRecorder(3);
    for (let frame = 1; frame <= 5; frame += 1) recordGhostSample(recorder, { x: frame, y: frame * 2, f: frame });
    expect(exportGhostSamples(recorder)).toEqual([
      { x: 3, y: 6, f: 3 },
      { x: 4, y: 8, f: 4 },
      { x: 5, y: 10, f: 5 },
    ]);
    expect(getGhostRecorderReceipt(recorder)).toMatchObject({ count: 3, capacity: 3, overwrites: 2, rejected: 0 });
  });

  it("normalizes finite samples and rejects malformed evidence", () => {
    const recorder = createGhostRecorder(2);
    expect(recordGhostSample(recorder, { x: 1.4, y: 2.6, f: 3.2 })).toBe(true);
    expect(recordGhostSample(recorder, { x: Infinity, y: 2, f: 4 })).toBe(false);
    expect(exportGhostSamples(recorder)).toEqual([{ x: 1, y: 3, f: 3 }]);
    expect(getGhostRecorderReceipt(recorder).rejected).toBe(1);
  });

  it("marks only the terminal sample and preserves the array wire shape", () => {
    const recorder = hydrateGhostRecorder([{ x: 1, y: 2, f: 6 }, { x: 3, y: 4, f: 12 }], 4);
    const result = finalizeGhostRecording(recorder, { killedByType: 9 });
    expect(result.samples).toEqual([{ x: 1, y: 2, f: 6 }, { x: 3, y: 4, f: 12, killedByType: 9 }]);
    expect(JSON.parse(JSON.stringify(result.samples))).toEqual(result.samples);
  });
});
