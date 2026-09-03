import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OPERATIONS } from "../systems/operationCampaign.js";
import { getCurrentEncounter } from "../systems/operationDirector.js";
import { getOperationEncounterAction } from "../systems/operationEncounterContract.js";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const mocks = vi.hoisted(() => ({
  addText: vi.fn(),
  setMusicVibe: vi.fn(),
  soundOperationObjective: vi.fn(),
  soundOperationReinforcement: vi.fn(),
  readPreference: vi.fn(() => "action"),
}));

vi.mock("../audio/soundFacade.js", () => ({
  setMusicVibe: mocks.setMusicVibe,
  soundOperationObjective: mocks.soundOperationObjective,
  soundOperationReinforcement: mocks.soundOperationReinforcement,
  soundWaveClear: vi.fn(),
}));
vi.mock("../utils/gamePreferences.js", () => ({ readPreference: mocks.readPreference }));
vi.mock("../utils/analytics.js", () => ({ track: vi.fn() }));
vi.mock("../storage.js", () => ({ saveRunToHistory: vi.fn(), saveStudioGameEvent: vi.fn() }));
vi.mock("../utils/runIntelligence.js", () => ({ buildStudioGameEvent: vi.fn(() => ({})) }));
vi.mock("../systems/transientPresentation.js", () => ({ addText: mocks.addText }));
vi.mock("../systems/runIntegrity.js", () => ({ getRunIntegrityReceipt: vi.fn(() => null), recordRunIntegrityFault: vi.fn() }));
vi.mock("../systems/runSession.js", () => ({ createRunHistoryEntry: vi.fn(() => ({})), readRunModeFlags: vi.fn(() => ({})) }));
vi.mock("../utils/operationCampaignProgress.js", () => ({
  deriveOperationCampaignCarryIn: vi.fn(() => null),
  loadOperationCampaignProgress: vi.fn(() => ({ completions: [] })),
  recordOperationCompletion: vi.fn((state) => state),
  saveOperationCampaignProgress: vi.fn(),
}));

import { useOperationMode } from "./useOperationMode.js";

let root;
let host;
let operationApi;

function Harness({ hookProps }) {
  operationApi = useOperationMode(hookProps);
  return null;
}

function mountOperation(overrides = {}) {
  const gsRef = { current: null };
  const hookProps = {
    gsRef,
    sizeRef: { current: { w: 960, h: 540 } },
    frameMonitorRef: { current: null },
    startTimeRef: { current: Date.now() },
    difficultyRef: { current: "normal" },
    statsRef: { current: {} },
    activePerksRef: { current: [] },
    modeRefs: [],
    setScore: vi.fn(),
    setHealth: vi.fn(),
    setPaused: vi.fn(),
    setPauseReason: vi.fn(),
    setLiveAnnounce: vi.fn(),
    ...overrides,
  };
  host = document.createElement("div");
  root = createRoot(host);
  act(() => root.render(<Harness hookProps={hookProps} />));
  let modeState;
  act(() => {
    modeState = operationApi.start({ operation: OPERATIONS[0], seed: OPERATIONS[0].seed });
  });
  gsRef.current = {
    ...modeState,
    score: 0,
    currentWave: 1,
    enemies: [],
    player: { x: 200, y: 200, health: 100, maxHealth: 100 },
    _waveTransitDone: false,
    _respiteLock: false,
  };
  return { gsRef, hookProps };
}

beforeEach(() => {
  for (const mock of Object.values(mocks)) if (typeof mock.mockClear === "function") mock.mockClear();
  mocks.readPreference.mockReturnValue("action");
});

afterEach(() => {
  if (root) act(() => root.unmount());
  root = null;
  host = null;
  operationApi = null;
});

