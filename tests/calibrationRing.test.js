import { describe, expect, it } from "vitest";
import {
  CALIBRATION_BUCKETS,
  buildCalibrationRingState,
  buildCalibrationRingRecord,
  getCoveredBuckets,
  isCalibrationRingComplete,
  registerCalibrationHit,
} from "../src/utils/calibrationRing.js";

describe("calibrationRing", () => {
  it("starts with no covered buckets", () => {
    const state = buildCalibrationRingState();
    expect(isCalibrationRingComplete(state)).toBe(false);
    expect(getCoveredBuckets(state)).toEqual([]);
  });

  it("registers a hit on a valid bucket", () => {
    let state = buildCalibrationRingState();
    state = registerCalibrationHit(state, "north");
    expect(state.covered.has("north")).toBe(true);
    expect(isCalibrationRingComplete(state)).toBe(false);
  });

  it("ignores invalid bucket names", () => {
    let state = buildCalibrationRingState();
    state = registerCalibrationHit(state, "diagonal");
    expect(getCoveredBuckets(state)).toEqual([]);
  });

  it("is not mutated by registerCalibrationHit — returns new state", () => {
    const original = buildCalibrationRingState();
    const next = registerCalibrationHit(original, "east");
    expect(original.covered.has("east")).toBe(false);
    expect(next.covered.has("east")).toBe(true);
  });

  it("deduplicates repeated hits on the same bucket", () => {
    let state = buildCalibrationRingState();
    state = registerCalibrationHit(state, "south");
    state = registerCalibrationHit(state, "south");
    expect(getCoveredBuckets(state)).toEqual(["south"]);
  });

  it("completes only when all four buckets are covered", () => {
    let state = buildCalibrationRingState();
    for (const b of ["north", "east", "west"]) state = registerCalibrationHit(state, b);
    expect(isCalibrationRingComplete(state)).toBe(false);
    state = registerCalibrationHit(state, "south");
    expect(isCalibrationRingComplete(state)).toBe(true);
  });

  it("getCoveredBuckets preserves canonical CALIBRATION_BUCKETS order", () => {
    let state = buildCalibrationRingState();
    // add in reverse order
    for (const b of ["west", "south", "east", "north"]) state = registerCalibrationHit(state, b);
    expect(getCoveredBuckets(state)).toEqual(CALIBRATION_BUCKETS);
  });

  it("buildCalibrationRingRecord produces a complete record when all buckets hit", () => {
    let state = buildCalibrationRingState();
    for (const b of CALIBRATION_BUCKETS) state = registerCalibrationHit(state, b);
    const record = buildCalibrationRingRecord(state, { source: "touch", controllerType: "none", timestamp: 42 });
    expect(record.complete).toBe(true);
    expect(record.source).toBe("touch");
    expect(record.timestamp).toBe(42);
    // buildInputCalibrationRecord sorts buckets alphabetically
    expect(record.buckets.sort()).toEqual([...CALIBRATION_BUCKETS].sort());
  });

  it("buildCalibrationRingRecord marks incomplete when partial coverage", () => {
    let state = buildCalibrationRingState();
    state = registerCalibrationHit(state, "north");
    const record = buildCalibrationRingRecord(state, { source: "mouse" });
    expect(record.complete).toBe(false);
    expect(record.buckets).toEqual(["north"]);
  });
});
