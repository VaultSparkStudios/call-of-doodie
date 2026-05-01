import { describe, it, expect, beforeEach } from "vitest";
import { makeFrameMonitor } from "./useGameLoop.js";

describe("adaptive frame monitor", () => {
  beforeEach(() => {
    if (typeof window !== "undefined") window.__codReducedEffects = false;
  });

  it("does not flip the reduced-effects flag when frames are within budget", () => {
    const m = makeFrameMonitor();
    for (let i = 0; i < 200; i++) m.record(8); // well under 16.67ms
    expect(window.__codReducedEffects).toBeFalsy();
  });

  it("flips reduced-effects on after a sustained window of dropped frames", () => {
    const m = makeFrameMonitor();
    // 130 frames all over budget — ADAPT_WINDOW = 120
    for (let i = 0; i < 130; i++) m.record(25);
    expect(window.__codReducedEffects).toBe(true);
  });

  it("flips reduced-effects back off once frames recover", () => {
    const m = makeFrameMonitor();
    for (let i = 0; i < 130; i++) m.record(25);
    expect(window.__codReducedEffects).toBe(true);
    // Need >1 full ADAPT_WINDOW (120 frames) of clean recordings; the first
    // post-flip window inherits ~10 stragglers from the trigger window so it
    // sits in the hysteresis dead zone. The second window is unambiguous.
    for (let i = 0; i < 260; i++) m.record(8);
    expect(window.__codReducedEffects).toBe(false);
  });

  it("does not flip on a single bad frame", () => {
    const m = makeFrameMonitor();
    m.record(50);
    expect(window.__codReducedEffects).toBeFalsy();
  });
});
