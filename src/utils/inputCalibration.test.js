import { describe, expect, it } from "vitest";
import {
  buildInputCalibrationRecord,
  buildInputCalibrationNudge,
  buildInputQaReceipt,
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

  it("builds first-run aim check nudges for unverified and partial calibration", () => {
    expect(buildInputCalibrationNudge(null)).toEqual({
      status: "unverified",
      label: "AIM CHECK 0/4",
      detail: "4 directions left",
      action: "VERIFY",
    });

    expect(buildInputCalibrationNudge(buildInputCalibrationRecord({ buckets: ["east", "north"] }))).toEqual({
      status: "partial",
      label: "AIM CHECK 2/4",
      detail: "2 directions left",
      action: "VERIFY",
    });
  });

  it("builds verified and diagnostics-aware aim check nudges", () => {
    const record = buildInputCalibrationRecord({
      source: "mouse",
      buckets: ["east", "west", "north", "south"],
      timestamp: 123,
    });

    expect(buildInputCalibrationNudge(record)).toEqual({
      status: "verified",
      label: "AIM CHECK VERIFIED",
      detail: "mouse verified",
      action: "READY",
    });
    expect(buildInputCalibrationNudge(record, { debugEnabled: true }).action).toBe("OPEN DIAGNOSTICS");
  });
  it("builds a local input QA receipt from calibration and controller profile", () => {
    const calibration = buildInputCalibrationRecord({
      source: "xbox",
      controllerType: "xbox",
      buckets: ["east", "west", "north", "south"],
      timestamp: 123,
    });
    const receipt = buildInputQaReceipt({
      calibration,
      controllerProfile: { type: "xbox", index: 1 },
      gamepadConnected: true,
      controllerType: "xbox",
      timestamp: 456,
    });

    expect(receipt).toEqual({
      version: 1,
      status: "ready",
      deviceType: "xbox",
      deviceIndex: 1,
      connected: true,
      remembered: true,
      calibrationComplete: true,
      coverage: "four-direction",
      label: "INPUT QA READY",
      summary: "XBOX · four-direction",
      timestamp: 456,
    });
  });

  it("marks partial or missing input QA receipts honestly", () => {
    expect(buildInputQaReceipt()).toMatchObject({
      status: "missing",
      label: "INPUT QA MISSING",
      coverage: "none",
    });
    expect(buildInputQaReceipt({
      calibration: buildInputCalibrationRecord({ buckets: ["east", "north"] }),
      controllerProfile: { type: "ps", index: 0 },
    })).toMatchObject({
      status: "needs-repeat",
      label: "INPUT QA RECHECK",
      deviceType: "ps",
      coverage: "2/4-direction",
    });
  });
});
