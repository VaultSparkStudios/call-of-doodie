import { describe, expect, it } from "vitest";
import {
  OPERATION_INPUT_AFFORDANCES,
  OPERATION_INTERACTABLE_KINDS,
  applyOperationArenaTransition,
  buildOperationArenaReceipt,
  createOperationArenaState,
  getOperationArenaCues,
  validateOperationArenaState,
} from "./operationArenaState.js";

function transition(state, targetId, command, inputSource = "keyboard") {
  return applyOperationArenaTransition(state, { targetId, command, inputSource, actorId: "operator" });
}

describe("Operation arena state", () => {
  it("builds the complete deterministic, renderer-neutral interactable foundation", () => {
    const first = createOperationArenaState({ width: 960, height: 640, seed: 17 });
    const second = createOperationArenaState({ width: 960, height: 640, seed: 17 });

    expect(second).toEqual(first);
    expect(first.spatialModel).toBe("bounded-2d-interaction-zones-no-3d-physics");
    expect(new Set(first.interactables.map((item) => item.kind))).toEqual(new Set(OPERATION_INTERACTABLE_KINDS));
    expect(first.interactables.filter((item) => item.kind === "extraction-toilet")).toHaveLength(2);
    expect(first.interactables.filter((item) => item.kind === "door")).toHaveLength(2);
    expect(validateOperationArenaState(first)).toEqual({ valid: true, errors: [] });
  });

  it("exposes keyboard, controller, and touch affordances with readable redundant cues", () => {
    const state = createOperationArenaState();
    const cues = getOperationArenaCues(state);

    expect(Object.keys(OPERATION_INPUT_AFFORDANCES)).toEqual(["keyboard", "controller", "touch"]);
    expect(OPERATION_INPUT_AFFORDANCES.touch.minTargetPx).toBeGreaterThanOrEqual(44);
    for (const item of state.interactables) {
      expect(Object.keys(item.inputAffordances)).toEqual(["keyboard", "controller", "touch"]);
    }
    for (const cue of cues) {
      expect(cue.stateLabel.length).toBeGreaterThan(0);
      expect(cue.worldCue.length).toBeGreaterThan(0);
      expect(cue.pattern.length).toBeGreaterThan(0);
      expect(cue.interactionPrompt).toContain("USE");
    }
  });

  it("makes open/close, flood/drain, and power/contaminate transitions visibly explicit", () => {
    let state = createOperationArenaState({ seed: 42 });
    const original = state;

    state = transition(state, "door-north", "open");
    expect(state.interactables.find((item) => item.id === "door-north")).toMatchObject({
      state: "open",
      visual: { stateLabel: "OPEN", worldCue: "Passage clear", pattern: "solid" },
    });
    state = transition(state, "door-north", "close");
    expect(state.interactables.find((item) => item.id === "door-north").state).toBe("closed");

    state = transition(state, "pump-west", "flood", "controller");
    expect(state.interactables.find((item) => item.id === "pump-west")).toMatchObject({
      state: "flooded",
      visual: { stateLabel: "FLOODED", tone: "danger", pattern: "diagonal-stripes" },
    });
    state = transition(state, "pump-west", "drain", "touch");
    expect(state.interactables.find((item) => item.id === "pump-west").state).toBe("drained");

    state = transition(state, "valve-east", "power");
    expect(state.interactables.find((item) => item.id === "valve-east")).toMatchObject({
      state: "powered",
      visual: { stateLabel: "POWERED", worldCue: "Clean pressure online" },
    });
    state = transition(state, "valve-east", "contaminate");
    expect(state.interactables.find((item) => item.id === "valve-east").state).toBe("contaminated");

    expect(original.sequence).toBe(0);
    expect(original.transitionReceipts).toEqual([]);
    expect(state.sequence).toBe(6);
  });

  it("keeps interaction zones and the watchtower v0 footprint inside arena bounds", () => {
    for (const dimensions of [[320, 240], [960, 640], [1920, 1080]]) {
      const [width, height] = dimensions;
      const state = createOperationArenaState({ width, height, seed: 1 });
      for (const item of state.interactables) {
        expect(item.position.x - item.interactionRadius).toBeGreaterThanOrEqual(0);
        expect(item.position.x + item.interactionRadius).toBeLessThanOrEqual(width);
        expect(item.position.y - item.interactionRadius).toBeGreaterThanOrEqual(0);
        expect(item.position.y + item.interactionRadius).toBeLessThanOrEqual(height);
      }
      const tower = state.interactables.find((item) => item.kind === "watchtower");
      expect(tower.watchtowerV0).toEqual({
        footprint: { width: 56, height: 56 },
        viewRadius: 160,
        elevationModel: "abstract-sightline-only",
      });
      expect(validateOperationArenaState(state).valid).toBe(true);
    }
    expect(() => createOperationArenaState({ width: 319, height: 240 })).toThrow(RangeError);
  });

  it("reports tampered bounds and rejects invalid targets, commands, and inputs", () => {
    const state = createOperationArenaState();
    const tampered = {
      ...state,
      interactables: state.interactables.map((item, index) => index === 0
        ? { ...item, position: { x: -10, y: item.position.y } }
        : item),
    };

    expect(validateOperationArenaState(tampered)).toMatchObject({ valid: false });
    expect(validateOperationArenaState(tampered).errors).toContain(
      "interaction zone outside bounds for door-north",
    );
    expect(() => transition(state, "missing", "open")).toThrow(/Unknown Operation interactable/);
    expect(() => transition(state, "door-north", "flood")).toThrow(/not supported/);
    expect(() => transition(state, "door-north", "open", "voice")).toThrow(/Unsupported input source/);
  });

  it("emits replay-stable receipts without time or physics data", () => {
    const play = () => {
      let state = createOperationArenaState({ width: 800, height: 600, seed: 8128 });
      state = transition(state, "door-north", "open");
      state = transition(state, "pump-west", "flood", "controller");
      state = transition(state, "valve-east", "power", "touch");
      state = transition(state, "watchtower-center", "enter");
      return state;
    };
    const first = buildOperationArenaReceipt(play());
    const second = buildOperationArenaReceipt(play());

    expect(second).toEqual(first);
    expect(first).toMatchObject({ schemaVersion: "operation-arena-receipt-v0", sequence: 4 });
    expect(first.contract).toContain("not-rendering-or-3d-physics");
    expect(first.stateFingerprint).toMatch(/^[0-9A-F]{8}$/);
    expect(first.transitionFingerprint).toMatch(/^[0-9A-F]{8}$/);
    expect(first.transitions.map((item) => item.sequence)).toEqual([1, 2, 3, 4]);
    expect(first.transitions[0]).toMatchObject({
      before: { state: "closed", visual: { stateLabel: "CLOSED" } },
      after: { state: "open", visual: { stateLabel: "OPEN" } },
    });
    expect(JSON.stringify(first)).not.toMatch(/timestamp|velocity|gravity|rigidBody/i);
  });
});
