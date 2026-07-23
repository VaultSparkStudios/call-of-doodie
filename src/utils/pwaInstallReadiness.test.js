import { describe, expect, it } from "vitest";
import {
  buildPwaInstallAttempt,
  buildPwaInstallReceipt,
  detectServiceWorkerLifecycle,
  detectStandaloneDisplay,
  loadPwaInstallAttempt,
  normalizeServiceWorkerLifecycle,
  readServiceWorkerLifecycle,
  savePwaInstallAttempt,
} from "./pwaInstallReadiness.js";

const controlledWorker = { supported: true, registered: true, controlled: true };

describe("PWA install and worker lifecycle truth", () => {
  it("keeps prompt readiness distinct from install acceptance", () => {
    expect(buildPwaInstallReceipt({
      promptReady: true,
      serviceWorkerLifecycle: controlledWorker,
      manifestLinked: true,
      mobile: true,
      timestamp: 123,
    })).toMatchObject({
      version: 2,
      status: "prompt-ready",
      label: "PWA PROMPT READY",
      serviceWorkerReady: true,
      readySignals: 3,
      summary: "3/4 install signals · Accept install prompt on device",
    });
  });

  it("does not mistake API support for registration readiness", () => {
    const lifecycle = detectServiceWorkerLifecycle({ serviceWorker: { controller: null } });
    expect(lifecycle).toEqual({
      supported: true,
      registered: false,
      controlled: false,
      updateReady: false,
      failed: false,
      errorCode: null,
    });
    expect(buildPwaInstallReceipt({ serviceWorkerLifecycle: lifecycle, manifestLinked: true })).toMatchObject({
      status: "worker-pending",
      label: "PWA WORKER PENDING",
      serviceWorkerReady: false,
      readySignals: 1,
    });
  });

  it("recovers a lifecycle event that fired before Home mounted", () => {
    const latched = { supported: true, registered: true, controlled: false, updateReady: true };
    expect(readServiceWorkerLifecycle({ __COD_SW_LIFECYCLE__: latched }, { serviceWorker: {} })).toMatchObject({
      registered: true, controlled: false, updateReady: true,
    });
  });

  it("reports controlled, update-ready, failed, and unsupported states honestly", () => {
    expect(buildPwaInstallReceipt({ serviceWorkerLifecycle: controlledWorker })).toMatchObject({ status: "browser-ready" });
    expect(buildPwaInstallReceipt({ serviceWorkerLifecycle: { ...controlledWorker, updateReady: true } })).toMatchObject({ status: "update-ready" });
    expect(buildPwaInstallReceipt({ serviceWorkerLifecycle: { supported: true, failed: true, errorCode: "SecurityError:secret" } })).toMatchObject({
      status: "worker-failed",
      serviceWorker: { errorCode: "SecurityError:secret" },
    });
    expect(buildPwaInstallReceipt({ serviceWorkerLifecycle: {}, manifestLinked: true })).toMatchObject({ status: "needs-browser" });
  });

  it("normalizes impossible lifecycle combinations and bounds error codes", () => {
    expect(normalizeServiceWorkerLifecycle({ controlled: true, errorCode: "x".repeat(100) })).toEqual({
      supported: false,
      registered: false,
      controlled: false,
      updateReady: false,
      failed: false,
      errorCode: null,
    });
    expect(normalizeServiceWorkerLifecycle({ supported: true, failed: true, errorCode: "x".repeat(100) }).errorCode).toHaveLength(48);
  });

  it("preserves standalone and local prompt-attempt evidence", () => {
    expect(detectStandaloneDisplay({ matchMedia: () => ({ matches: true }) }, {})).toBe(true);
    const data = new Map();
    const storage = { getItem: (key) => data.get(key) || null, setItem: (key, value) => data.set(key, value) };
    const attempt = buildPwaInstallAttempt({ outcome: "accepted", timestamp: 789 });
    savePwaInstallAttempt(attempt, storage);
    expect(loadPwaInstallAttempt(storage)).toEqual(attempt);
    expect(buildPwaInstallReceipt({ lastAttempt: attempt, serviceWorkerLifecycle: controlledWorker })).toMatchObject({
      status: "accepted",
      lastOutcome: "accepted",
    });
  });
});
