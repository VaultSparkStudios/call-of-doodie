import { buildInputCalibrationRecord } from "./inputCalibration.js";

export const CALIBRATION_BUCKETS = ["north", "east", "south", "west"];

export function buildCalibrationRingState() {
  return { covered: new Set() };
}

export function registerCalibrationHit(state, bucket) {
  if (!CALIBRATION_BUCKETS.includes(bucket)) return state;
  const covered = new Set(state.covered);
  covered.add(bucket);
  return { ...state, covered };
}

export function isCalibrationRingComplete(state) {
  return CALIBRATION_BUCKETS.every((b) => state.covered.has(b));
}

export function getCoveredBuckets(state) {
  return CALIBRATION_BUCKETS.filter((b) => state.covered.has(b));
}

export function buildCalibrationRingRecord(state, { source = "mouse", controllerType = "none", timestamp = Date.now() } = {}) {
  return buildInputCalibrationRecord({
    source,
    controllerType,
    buckets: getCoveredBuckets(state),
    timestamp,
  });
}
