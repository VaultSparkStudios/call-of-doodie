import { describe, it, expect, beforeEach } from "vitest";
import { makeFrameMonitor, resolvePerfStep, runFrameSafely, runMeasuredFrame, PERF_STEP_MAX } from "./useGameLoop.js";

describe("degradation ladder resolver (S145)", () => {
  it("escalates one step per sustained-drop window and caps at max", () => {
    expect(resolvePerfStep(0, 0.25)).toBe(1);
    expect(resolvePerfStep(1, 0.25)).toBe(2);
    expect(resolvePerfStep(2, 0.25)).toBe(3);
    expect(resolvePerfStep(3, 0.9)).toBe(PERF_STEP_MAX);
  });

  it("de-escalates one step on recovery and floors at zero", () => {
    expect(resolvePerfStep(3, 0.01)).toBe(2);
    expect(resolvePerfStep(1, 0.01)).toBe(0);
    expect(resolvePerfStep(0, 0)).toBe(0);
  });

  it("holds the current step in the hysteresis band", () => {
    expect(resolvePerfStep(2, 0.12)).toBe(2);
  });

  it("normalizes hostile step input", () => {
    expect(resolvePerfStep(NaN, 0.25)).toBe(1);
    expect(resolvePerfStep(-5, 0.01)).toBe(0);
    expect(resolvePerfStep(99, 0.25)).toBe(PERF_STEP_MAX);
  });

  it("monitor escalates the published perf step under repeated slow windows", () => {
    const m = makeFrameMonitor();
    for (let i = 0; i < 250; i++) m.record(25);
    expect(window.__codPerfStep).toBeGreaterThanOrEqual(2);
    m.reset();
    expect(window.__codPerfStep).toBe(0);
  });
});

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
    // The carried stragglers consume one window, then two fully clean windows
    // are required by the anti-flap recovery hysteresis.
    for (let i = 0; i < 380; i++) m.record(8);
    expect(window.__codReducedEffects).toBe(false);
  });

  it("does not flip on a single bad frame", () => {
    const m = makeFrameMonitor();
    m.record(50);
    expect(window.__codReducedEffects).toBeFalsy();
  });
  it("keeps histogram memory bounded and emits an honest assisted receipt", () => {
    const receipts = [];
    const m = makeFrameMonitor({ onSnapshot: (receipt) => receipts.push(receipt) });
    for (let i = 0; i < 2400; i++) m.record(i < 240 ? 28 : 10);
    const receipt = m.snapshot();
    expect(receipt).toMatchObject({
      totalFrames: 2400,
      assisted: true,
      assistActivations: 1,
      histogramBuckets: 8,
      claim: "observed-local-frame-timing-not-causality-or-score-validity",
    });
    expect(receipt.p95Ms).toBeGreaterThan(0);
    expect(receipts.length).toBe(20);
  });

  it("executes suspended frames without diluting timing evidence", () => {
    const m = makeFrameMonitor();
    let callbacks = 0;
    let now = 10;
    const clock = () => {
      const value = now;
      now += 5;
      return value;
    };
    runMeasuredFrame(() => { callbacks += 1; }, m, { shouldMeasure: false, now: clock });
    expect(callbacks).toBe(1);
    expect(m.snapshot()).toMatchObject({ totalFrames: 0, slowFrames: 0 });
    expect(runMeasuredFrame(() => { callbacks += 1; }, m, { shouldMeasure: true, now: clock })).toBe(5);
    expect(m.snapshot()).toMatchObject({ totalFrames: 1, slowFrames: 0 });
  });

  it("resets every run receipt without growing retained samples", () => {
    const m = makeFrameMonitor();
    for (let i = 0; i < 130; i++) m.record(30);
    expect(m.snapshot().assisted).toBe(true);
    m.reset();
    expect(m.snapshot()).toMatchObject({ totalFrames: 0, slowFrames: 0, assisted: false, histogramBuckets: 8 });
  });
});

describe("game loop fault boundary", () => {
  it("reports a frame error without rethrowing it", () => {
    const seen = [];
    const result = runFrameSafely(() => { throw new Error("frame exploded"); }, error => seen.push(error.message));
    expect(result.ok).toBe(false);
    expect(seen).toEqual(["frame exploded"]);
  });

  it("returns an honest success result for a healthy frame", () => {
    expect(runFrameSafely(() => {})).toEqual({ ok: true, error: null });
  });
});