describe("Operation objective audio integration", () => {
  it("rejects malformed actions and cues the exact accepted action only once", () => {
    const { gsRef, hookProps } = mountOperation();
    const encounter = getCurrentEncounter(operationApi.stateRef.current);
    const action = getOperationEncounterAction(encounter);

    act(() => operationApi.interact({ ...action, targetId: "pump-west", inputSource: "keyboard" }));
    expect(mocks.soundOperationObjective).not.toHaveBeenCalled();
    expect(hookProps.setLiveAnnounce).not.toHaveBeenCalled();

    const target = operationApi.arenaRef.current.interactables.find((item) => item.id === action.targetId);
    Object.assign(gsRef.current.player, target.position);
    let accepted;
    let duplicate;
    act(() => { accepted = operationApi.interact({ ...action, inputSource: "keyboard" }); });
    act(() => { duplicate = operationApi.interact({ ...action, inputSource: "keyboard" }); });
    expect(accepted).toMatchObject({ accepted: true, reasonCode: "INTERACTION_ACCEPTED", proximity: { inRange: true } });
    expect(duplicate).toMatchObject({ accepted: false, reasonCode: "INTERACTION_DUPLICATE", proximity: { inRange: true } });
    expect(mocks.soundOperationObjective).toHaveBeenCalledExactlyOnceWith(encounter.verb);
    expect(hookProps.setLiveAnnounce).toHaveBeenCalledExactlyOnceWith(`${action.label} confirmed. ${action.benefit}`);
  });

  it("rejects a correct action outside its live radius with a bounded navigation snapshot", () => {
    const { hookProps } = mountOperation();
    const encounter = getCurrentEncounter(operationApi.stateRef.current);
    const action = getOperationEncounterAction(encounter);
    let result;

    act(() => { result = operationApi.interact({ ...action, inputSource: "touch" }); });

    expect(result).toMatchObject({
      accepted: false,
      reasonCode: "TARGET_OUT_OF_RANGE",
      proximity: { available: true, inRange: false, direction: "NORTH-EAST" },
    });
    expect(result.proximity.distanceToRangePx).toBeGreaterThan(0);
    expect(operationApi.objectiveRef.current.actionComplete).toBe(false);
    expect(mocks.soundOperationObjective).not.toHaveBeenCalled();
    expect(hookProps.setLiveAnnounce).toHaveBeenCalledWith(expect.stringContaining("out of range"));
  });

  it("fails closed for stale transit state before proximity or objective mutation", () => {
    const { gsRef } = mountOperation();
    const encounter = getCurrentEncounter(operationApi.stateRef.current);
    const action = getOperationEncounterAction(encounter);
    const target = operationApi.arenaRef.current.interactables.find((item) => item.id === action.targetId);
    Object.assign(gsRef.current.player, target.position);
    gsRef.current._waveTransitDone = true;
    let result;

    act(() => { result = operationApi.interact({ ...action, inputSource: "controller" }); });

    expect(result).toEqual({ accepted: false, reasonCode: "INTERACTION_STALE", proximity: null });
    expect(operationApi.objectiveRef.current.actionComplete).toBe(false);
    expect(mocks.soundOperationObjective).not.toHaveBeenCalled();
  });

  it("emits one bounded warning for an arena clear before the authored action", () => {
    const { gsRef, hookProps } = mountOperation();
    const encounter = getCurrentEncounter(operationApi.stateRef.current);
    const action = getOperationEncounterAction(encounter);

    let result;
    act(() => { result = operationApi.resolveWave({ player: gsRef.current.player }); });
    expect(result).toMatchObject({ handled: true, completed: false, blocked: true });
    expect(mocks.soundOperationReinforcement).toHaveBeenCalledExactlyOnceWith(1);
    expect(hookProps.setLiveAnnounce).toHaveBeenCalledWith(`${action.label} required. Reinforcements 1.`);
  });

  it("feeds bounded build and recent-damage evidence into the live Mission Director", () => {
    const { gsRef } = mountOperation({
      activePerksRef: { current: [{ id: "eagle_eye" }, { id: "penetrator" }, { id: "overclocked" }] },
    });
    const encounter = getCurrentEncounter(operationApi.stateRef.current);
    const action = getOperationEncounterAction(encounter);
    const target = operationApi.arenaRef.current.interactables.find((item) => item.id === action.targetId);
    Object.assign(gsRef.current.player, target.position);
    gsRef.current.damageSequence = {
      schemaVersion: "damage-sequence-v1",
      events: [{ kind: "projectile", sourceName: "Hall Monitor" }],
    };

    act(() => operationApi.interact({ ...action, inputSource: "controller" }));

    expect(operationApi.directive).toMatchObject({
      reasonCode: "DIRECTOR_DAMAGE_RESPONSE",
      difficultyChange: "none-player-opt-in-only",
    });
  });
});
