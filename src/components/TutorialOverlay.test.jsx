import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import TutorialOverlay from "./TutorialOverlay.jsx";
import { TUTORIAL_KEY } from "../utils/tutorialProgress.js";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let container;
let root;

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  sessionStorage.clear();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.useRealTimers();
});

function render(evidence = {}) {
  act(() => {
    root.render(<TutorialOverlay isMobile={false} controllerConnected={false} evidence={evidence} />);
  });
}

describe("TutorialOverlay observed action flow", () => {
  it("does not auto-advance from elapsed time and advances after observed movement", () => {
    render();
    expect(container.textContent).toContain("WELCOME, SOLDIER");
    const next = [...container.querySelectorAll("button")].find((button) => button.textContent.includes("NEXT"));
    act(() => next.click());
    act(() => vi.advanceTimersByTime(200));
    expect(container.textContent).toContain("MOVE");

    act(() => vi.advanceTimersByTime(10_000));
    expect(container.textContent).toContain("WAITING FOR OBSERVED ACTION");
    expect(container.textContent).toContain("MOVE");

    render({ move: true });
    expect(container.textContent).toContain("ACTION OBSERVED");
    act(() => vi.advanceTimersByTime(600));
    expect(container.textContent).toContain("SHOOT + FIRST KILL");
  });

  it("persists explicit skip without claiming action completion", () => {
    render();
    const skip = [...container.querySelectorAll("button")].find((button) => button.textContent === "SKIP");
    act(() => skip.click());
    expect(container.textContent).toBe("");
    expect(localStorage.getItem(TUTORIAL_KEY)).toBe("1");
  });
});
