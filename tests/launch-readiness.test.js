import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { buildLaunchReadinessReceipt } from "../scripts/lib/launch-readiness.mjs";

describe("dual-rung launch readiness", () => {
  it("keeps engineering ready while missing provider and external evidence blocks SPARKED", () => {
    const receipt = buildLaunchReadinessReceipt({
      assets: { pngCount: 5, svgCount: 5 },
      providers: { posthog: "missing", sentry: "missing" },
    });
    expect(receipt).toMatchObject({
      schemaVersion: "launch-readiness-v2",
      status: "engineering_ready_sparked_blocked",
      engineeringReady: true,
      sparkedReady: false,
    });
    expect(receipt.summary.blockedSparkedGateIds).toContain("posthog-project-capability");
    expect(receipt.summary.blockedSparkedGateIds).toContain("founder-approval");
  });

  it("requires every evidence receipt and explicit founder approval for SPARKED", () => {
    const completedEvidence = [
      "mobile-pwa-install-pass",
      "gamepad-browser-pass",
      "verified-reply-email",
      "itchio-publication",
      "consented-playtest-evidence",
      "direct-pixel-review",
    ];
    const receipt = buildLaunchReadinessReceipt({
      assets: { pngCount: 5, svgCount: 5 },
      providers: { posthog: "ready", sentry: "ready" },
      completedEvidence,
      founderApproved: true,
    });
    expect(receipt.engineeringReady).toBe(true);
    expect(receipt.sparkedReady).toBe(true);
    expect(receipt.status).toBe("sparked_ready");
  });

  it("defaults provider state to unknown without reading local secret files", () => {
    const result = spawnSync(process.execPath, ["scripts/launch-readiness.mjs", "--json"], {
      cwd: process.cwd(),
      encoding: "utf8",
    });
    expect(result.status, result.stderr || result.stdout).toBe(0);
    const receipt = JSON.parse(result.stdout);
    expect(receipt.engineeringReady).toBe(true);
    expect(receipt.sparkedGates.find((gate) => gate.id === "posthog-project-capability").status).toBe("unknown");
    expect(result.stdout).not.toMatch(/VITE_POSTHOG_KEY|VITE_SENTRY_DSN|\.env\.local/);
  });
});
