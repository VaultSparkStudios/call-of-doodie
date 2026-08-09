import { useEffect, useRef } from "react";

const DEV = import.meta.env.DEV;
const BUDGET_MS = 16.67;
const REPORT_EVERY = 300;
const ADAPT_WINDOW = 120;
const ADAPT_THRESHOLD = 0.20;
const RECOVER_THRESHOLD = 0.08;
const RECOVER_WINDOWS = 2;
const HISTOGRAM_BOUNDS = [8, 12, BUDGET_MS, 25, 33, 50, 100, Infinity];

function round(value, digits = 1) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

// S145 degradation ladder — pure resolver so the policy is unit-testable.
// Step 0: full fidelity. 1: halve particles + no tracer trails.
// 2: also zero shadowBlur + ambient theme effects. 3: also drop DPR to 1×
// and collapse sprite-motion to static transforms.
export const PERF_STEP_MAX = 3;
export function resolvePerfStep(currentStep, dropPct, {
  adaptThreshold = ADAPT_THRESHOLD,
  recoverThreshold = RECOVER_THRESHOLD,
} = {}) {
  const step = Math.min(PERF_STEP_MAX, Math.max(0, Math.floor(currentStep) || 0));
  if (dropPct >= adaptThreshold) return Math.min(PERF_STEP_MAX, step + 1);
  if (dropPct <= recoverThreshold) return Math.max(0, step - 1);
  return step;
}

export function makeFrameMonitor({ onSnapshot = null } = {}) {
  let reportDrops = 0;
  let reportTotal = 0;
  let reportMaxMs = 0;
  let adaptDrops = 0;
  let adaptTotal = 0;
  let stableWindows = 0;
  let active = false;
  let perfStep = 0;
  let totalFrames = 0;
  let slowFrames = 0;
  let worstMs = 0;
  let assistActivations = 0;
  const histogram = Array(HISTOGRAM_BOUNDS.length).fill(0);

  const snapshot = () => {
    const target = Math.max(1, Math.ceil(totalFrames * 0.95));
    let seen = 0;
    let p95Ms = 0;
    for (let index = 0; index < histogram.length; index += 1) {
      seen += histogram[index];
      if (seen >= target) {
        p95Ms = Number.isFinite(HISTOGRAM_BOUNDS[index]) ? HISTOGRAM_BOUNDS[index] : worstMs;
        break;
      }
    }
    const slowPct = totalFrames > 0 ? round((slowFrames / totalFrames) * 100) : 0;
    const assisted = assistActivations > 0;
    return {
      version: 1,
      perfStep,
      totalFrames,
      slowFrames,
      slowPct,
      p95Ms: round(p95Ms),
      worstMs: round(worstMs),
      assisted,
      assistActive: active,
      assistActivations,
      histogramBuckets: histogram.length,
      label: assisted ? "PERFORMANCE ASSISTED" : "PERFORMANCE STABLE",
      detail: assisted
        ? "Reduced effects activated after sustained slow frames on this device."
        : "No sustained slow-frame window activated reduced effects.",
      claim: "observed-local-frame-timing-not-causality-or-score-validity",
    };
  };

  const reset = () => {
    reportDrops = 0;
    reportTotal = 0;
    reportMaxMs = 0;
    adaptDrops = 0;
    adaptTotal = 0;
    stableWindows = 0;
    active = false;
    perfStep = 0;
    totalFrames = 0;
    slowFrames = 0;
    worstMs = 0;
    assistActivations = 0;
    histogram.fill(0);
    if (typeof window !== "undefined") { window.__codReducedEffects = false; window.__codPerfStep = 0; }
  };

  return {
    record(ms) {
      const elapsed = Number.isFinite(ms) && ms >= 0 ? ms : 0;
      totalFrames += 1;
      reportTotal += 1;
      adaptTotal += 1;
      worstMs = Math.max(worstMs, elapsed);
      const bucket = HISTOGRAM_BOUNDS.findIndex((bound) => elapsed <= bound);
      histogram[bucket < 0 ? histogram.length - 1 : bucket] += 1;
      const over = elapsed > BUDGET_MS;
      if (over) {
        slowFrames += 1;
        reportDrops += 1;
        adaptDrops += 1;
        reportMaxMs = Math.max(reportMaxMs, elapsed);
      }
      if (DEV && reportTotal >= REPORT_EVERY) {
        if (reportDrops > 0) {
          const pct = ((reportDrops / reportTotal) * 100).toFixed(0);
          console.warn(`[GameLoop] ${pct}% frames over budget in last ${reportTotal} (worst: ${reportMaxMs.toFixed(1)}ms)`);
        }
        reportDrops = 0;
        reportTotal = 0;
        reportMaxMs = 0;
      }
      if (adaptTotal >= ADAPT_WINDOW) {
        const pct = adaptDrops / adaptTotal;
        if (pct >= ADAPT_THRESHOLD) {
          stableWindows = 0;
          if (!active) assistActivations += 1;
          active = true;
          perfStep = resolvePerfStep(perfStep, pct);
        } else if (active && pct <= RECOVER_THRESHOLD) {
          stableWindows += 1;
          if (stableWindows >= RECOVER_WINDOWS) {
            perfStep = resolvePerfStep(perfStep, pct);
            active = perfStep > 0;
            stableWindows = 0;
          }
        } else {
          stableWindows = 0;
        }
        if (typeof window !== "undefined") {
          window.__codReducedEffects = active;
          window.__codPerfStep = perfStep;
        }
        adaptDrops = 0;
        adaptTotal = 0;
        onSnapshot?.(snapshot());
      }
    },
    snapshot,
    reset,
  };
}

