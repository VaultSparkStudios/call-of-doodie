import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("../utils/inputCalibration.js", () => ({
  buildInputCalibrationRecord: vi.fn((opts) => ({
    version: 1,
    source: opts?.source ?? "mouse",
    buckets: opts?.buckets ?? [],
    complete: (opts?.buckets ?? []).length >= 4,
    timestamp: opts?.timestamp ?? 0,
  })),
  saveInputCalibration: vi.fn((r) => r),
}));

import CalibrationScreen from "./CalibrationScreen.jsx";

const TARGET_IDS = ["north", "east", "south", "west"];

function render(props = {}) {
  const onComplete = vi.fn();
  const onSkip = vi.fn();
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(
      <CalibrationScreen onComplete={onComplete} onSkip={onSkip} isMobile={false} {...props} />
    );
  });
  const getTarget = (id) => container.querySelector(`[data-testid="target-${id}"]`);
  const clickTarget = (id) => act(() => { getTarget(id)?.click(); });
  const getInstruction = () => container.querySelector("[data-testid='calibration-instruction']");
  const getSkip = () => container.querySelector("[data-testid='skip-button']");
  return { container, root, onComplete, onSkip, getTarget, clickTarget, getInstruction, getSkip };
}

describe("CalibrationScreen", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(({ task: _t, ..._ } = {}) => {
    vi.useRealTimers();
    document.body.innerHTML = "";
  });

  it("renders all 4 target nodes", () => {
    const { getTarget } = render();
    for (const id of TARGET_IDS) {
      expect(getTarget(id)).toBeTruthy();
    }
  });

  it("renders initial instruction for desktop", () => {
    const { getInstruction } = render({ isMobile: false });
    expect(getInstruction()?.textContent).toMatch(/CLICK EACH GLOWING TARGET/i);
  });

  it("renders TAP instruction when isMobile is true", () => {
    const { getInstruction } = render({ isMobile: true });
    expect(getInstruction()?.textContent).toMatch(/TAP EACH GLOWING TARGET/i);
  });

  it("shows SKIP button before any target is hit", () => {
    const { getSkip } = render();
    expect(getSkip()).toBeTruthy();
  });

  it("targets start with data-hit=false", () => {
    const { getTarget } = render();
    for (const id of TARGET_IDS) {
      expect(getTarget(id)?.dataset.hit).toBe("false");
    }
  });

  it("clicking SKIP calls onSkip immediately", () => {
    const { getSkip, onSkip } = render();
    act(() => { getSkip()?.click(); });
    expect(onSkip).toHaveBeenCalledTimes(1);
  });

  it("clicking a target marks it as hit", () => {
    const { getTarget, clickTarget } = render();
    clickTarget("north");
    expect(getTarget("north")?.dataset.hit).toBe("true");
  });

  it("other targets remain unhit after clicking one", () => {
    const { getTarget, clickTarget } = render();
    clickTarget("east");
    for (const id of ["north", "south", "west"]) {
      expect(getTarget(id)?.dataset.hit).toBe("false");
    }
  });

  it("clicking the same target twice does not double-count it", () => {
    const { clickTarget, getInstruction } = render();
    clickTarget("east");
    clickTarget("east");
    // Still only east is hit — instruction should say 3 targets left
    expect(getInstruction()?.textContent).toMatch(/3 TARGETS LEFT/i);
  });

  it("shows correct decreasing count as targets are hit", () => {
    const { clickTarget, getInstruction } = render();
    clickTarget("north");
    expect(getInstruction()?.textContent).toMatch(/3 TARGETS LEFT/i);
    clickTarget("east");
    expect(getInstruction()?.textContent).toMatch(/2 TARGETS LEFT/i);
    clickTarget("south");
    expect(getInstruction()?.textContent).toMatch(/ONE TARGET LEFT/i);
  });

  it("calls onComplete after 700ms delay when all 4 targets are hit", () => {
    const { clickTarget, onComplete } = render();
    for (const id of TARGET_IDS) clickTarget(id);
    expect(onComplete).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(800));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("does not call onComplete when only 3 targets are hit", () => {
    const { clickTarget, onComplete } = render();
    for (const id of ["north", "east", "south"]) clickTarget(id);
    act(() => vi.advanceTimersByTime(1000));
    expect(onComplete).not.toHaveBeenCalled();
  });

  it("hides SKIP button and shows completion text after all 4 are hit", () => {
    const { clickTarget, getSkip, getInstruction } = render();
    for (const id of TARGET_IDS) clickTarget(id);
    expect(getSkip()).toBeNull();
    expect(getInstruction()?.textContent).toMatch(/ALL TARGETS HIT/i);
  });
});
