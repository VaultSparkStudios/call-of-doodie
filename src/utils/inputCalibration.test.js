import { describe, expect, it } from "vitest";
import {
  aimBucketFromKey,
  aimBucketFromVector,
  buildInputCalibrationRecord,
  INPUT_CALIBRATION_TTL_MS,
  buildInputCalibrationNudge,
  buildInputQaReceipt,
  loadInputCalibration,
  mergeAimCalibrationEvidence,
  resolveAimCalibrationSource,
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
  it("maps observed keyboard and vector input into aim buckets", () => {
    expect(["w", "ArrowUp", "d", "ArrowRight", "s", "ArrowDown", "a", "ArrowLeft"].map(aimBucketFromKey)).toEqual([
      "north", "north", "east", "east", "south", "south", "west", "west",
    ]);
    expect(aimBucketFromKey("Enter")).toBeNull();
    expect(aimBucketFromVector(0.2, 0.1)).toBeNull();
    expect(aimBucketFromVector(0.9, 0.2)).toBe("east");
    expect(aimBucketFromVector(-0.9, 0.2)).toBe("west");
    expect(aimBucketFromVector(0.2, -0.9)).toBe("north");
    expect(aimBucketFromVector(0.2, 0.9)).toBe("south");
  });

  it("deduplicates observed evidence and fails closed until all buckets exist", () => {
    let evidence = mergeAimCalibrationEvidence({}, "north", "keyboard");
    evidence = mergeAimCalibrationEvidence(evidence, "north", "keyboard");
    evidence = mergeAimCalibrationEvidence(evidence, "east", "mouse");
    expect(evidence).toEqual({ buckets: ["north", "east"], sources: ["keyboard", "mouse"], complete: false });
    evidence = mergeAimCalibrationEvidence(evidence, "south", "mouse");
    evidence = mergeAimCalibrationEvidence(evidence, "west", "mouse");
    expect(evidence.complete).toBe(true);
    expect(resolveAimCalibrationSource(evidence.sources)).toBe("mixed");
    expect(resolveAimCalibrationSource(["gamepad", "gamepad"])).toBe("gamepad");
    expect(resolveAimCalibrationSource([])).toBe("unknown");
  });

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

    expect(buildInputCalibrationNudge(record, { now: 124 })).toEqual({
      status: "verified",
      label: "AIM CHECK VERIFIED",
      detail: "mouse verified",
      action: "READY",
    });
    expect(buildInputCalibrationNudge(record, { debugEnabled: true, now: 124 }).action).toBe("OPEN DIAGNOSTICS");
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
      now: 124,
    });

    expect(receipt).toEqual({
      version: 1,
      status: "ready",
      deviceType: "xbox",
      deviceIndex: 1,
      connected: true,
      remembered: true,
      calibrationComplete: true,
      calibrationFresh: true,
      calibrationAgeDays: 0,
      coverage: "four-direction",
      label: "INPUT QA READY",
      summary: "XBOX · four-direction",
      timestamp: 456,
    });
  });

  it("expires old calibration evidence instead of showing INPUT QA READY forever", () => {
    const calibration = buildInputCalibrationRecord({
      source: "keyboard",
      buckets: ["east", "west", "north", "south"],
      timestamp: 1000,
    });
    const now = 1001 + INPUT_CALIBRATION_TTL_MS;
    expect(buildInputCalibrationNudge(calibration, { now })).toEqual({
      status: "stale",
      label: "AIM CHECK EXPIRED",
      detail: "reverify after 30 days",
      action: "VERIFY",
    });
    expect(buildInputQaReceipt({ calibration, now })).toMatchObject({
      status: "needs-repeat",
      calibrationComplete: true,
      calibrationFresh: false,
      label: "INPUT QA RECHECK",
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
