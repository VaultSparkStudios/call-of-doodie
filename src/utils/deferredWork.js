export function scheduleIdleWork(task, {
  windowRef = typeof window === "undefined" ? null : window,
  timeoutMs = 4_000,
  fallbackMs = 2_000,
} = {}) {
  if (!windowRef) return () => {};
  let cancelled = false;
  const run = () => {
    if (!cancelled) void task();
  };
  if (typeof windowRef.requestIdleCallback === "function") {
    const id = windowRef.requestIdleCallback(run, { timeout: timeoutMs });
    return () => {
      cancelled = true;
      windowRef.cancelIdleCallback?.(id);
    };
  }
  const id = windowRef.setTimeout(run, fallbackMs);
  return () => {
    cancelled = true;
    windowRef.clearTimeout(id);
  };
}
