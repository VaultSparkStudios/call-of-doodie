import { useEffect, useRef } from "react";

// ── Frame budget monitor (dev only) ──────────────────────────────────────────
// Logs a warning when the game loop exceeds 16ms (60fps budget).
// Aggregates: reports once per 300 frames to avoid console spam.

const DEV = import.meta.env.DEV;
const BUDGET_MS    = 16.67;
const REPORT_EVERY = 300; // frames
const ADAPT_WINDOW = 120; // frames (~2s @ 60fps) for adaptive quality
const ADAPT_THRESHOLD = 0.20; // >20% frames over budget → reduce effects

// Adaptive quality flag: window.__codReducedEffects becomes true when
// sustained frame drops are detected. Read by drawGame + emit paths.
export function makeFrameMonitor() {
  let drops = 0, total = 0, maxMs = 0;
  let adaptDrops = 0, adaptTotal = 0;
  return {
    record(ms) {
      total++; adaptTotal++;
      const over = ms > BUDGET_MS;
      if (over) { drops++; maxMs = Math.max(maxMs, ms); adaptDrops++; }
      if (DEV && total % REPORT_EVERY === 0 && drops > 0) {
        const pct = ((drops / REPORT_EVERY) * 100).toFixed(0);
        console.warn(`[GameLoop] ${pct}% frames over budget in last ${REPORT_EVERY} (worst: ${maxMs.toFixed(1)}ms)`);
        drops = 0; maxMs = 0;
      }
      if (adaptTotal >= ADAPT_WINDOW) {
        const pct = adaptDrops / adaptTotal;
        if (typeof window !== "undefined") {
          if (pct >= ADAPT_THRESHOLD) window.__codReducedEffects = true;
          else if (pct < ADAPT_THRESHOLD * 0.4) window.__codReducedEffects = false;
        }
        adaptDrops = 0; adaptTotal = 0;
      }
    },
  };
}

/**
 * Drives a requestAnimationFrame loop.
 * - Calls `callback` every frame while `active` is true.
 * - Always uses the latest version of `callback` (via ref), so callers
 *   don't need to pass it as a dependency.
 * - In development, logs frame-drop warnings when the loop exceeds 16ms budget.
 * - Cleans up on unmount or when `active` becomes false.
 *
 * @param {Function} callback  Called once per animation frame.
 * @param {boolean}  active    When false the loop is stopped.
 * @param {React.MutableRefObject} [rafRef]  Optional external ref that will
 *   be kept in sync with the current rAF handle (for external cancellation).
 */
export function useGameLoop(callback, active, rafRef) {
  const cbRef    = useRef(callback);
  const monRef   = useRef(makeFrameMonitor());
  cbRef.current  = callback; // always latest — never stale

  useEffect(() => {
    if (!active) {
      if (rafRef?.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
      return;
    }
    let handle;
    const loop = () => {
      const t0 = performance.now();
      cbRef.current();
      monRef.current?.record(performance.now() - t0);
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
}
