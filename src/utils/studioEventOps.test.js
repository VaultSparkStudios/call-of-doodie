import { describe, expect, test } from "vitest";
import { buildTrustRecommendations, summarizeStudioEvents } from "./studioEventOps.js";

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
  });

  test("builds operator-facing recommendation lines", () => {
    const summary = summarizeStudioEvents(events);
    const lines = buildTrustRecommendations(summary);
    expect(lines[0]).toContain("Last rejection");
    expect(lines.some((line) => line.includes("Replay evidence: rich"))).toBe(true);
  });
});
