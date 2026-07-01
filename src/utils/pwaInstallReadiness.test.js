import { describe, expect, it } from "vitest";
import {
  buildPwaInstallAttempt,
  buildPwaInstallReceipt,
  detectServiceWorkerReady,
  detectStandaloneDisplay,
  loadPwaInstallAttempt,
  savePwaInstallAttempt,
} from "./pwaInstallReadiness.js";

describe("pwa install readiness", () => {
  it("marks a browser install prompt as ready without claiming acceptance", () => {
    expect(buildPwaInstallReceipt({
      promptReady: true,
      serviceWorkerReady: true,
      manifestLinked: true,
      mobile: true,
      timestamp: 123,
    })).toEqual({
      version: 1,
      status: "prompt-ready",
      label: "PWA PROMPT READY",
      promptReady: true,
      standalone: false,
      serviceWorkerReady: true,
      manifestLinked: true,
      lastOutcome: null,
      mobile: true,
      readySignals: 3,
      summary: "3/4 install signals · Accept install prompt on device",
      timestamp: 123,
    });
  });

  it("marks standalone display separately from install prompt readiness", () => {
    expect(buildPwaInstallReceipt({
      standalone: true,
      serviceWorkerReady: true,
      manifestLinked: true,
    })).toMatchObject({
      status: "installed",
      label: "PWA INSTALLED",
      readySignals: 3,
    });
  });

  it("keeps launch QA honest when the browser has no install surface", () => {
    expect(buildPwaInstallReceipt({
      serviceWorkerReady: false,
      manifestLinked: true,
      timestamp: 456,
    })).toMatchObject({
      status: "needs-browser",
      label: "PWA CHECK NEEDED",
      readySignals: 1,
      summary: "1/4 install signals · Verify manifest and service worker",
    });
  });

  it("persists browser prompt outcomes as local install QA evidence", () => {
    const storage = (() => {
      const data = new Map();
      return {
        getItem: (key) => data.get(key) || null,
        setItem: (key, value) => data.set(key, value),
      };
    })();
    const attempt = buildPwaInstallAttempt({ outcome: "accepted", timestamp: 789 });
    savePwaInstallAttempt(attempt, storage);

    expect(loadPwaInstallAttempt(storage)).toEqual(attempt);
    expect(buildPwaInstallReceipt({ lastAttempt: attempt, serviceWorkerReady: true, manifestLinked: true })).toMatchObject({
      status: "accepted",
      label: "PWA ACCEPTED",
      lastOutcome: "accepted",
      summary: "2/4 install signals · Reopen from app icon to finish QA",
    });
  });

  it("detects standalone and service worker support from injected browser objects", () => {
    expect(detectStandaloneDisplay({ matchMedia: () => ({ matches: true }) }, {})).toBe(true);
    expect(detectStandaloneDisplay({ matchMedia: () => ({ matches: false }) }, { standalone: true })).toBe(true);
    expect(detectServiceWorkerReady({ serviceWorker: {} })).toBe(true);
    expect(detectServiceWorkerReady({})).toBe(false);
  });
});
