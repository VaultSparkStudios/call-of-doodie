import { describe, expect, it } from "vitest";
import {
  completeTutorial,
  markTutorialAction,
  normalizeTutorialEvidence,
  resetTutorialProgress,
  shouldShowTutorial,
  tutorialStepComplete,
  TUTORIAL_KEY,
} from "./tutorialProgress.js";

function fakeWindow(search = "") {
  const data = new Map();
  const storage = {
    getItem: (key) => data.get(key) || null,
    setItem: (key, value) => data.set(key, value),
    removeItem: (key) => data.delete(key),
  };
  return { location: { search }, localStorage: storage, sessionStorage: storage, data };
}

describe("observed tutorial progress", () => {
  it("records only the bounded action vocabulary", () => {
    const moved = markTutorialAction({}, "move");
    expect(moved).toEqual({ move: true, shoot: false, kill: false, dash: false, grenade: false, perk: false });
    expect(markTutorialAction(moved, "secret-action")).toEqual(moved);
    expect(normalizeTutorialEvidence({ move: 1, unknown: true })).not.toHaveProperty("unknown");
  });

  it("requires every named observation for compound steps", () => {
    expect(tutorialStepComplete(["shoot", "kill"], { shoot: true })).toBe(false);
    expect(tutorialStepComplete(["shoot", "kill"], { shoot: true, kill: true })).toBe(true);
    expect(tutorialStepComplete(null, { move: true })).toBe(false);
  });

  it("supports completion, reset, and explicit replay query semantics", () => {
    const win = fakeWindow();
    expect(shouldShowTutorial(win)).toBe(true);
    completeTutorial(win);
    expect(win.data.get(TUTORIAL_KEY)).toBe("1");
    expect(shouldShowTutorial(win)).toBe(false);
    resetTutorialProgress(win);
    expect(shouldShowTutorial(win)).toBe(true);
    completeTutorial(win);
    expect(shouldShowTutorial(fakeWindow("?tutorial=1"))).toBe(true);
  });
});
