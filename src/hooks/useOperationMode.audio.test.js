import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  readPreference: vi.fn(),
  setMusicVibe: vi.fn(),
}));

vi.mock("../utils/gamePreferences.js", () => ({ readPreference: mocks.readPreference }));
vi.mock("../audio/soundFacade.js", () => ({
  setMusicVibe: mocks.setMusicVibe,
  soundOperationObjective: vi.fn(),
  soundOperationReinforcement: vi.fn(),
  soundWaveClear: vi.fn(),
}));

import { applyOperationEncounterScore, restoreOperationPlayerScore } from "./useOperationMode.js";

describe("Operation score lifecycle boundary", () => {
  beforeEach(() => {
    mocks.readPreference.mockReset();
    mocks.setMusicVibe.mockReset();
  });

  it("adapts the default Action preference for an authored chapter", () => {
    mocks.readPreference.mockReturnValue("action");
    expect(applyOperationEncounterScore("HUNT")).toMatchObject({ targetVibe: "spooky", reasonCode: "OPERATION_SCORE_APPLIED" });
    expect(mocks.setMusicVibe).toHaveBeenCalledExactlyOnceWith("spooky");
  });

  it("preserves every explicit non-default preference", () => {
    mocks.readPreference.mockReturnValue("chill");
    expect(applyOperationEncounterScore("BREACH")).toMatchObject({ targetVibe: null, reasonCode: "PLAYER_VIBE_PRESERVED" });
    expect(mocks.setMusicVibe).not.toHaveBeenCalled();
  });

  it("leaves the boss chapter to the existing runtime intensity path", () => {
    mocks.readPreference.mockReturnValue("action");
    expect(applyOperationEncounterScore("BOSS")).toMatchObject({ targetVibe: null, reasonCode: "BOSS_SCORE_OWNED_BY_RUNTIME" });
    expect(mocks.setMusicVibe).not.toHaveBeenCalled();
  });

  it("restores the saved preference and falls back to Action for a fresh player", () => {
    mocks.readPreference.mockReturnValueOnce("retro").mockReturnValueOnce(null);
    expect(restoreOperationPlayerScore()).toBe("retro");
    expect(restoreOperationPlayerScore()).toBe("action");
    expect(mocks.setMusicVibe.mock.calls).toEqual([["retro"], ["action"]]);
  });
});
