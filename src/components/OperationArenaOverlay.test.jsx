import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createOperationArenaState } from "../systems/operationArenaState.js";
import OperationArenaOverlay from "./OperationArenaOverlay.jsx";

describe("OperationArenaOverlay", () => {
  let container;
  let root;
  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
  });

  function render(props = {}) {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => root.render(
      <OperationArenaOverlay
        arenaState={createOperationArenaState({ width: 960, height: 640, seed: 7 })}
        encounter={{ verb: "BREACH", label: "Open the intake", description: "Choose the assault lane." }}
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

  it("dispatches touch and keyboard receipts through the same command", () => {
    const onInteract = vi.fn();
    render({ onInteract });
    act(() => container.querySelector("[data-testid='operation-interact']").click());
    expect(onInteract).toHaveBeenLastCalledWith(expect.objectContaining({ targetId: "door-north", command: "open", inputSource: "touch" }));
    act(() => window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyE" })));
    expect(onInteract).toHaveBeenLastCalledWith(expect.objectContaining({ inputSource: "keyboard" }));
  });
});
