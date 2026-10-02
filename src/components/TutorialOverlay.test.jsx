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
    expect(container.textContent).toContain("Move");

    act(() => vi.advanceTimersByTime(10_000));
    expect(container.textContent).toContain("Move");

    render({ move: true });
    expect(container.textContent).toContain("Nice. Keep moving.");
    act(() => vi.advanceTimersByTime(600));
    expect(container.textContent).toContain("Fire and defeat one enemy");
  });

  it("persists explicit skip without claiming action completion", () => {
    render();
    const skip = [...container.querySelectorAll("button")].find((button) => button.textContent === "Skip");
    act(() => skip.click());
    expect(container.textContent).toBe("");
    expect(localStorage.getItem(TUTORIAL_KEY)).toBe("1");
  });

  it("keeps the five combat-training prompts tied to observed actions", () => {
    const evidence = {};
    const steps = [
      { action: { move: true }, next: "Fire and defeat one enemy" },
      { action: { shoot: true, kill: true }, next: "Dash" },
      { action: { dash: true }, next: "Throw a grenade" },
      { action: { grenade: true }, next: "Choose an upgrade" },
    ];
    render(evidence);
    expect(container.textContent).toContain("Move");
    for (const { action, next } of steps) {
      Object.assign(evidence, action);
      render(evidence);
      act(() => vi.advanceTimersByTime(600));
      expect(container.textContent).toContain(next);
    }
    evidence.perk = true;
    render(evidence);
    act(() => vi.advanceTimersByTime(700));
    expect(container.textContent).toBe("");
  });
});


