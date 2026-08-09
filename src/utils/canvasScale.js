// S145 — DPR-aware canvas backing-store sizing. Game space stays in CSS
// pixels; only the backing store scales (capped at 2×). Degradation-ladder
// step 3 drops back to 1× so low-end devices trade sharpness for frame rate.

export function effectiveDpr() {
  if (typeof window === "undefined") return 1;
  return (window.__codPerfStep || 0) >= 3 ? 1 : Math.min(window.devicePixelRatio || 1, 2);
}

export function applyCanvasScale(canvas, cssWidth, cssHeight) {
  if (!canvas) return;
  const dpr = effectiveDpr();
  canvas.width = Math.max(1, Math.round(cssWidth * dpr));
  canvas.height = Math.max(1, Math.round(cssHeight * dpr));
  canvas.style.width = `${cssWidth}px`;
  canvas.style.height = `${cssHeight}px`;
}

// Reapply sizing when the effective DPR drifts (perf-step change, monitor
// move). Returns a disposer for the watch interval.
export function watchCanvasScale(getCanvas, getSize, resize, intervalMs = 2000) {
  const timer = setInterval(() => {
    const canvas = getCanvas();
    const size = getSize();
    if (!canvas || !size?.w) return;
    if (Math.abs(canvas.width / size.w - effectiveDpr()) > 0.01) resize();
  }, intervalMs);
  return () => clearInterval(timer);
}
