import { afterEach, describe, expect, it, vi } from "vitest";
import { loadControllerProfile } from "./gamepad.js";
import { loadInputCalibration, saveInputCalibration } from "./inputCalibration.js";
import { loadPwaInstallAttempt } from "./pwaInstallReadiness.js";
import { loadMasteryTrail } from "./masteryTrail.js";
import { loadOperationCampaignProgress } from "./operationCampaignProgress.js";
import { getSquadCode } from "./squads.js";
import { isSupporter, saveVerifiedSupporter } from "./supporter.js";
import { applyTheme } from "./theme.js";
import { isHudDebugEnabled } from "./hudLayout.js";
import { loadPlaytestFlight, loadPlaytestPulse, savePlaytestFlight, setPlaytestPulseEnabled } from "./playtestFlightRecorder.js";
import { hasDailyChallengeSubmitted } from "../storage.js";
import { readRecentRunVoices, rememberRunVoice } from "./runVoice.js";
import { completeTutorial, resetTutorialProgress, shouldShowTutorial } from "./tutorialProgress.js";
import { planPanelRecovery } from "./asyncPanelRecovery.js";

function deny(key) {
  vi.spyOn(globalThis, key, "get").mockImplementation(() => {
    throw new DOMException("Browser storage denied", "SecurityError");
  });
}
afterEach(() => vi.restoreAllMocks());

describe("optional persistence with denied browser storage", () => {
  it("keeps daily entry, defeat flavor, tutorial and panel recovery optional", () => {
    deny("localStorage"); deny("sessionStorage");
    expect(hasDailyChallengeSubmitted()).toBe(false);
    expect(readRecentRunVoices()).toEqual([]);
    expect(() => rememberRunVoice("opening-receipt")).not.toThrow();
    expect(() => completeTutorial()).not.toThrow();
    expect(resetTutorialProgress()).toBe(true);
    expect(shouldShowTutorial()).toBe(true);
    expect(planPanelRecovery()).toEqual({ action: "reload", retryAfterMs: 0 });
  });
  it("still completes the tutorial in session storage when local access is denied", () => {
    const store = { getItem: vi.fn(() => null), setItem: vi.fn(), removeItem: vi.fn() };
    const win = { get localStorage() { throw new DOMException("denied", "SecurityError"); }, sessionStorage: store };
    completeTutorial(win);
    expect(store.setItem).toHaveBeenCalledWith("cod-tutorial-v2", "1");
    resetTutorialProgress(win);
    expect(store.removeItem).toHaveBeenCalledWith("cod-tutorial-v2");
  });
  it.each([
    ["controller", () => loadControllerProfile(), null],
    ["calibration", () => loadInputCalibration(), null],
    ["install", () => loadPwaInstallAttempt(), null],
    ["mastery", () => loadMasteryTrail(), null],
    ["squad", () => getSquadCode(), ""],
    ["supporter", () => isSupporter("Guest"), false],
  ])("uses the unavailable %s fallback", (_, read, fallback) => {
    deny("localStorage");
    expect(read()).toBe(fallback);
  });
  it("starts an empty campaign and pulse without local storage", () => {
    deny("localStorage");
    expect(loadOperationCampaignProgress()).toMatchObject({ completions: [] });
    expect(loadPlaytestPulse()).toMatchObject({ sampleSize: 0 });
  });
  it("does not report denied flight persistence or pulse opt-in as successful", () => {
    deny("localStorage"); deny("sessionStorage");
    expect(loadPlaytestFlight()).toBeNull();
    expect(savePlaytestFlight({ schemaVersion: "playtest-flight-v1" })).toBe(false);
    expect(setPlaytestPulseEnabled(true)).toBe(false);
  });
  it("applies a theme and query debug flag without needing storage", () => {
    deny("localStorage");
    expect(applyTheme("porcelain-day", { persist: false })).toBe("porcelain-day");
    expect(document.documentElement.dataset.codTheme).toBe("porcelain-day");
    expect(isHudDebugEnabled("?debug=hud")).toBe(true);
  });
  it("preserves explicit storage injection even if the browser getter throws", () => {
    deny("localStorage");
    const record = { version: 1, complete: true, buckets: ["north", "east", "south", "west"] };
    const data = new Map();
    const store = { getItem: key => data.get(key), setItem: (key, value) => data.set(key, value) };
    expect(saveInputCalibration(record, store)).toBe(record);
    expect(loadInputCalibration(store)).toEqual(record);
    expect(loadControllerProfile(null)).toBeNull();
  });
  it("keeps method-level failures optional and supporter verification closed", () => {
    const store = { getItem() { throw new DOMException("denied", "SecurityError"); }, setItem() { throw new DOMException("full", "QuotaExceededError"); } };
    expect(loadControllerProfile(store)).toBeNull();
    expect(loadInputCalibration(store)).toBeNull();
    expect(() => saveInputCalibration({ version: 1 }, store)).not.toThrow();
    expect(saveVerifiedSupporter("Guest", store)).toBeNull();
    expect(isSupporter("Guest", store)).toBe(false);
    expect(savePlaytestFlight({}, store)).toBe(false);
  });
});
