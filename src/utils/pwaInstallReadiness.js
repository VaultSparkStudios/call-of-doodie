const PWA_INSTALL_ATTEMPT_KEY = "cod-pwa-install-attempt";

function safeStorage(storage = globalThis.localStorage) {
  return storage && typeof storage.getItem === "function" ? storage : null;
}

export function buildPwaInstallReceipt({
  promptReady = false,
  standalone = false,
  serviceWorkerReady = false,
  manifestLinked = true,
  lastAttempt = null,
  mobile = false,
  timestamp = Date.now(),
} = {}) {
  const readySignals = [
    Boolean(promptReady),
    Boolean(standalone),
    Boolean(serviceWorkerReady),
    Boolean(manifestLinked),
  ].filter(Boolean).length;

  const status = standalone
    ? "installed"
    : promptReady
      ? "prompt-ready"
      : lastAttempt?.outcome === "accepted"
        ? "accepted"
        : lastAttempt?.outcome === "dismissed"
          ? "prompt-dismissed"
          : serviceWorkerReady && manifestLinked
            ? "browser-ready"
            : "needs-browser";

  const label = {
    installed: "PWA INSTALLED",
    "prompt-ready": "PWA PROMPT READY",
    accepted: "PWA ACCEPTED",
    "prompt-dismissed": "PWA DISMISSED",
    "browser-ready": "PWA READY",
    "needs-browser": "PWA CHECK NEEDED",
  }[status];

  const nextAction = {
    installed: "Standalone launch detected",
    "prompt-ready": mobile ? "Accept install prompt on device" : "Install prompt available",
    accepted: "Reopen from app icon to finish QA",
    "prompt-dismissed": "Prompt was dismissed locally",
    "browser-ready": "Open install-capable browser",
    "needs-browser": "Verify manifest and service worker",
  }[status];

  return {
    version: 1,
    status,
    label,
    promptReady: Boolean(promptReady),
    standalone: Boolean(standalone),
    serviceWorkerReady: Boolean(serviceWorkerReady),
    manifestLinked: Boolean(manifestLinked),
    lastOutcome: lastAttempt?.outcome || null,
    mobile: Boolean(mobile),
    readySignals,
    summary: `${readySignals}/4 install signals · ${nextAction}`,
    timestamp,
  };
}

export function detectStandaloneDisplay(win = globalThis.window, nav = globalThis.navigator) {
  if (nav?.standalone === true) return true;
  return Boolean(win?.matchMedia?.("(display-mode: standalone)")?.matches);
}

export function detectServiceWorkerReady(nav = globalThis.navigator) {
  return Boolean(nav && "serviceWorker" in nav);
}

export function buildPwaInstallAttempt({ outcome = "unknown", timestamp = Date.now() } = {}) {
  return {
    version: 1,
    outcome: outcome === "accepted" || outcome === "dismissed" ? outcome : "unknown",
    timestamp,
  };
}

export function loadPwaInstallAttempt(storage = globalThis.localStorage) {
  const store = safeStorage(storage);
  if (!store) return null;
  try {
    const parsed = JSON.parse(store.getItem(PWA_INSTALL_ATTEMPT_KEY) || "null");
    return parsed?.version === 1 ? parsed : null;
  } catch (_) {
    return null;
  }
}

export function savePwaInstallAttempt(record, storage = globalThis.localStorage) {
  const store = safeStorage(storage);
  if (!store) return record;
  store.setItem(PWA_INSTALL_ATTEMPT_KEY, JSON.stringify(record));
  return record;
}