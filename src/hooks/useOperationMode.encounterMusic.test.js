import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { ENCOUNTER_VERBS } from "../systems/operationCampaign.js";
import { OPERATION_ENCOUNTER_MUSIC } from "./useOperationMode.js";

// Mock sounds.js so the module loads without an AudioContext.
vi.mock("../sounds.js", () => ({
  setMusicVibe: vi.fn(),
  soundWaveClear: vi.fn(),
}));

// readPreference is used to check the player's saved vibe (covers pending retro too).
vi.mock("../utils/gamePreferences.js", () => ({ readPreference: vi.fn(() => "action") }));

// Other dependencies needed by useOperationMode.js (not exercised here).
vi.mock("../utils/analytics.js", () => ({ track: vi.fn() }));
vi.mock("../storage.js", () => ({ saveRunToHistory: vi.fn(), saveStudioGameEvent: vi.fn() }));
vi.mock("../utils/runIntelligence.js", () => ({ buildStudioGameEvent: vi.fn(() => ({})) }));
vi.mock("../systems/transientPresentation.js", () => ({ addText: vi.fn() }));
vi.mock("../systems/runIntegrity.js", () => ({ getRunIntegrityReceipt: vi.fn(() => null), recordRunIntegrityFault: vi.fn() }));
vi.mock("../systems/runTermination.js", () => ({ RUN_PHASE: { ENDED: "ended" } }));
vi.mock("../systems/runSession.js", () => ({ createRunHistoryEntry: vi.fn(() => ({})), readRunModeFlags: vi.fn(() => ({})) }));
vi.mock("../systems/missionDirector.js", () => ({ chooseMissionDirective: vi.fn(() => ({ directive: "", reasonCode: "" })) }));
vi.mock("../systems/operationArenaState.js", () => ({
  createOperationArenaState: vi.fn(() => ({ interactables: [], sequence: 0 })),
  applyOperationArenaTransition: vi.fn((state) => state),
  buildOperationArenaReceipt: vi.fn(() => ({ stateFingerprint: "fp" })),
  getOperationArenaCues: vi.fn(() => []),
}));
vi.mock("../utils/operationRivals.js", () => ({
  buildOperationRematchCartridge: vi.fn(() => ({})),
  buildOperationReplayReceipt: vi.fn(() => ({})),
}));

const VALID_VIBES = new Set(["chill", "action", "intense", "retro", "spooky"]);

describe("OPERATION_ENCOUNTER_MUSIC mapping", () => {
  it("covers all seven canonical encounter verbs", () => {
    for (const verb of ENCOUNTER_VERBS) {
      expect(Object.hasOwn(OPERATION_ENCOUNTER_MUSIC, verb)).toBe(true);
    }
    expect(Object.keys(OPERATION_ENCOUNTER_MUSIC)).toHaveLength(ENCOUNTER_VERBS.length);
  });

  it("maps BOSS to null (handled by App.jsx setMusicIntensity)", () => {
    expect(OPERATION_ENCOUNTER_MUSIC.BOSS).toBeNull();
  });

  it("maps every non-BOSS verb to a recognized music vibe", () => {
    for (const [verb, vibe] of Object.entries(OPERATION_ENCOUNTER_MUSIC)) {
      if (verb === "BOSS") continue;
      expect(VALID_VIBES.has(vibe), `${verb} → "${vibe}" is not a valid vibe`).toBe(true);
    }
  });

  it("gives BREACH and SABOTAGE and ESCAPE the high-energy intense vibe", () => {
    expect(OPERATION_ENCOUNTER_MUSIC.BREACH).toBe("intense");
    expect(OPERATION_ENCOUNTER_MUSIC.SABOTAGE).toBe("intense");
    expect(OPERATION_ENCOUNTER_MUSIC.ESCAPE).toBe("intense");
  });

  it("gives HOLD the steady action vibe", () => {
    expect(OPERATION_ENCOUNTER_MUSIC.HOLD).toBe("action");
  });

  it("gives ESCORT the suspense chill vibe", () => {
    expect(OPERATION_ENCOUNTER_MUSIC.ESCORT).toBe("chill");
  });

  it("gives HUNT the stalker spooky vibe", () => {
    expect(OPERATION_ENCOUNTER_MUSIC.HUNT).toBe("spooky");
  });

  it("produces a full seven-chapter arc with at least three distinct vibes", () => {
    const vibesInArc = ENCOUNTER_VERBS
      .map((verb) => OPERATION_ENCOUNTER_MUSIC[verb])
      .filter(Boolean);
    const distinct = new Set(vibesInArc);
    expect(distinct.size).toBeGreaterThanOrEqual(3);
  });
});
