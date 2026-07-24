import { writeLocalState } from "./storageHealth.js";

export const SERVICE_WORKER_LIFECYCLE_EVENT = "cod:service-worker-lifecycle";

const PWA_INSTALL_ATTEMPT_KEY = "cod-pwa-install-attempt";

function safeStorage(storage = globalThis.localStorage) {
  return storage && typeof storage.getItem === "function" ? storage : null;
}

export function normalizeServiceWorkerLifecycle(value = {}) {
  const supported = Boolean(value.supported);
  const registered = supported && Boolean(value.registered);
  const controlled = registered && Boolean(value.controlled);
  const updateReady = registered && Boolean(value.updateReady);
  const failed = supported && Boolean(value.failed);
  return {
    supported,
    registered,
    controlled,
    updateReady,
    failed,
    errorCode: failed && value.errorCode ? String(value.errorCode).slice(0, 48) : null,
  };
}

export function detectServiceWorkerLifecycle(nav = globalThis.navigator) {
  const supported = Boolean(nav && "serviceWorker" in nav);
  const controlled = Boolean(supported && nav.serviceWorker?.controller);
  return normalizeServiceWorkerLifecycle({ supported, registered: controlled, controlled });
}

export function readServiceWorkerLifecycle(win = globalThis.window, nav = globalThis.navigator) {
  const latched = win?.__COD_SW_LIFECYCLE__;
  return latched ? normalizeServiceWorkerLifecycle(latched) : detectServiceWorkerLifecycle(nav);
}

export function buildPwaInstallReceipt({
  promptReady = false,
  standalone = false,
  serviceWorkerLifecycle = detectServiceWorkerLifecycle(),
  manifestLinked = true,
  lastAttempt = null,
  mobile = false,
  timestamp = Date.now(),
} = {}) {
  const worker = normalizeServiceWorkerLifecycle(serviceWorkerLifecycle);
  const serviceWorkerReady = worker.registered || worker.controlled;
  const readySignals = [
    Boolean(promptReady),
    Boolean(standalone),
    serviceWorkerReady,
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
          : worker.failed
            ? "worker-failed"
            : worker.updateReady
              ? "update-ready"
              : serviceWorkerReady && manifestLinked
                ? "browser-ready"
                : worker.supported
                  ? "worker-pending"
                  : "needs-browser";

  const label = {
    installed: "PWA INSTALLED",
    "prompt-ready": "PWA PROMPT READY",
    accepted: "PWA ACCEPTED",
    "prompt-dismissed": "PWA DISMISSED",
    "update-ready": "PWA UPDATE READY",
    "browser-ready": "PWA WORKER READY",
    "worker-pending": "PWA WORKER PENDING",
    "worker-failed": "PWA WORKER FAILED",
    "needs-browser": "PWA CHECK NEEDED",
  }[status];

  const nextAction = {
    installed: "Standalone launch detected",
    "prompt-ready": mobile ? "Accept install prompt on device" : "Install prompt available",
    accepted: "Reopen from app icon to finish QA",
    "prompt-dismissed": "Prompt was dismissed locally",
    "update-ready": "Reload after this run to apply update",
    "browser-ready": worker.controlled ? "Worker controls this page" : "Reload once to activate worker control",
    "worker-pending": "Registration has not completed",
    "worker-failed": `Registration failed${worker.errorCode ? ` (${worker.errorCode})` : ""}`,
    "needs-browser": "Service workers unsupported in this browser",
  }[status];
  const playerLabel = {
    installed: "APP MODE ACTIVE",
    "prompt-ready": "INSTALL AVAILABLE",
    accepted: "INSTALL ACCEPTED",
    "prompt-dismissed": "INSTALL DISMISSED",
    "update-ready": "APP UPDATE READY",
    "browser-ready": "OFFLINE SUPPORT READY",
    "worker-pending": "OFFLINE SUPPORT STARTING",
    "worker-failed": "OFFLINE SUPPORT NEEDS ATTENTION",
    "needs-browser": "PLAYING IN BROWSER",
  }[status];

  return {
    version: 2,
    status,
    label,
    playerLabel,
    detail: nextAction,
    promptReady: Boolean(promptReady),
    standalone: Boolean(standalone),
    serviceWorkerReady,
    serviceWorker: worker,
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
  writeLocalState(PWA_INSTALL_ATTEMPT_KEY, JSON.stringify(record), { storage: store, surface: "pwa-install" });
  return record;
}
