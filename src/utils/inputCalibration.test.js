import { describe, expect, it } from "vitest";
import {
  buildInputCalibrationRecord,
  loadInputCalibration,
  saveInputCalibration,
  summarizeInputCalibration,
} from "./inputCalibration.js";

function memoryStorage() {
  const data = new Map();
  return {
    getItem: (key) => data.get(key) || null,
    setItem: (key, value) => data.set(key, value),
  };
}

describe("input calibration", () => {
  it("marks calibration complete only after all four aim buckets are present", () => {
    expect(buildInputCalibrationRecord({ buckets: ["east", "west", "north"] }).complete).toBe(false);
    expect(buildInputCalibrationRecord({ buckets: ["east", "west", "north", "south"] }).complete).toBe(true);
  });

  it("persists local-only calibration records", () => {
    const storage = memoryStorage();
    const record = buildInputCalibrationRecord({
      source: "mouse",
      controllerType: "none",
      buckets: ["east", "west", "north", "south"],
      timestamp: 123,
    });
    saveInputCalibration(record, storage);
    expect(loadInputCalibration(storage)).toEqual(record);
    expect(summarizeInputCalibration(record)).toBe("mouse verified");
  });
});
