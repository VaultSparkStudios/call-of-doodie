import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createOperationArenaState } from "../systems/operationArenaState.js";
import OperationArenaOverlay from "./OperationArenaOverlay.jsx";

const originalGetGamepads = Object.getOwnPropertyDescriptor(navigator, "getGamepads");

describe("OperationArenaOverlay", () => {
  let container;
  let root;
  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
    vi.useRealTimers();
    if (originalGetGamepads) Object.defineProperty(navigator, "getGamepads", originalGetGamepads);
    else delete navigator.getGamepads;
  });

  function render(props = {}) {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => root.render(
      <OperationArenaOverlay
        arenaState={createOperationArenaState({ width: 960, height: 640, seed: 7 })}
        encounter={{ verb: "BREACH", label: "Open the intake", description: "Choose the assault lane." }}
        objectiveState={{ actionComplete: false, reinforcementCount: 0 }}
        proximitySnapshot={{ available: true, inRange: true, centerDistancePx: 12, distanceToRangePx: 0, direction: "NORTH", reasonCode: "TARGET_IN_RANGE" }}
        progress={{ act: 1, encounterNumber: 1, encounterTotal: 7 }}
        missionScore={125}
        {...props}
      />,
    ));
  }

  it("renders the operation progress and a 48px multi-input action", () => {
    render();
    const button = container.querySelector("[data-testid='operation-interact']");
    expect(container.textContent).toContain("BREACH");
    expect(container.textContent).toContain("1/7");
    expect(button.style.minHeight).toBe("48px");
    expect(container.querySelector("[data-testid='operation-arena-overlay']").style.top).toContain("150px");
    expect(button.textContent).toContain("E / A / USE");
  });

  it("makes the required objective and reinforcement state explicit", () => {
    render({ objectiveState: { actionComplete: false, reinforcementCount: 2 } });
    expect(container.querySelector("[data-testid='operation-objective-status']").textContent).toContain("REINFORCEMENTS 2");
  });

  it("dispatches touch, keyboard, and controller receipts through the same command", () => {
    vi.useFakeTimers();
    const onInteract = vi.fn();
    let controllerPressed = false;
    Object.defineProperty(navigator, "getGamepads", {
      configurable: true,
      value: () => [{ buttons: [{ pressed: controllerPressed }] }],
    });
    render({ onInteract, gamepadConnected: true });
    act(() => container.querySelector("[data-testid='operation-interact']").click());
    expect(onInteract).toHaveBeenLastCalledWith(expect.objectContaining({ targetId: "door-north", command: "open", inputSource: "touch" }));
    act(() => window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyE" })));
    expect(onInteract).toHaveBeenLastCalledWith(expect.objectContaining({ inputSource: "keyboard" }));
    controllerPressed = true;
    act(() => vi.advanceTimersByTime(81));
    expect(onInteract).toHaveBeenLastCalledWith(expect.objectContaining({ inputSource: "controller" }));
    expect(onInteract).toHaveBeenCalledTimes(3);
  });

  it("renders distance and direction while disabling every input out of range", () => {
    vi.useFakeTimers();
    const onInteract = vi.fn();
    Object.defineProperty(navigator, "getGamepads", {
      configurable: true,
      value: () => [{ buttons: [{ pressed: true }] }],
    });
    render({
      onInteract,
      gamepadConnected: true,
      proximitySnapshot: { available: true, inRange: false, centerDistancePx: 144, distanceToRangePx: 120, direction: "NORTH-WEST", reasonCode: "TARGET_OUT_OF_RANGE" },
    });
    const button = container.querySelector("[data-testid='operation-interact']");
    expect(button.disabled).toBe(true);
    expect(container.querySelector("[data-testid='operation-proximity-status']").textContent).toContain("120 PX TO RANGE · MOVE NORTH-WEST");
    act(() => button.click());
    act(() => window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyE" })));
    act(() => vi.advanceTimersByTime(81));
    expect(onInteract).not.toHaveBeenCalled();
  });
});
