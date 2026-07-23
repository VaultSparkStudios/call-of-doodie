const PANEL_RELOAD_KEY = "cod-panel-reload-v1";
const PANEL_RELOAD_COOLDOWN_MS = 60_000;

export function planPanelRecovery(storage = globalThis.sessionStorage, now = Date.now()) {
  try {
    const previous = Number(storage?.getItem?.(PANEL_RELOAD_KEY) || 0);
    if (Number.isFinite(previous) && previous > 0 && now - previous < PANEL_RELOAD_COOLDOWN_MS) {
      return { action: "wait", retryAfterMs: PANEL_RELOAD_COOLDOWN_MS - (now - previous) };
    }
    storage?.setItem?.(PANEL_RELOAD_KEY, String(now));
    return { action: "reload", retryAfterMs: 0 };
  } catch (_) {
    return { action: "reload", retryAfterMs: 0 };
  }
}