export function runMeasuredFrame(callback, monitor, {
  shouldMeasure = true,
  now = () => performance.now(),
} = {}) {
  if (!shouldMeasure) {
    callback();
    return null;
  }
  const startedAt = now();
  callback();
  const elapsed = Math.max(0, now() - startedAt);
  monitor.record(elapsed);
  return elapsed;
}

export function runFrameSafely(callback, onError) {
  try {
    callback();
    return { ok: true, error: null };
  } catch (error) {
    try { onError?.(error); } catch (handlerError) {
      console.error("[GAME LOOP] Fault handler failed:", handlerError);
    }
    return { ok: false, error };
  }
}

export function useGameLoop(callback, active, rafRef, {
  monitorRef = null,
  onSnapshot = null,
  onError = null,
  shouldMeasure = true,
} = {}) {
  const cbRef = useRef(callback);
  const snapshotRef = useRef(onSnapshot);
  const measureRef = useRef(shouldMeasure);
  const errorRef = useRef(onError);
  const monRef = useRef(null);
  cbRef.current = callback;
  snapshotRef.current = onSnapshot;
  measureRef.current = shouldMeasure;
  errorRef.current = onError;
  if (!monRef.current) monRef.current = makeFrameMonitor({ onSnapshot: (receipt) => snapshotRef.current?.(receipt) });
  if (monitorRef) monitorRef.current = monRef.current;

  useEffect(() => {
    if (!active) {
      if (rafRef?.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      return undefined;
    }
    monRef.current.reset();
    let handle;
    const loop = () => {
      const sample = typeof measureRef.current === "function"
        ? measureRef.current()
        : measureRef.current !== false;
      runFrameSafely(
        () => runMeasuredFrame(() => cbRef.current(), monRef.current, { shouldMeasure: sample }),
        (error) => errorRef.current?.(error),
      );
      handle = requestAnimationFrame(loop);
      if (rafRef) rafRef.current = handle;
    };
    handle = requestAnimationFrame(loop);
    if (rafRef) rafRef.current = handle;
    return () => {
      cancelAnimationFrame(handle);
      if (rafRef) rafRef.current = null;
    };
  }, [active]); // eslint-disable-line react-hooks/exhaustive-deps

  return monRef.current;
}
