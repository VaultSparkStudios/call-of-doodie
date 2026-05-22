import { describe, expect, test } from "vitest";
import {
  buildReplayResimReadiness,
  buildTraceEvidenceContract,
  buildTrustRecommendations,
  summarizeStudioEvents,
} from "./studioEventOps.js";

describe("studioEventOps", () => {
  const events = [
    { type: "front_door_action", category: "front_door", createdAt: "2026-04-20T00:00:00.000Z", syncStatus: "synced", syncedAt: "2026-04-20T00:00:05.000Z" },
    { type: "submission_rejected", category: "trust", createdAt: "2026-04-21T00:00:00.000Z", syncStatus: "failed", payload: { reason: "digest mismatch", reasons: ["timeline missing m:standard"] } },
    { type: "score_submit_result", category: "trust", createdAt: "2026-04-21T01:00:00.000Z", syncStatus: "synced", syncedAt: "2026-04-21T01:00:05.000Z", payload: { submission: "online", traceEvidence: { level: "rich", count: 8, weaknessReasons: [] } } },
    { type: "score_submit_result", category: "trust", createdAt: "2026-04-20T01:00:00.000Z", syncStatus: "synced", syncedAt: "2026-04-20T01:00:05.000Z", payload: { submission: "local", traceEvidence: { level: "weak", count: 1, weaknessReasons: ["too-few-events"] } } },
    { type: "perk_choice", category: "telemetry", createdAt: "2026-04-19T00:00:00.000Z", syncStatus: "pending" },
    { type: "route_choice", category: "telemetry", createdAt: "2026-04-18T00:00:00.000Z", syncStatus: "synced", syncedAt: "2026-04-18T00:00:05.000Z" },
    { type: "mode_abandon", category: "telemetry", createdAt: "2026-04-17T00:00:00.000Z", syncStatus: "synced", syncedAt: "2026-04-17T00:00:05.000Z" },
  ];

  test("summarizes trust and telemetry counts", () => {
    const summary = summarizeStudioEvents(events);
    expect(summary.frontDoorCount).toBe(1);
    expect(summary.rejectionCount).toBe(1);
    expect(summary.perkChoiceCount).toBe(1);
    expect(summary.routeChoiceCount).toBe(1);
    expect(summary.abandonmentCount).toBe(1);
    expect(summary.pendingSyncCount).toBe(1);
    expect(summary.failedSyncCount).toBe(1);
    expect(summary.syncedCount).toBe(5);
    expect(summary.traceEvidenceCounts.rich).toBe(1);
    expect(summary.traceEvidenceCounts.weak).toBe(1);
    expect(summary.latestTraceEvidence.level).toBe("rich");
    expect(summary.traceContract.status).toBe("complete");
    expect(summary.resimReadiness.status).toBe("pilot-ready");
  });

  test("builds operator-facing recommendation lines", () => {
    const summary = summarizeStudioEvents(events);
    const lines = buildTrustRecommendations(summary);
    expect(lines[0]).toContain("Last rejection");
    expect(lines.some((line) => line.includes("Replay evidence: rich"))).toBe(true);
    expect(lines.some((line) => line.includes("Replay Proof Ready"))).toBe(true);
    expect(lines.some((line) => line.includes("Resim pilot ready"))).toBe(true);
  });

  test("turns weak trace evidence into a concrete proof drill", () => {
    const contract = buildTraceEvidenceContract({
      level: "weak",
      count: 1,
      weaknessReasons: ["too-few-events", "missing-aim-evidence", "low-interaction-evidence"],
    });

    expect(contract.status).toBe("needs-drill");
    expect(contract.target).toContain("record at least 6 trace events");
    expect(contract.target).toContain("aim before firing");
  });

  test("marks resim readiness when multiple rich traces have clean sync health", () => {
    const readiness = buildReplayResimReadiness({
      traceEvidenceCounts: { rich: 2, basic: 1, weak: 0 },
      syncedCount: 4,
      failedSyncCount: 0,
    });

    expect(readiness.status).toBe("ready");
    expect(readiness.score).toBeGreaterThan(90);
  });

  test("gives basic trace evidence an upgrade contract", () => {
    const contract = buildTraceEvidenceContract({
      level: "basic",
      count: 4,
      weaknessReasons: [],
    });

    expect(contract.status).toBe("almost");
    expect(contract.title).toBe("Upgrade Replay Proof");
    expect(contract.target).toContain("60+ frame run");
  });

  test("penalizes resim readiness when sync retries are present", () => {
    const readiness = buildReplayResimReadiness({
      traceEvidenceCounts: { rich: 1, basic: 1, weak: 0 },
      syncedCount: 2,
      failedSyncCount: 2,
    });

    expect(readiness.status).toBe("pilot-ready");
    expect(readiness.score).toBeLessThan(70);
    expect(readiness.detail).toContain("Sync retries");
    expect(readiness.samples.retry).toBe(2);
  });

  test("keeps empty trust history in a no-sample state", () => {
    const summary = summarizeStudioEvents([]);
    expect(summary.traceContract.status).toBe("no-sample");
    expect(summary.resimReadiness.status).toBe("no-samples");
    expect(buildTrustRecommendations(summary).some((line) => line.includes("Trace Proof Baseline"))).toBe(true);
  });

});
