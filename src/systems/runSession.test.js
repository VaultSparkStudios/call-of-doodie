import { describe, expect, it } from "vitest";
import {
  createDeathStudioEvents,
  createRunHistoryEntry,
  createRunStartArtifacts,
  createScoreSubmitStudioEvents,
  buildScoreSubmitAnalyticsPayload,
  resolveRunModeFromFlags,
} from "./runSession.js";

describe("runSession", () => {
  it("resolves the active run mode from flags", () => {
    expect(resolveRunModeFromFlags({ bossRush: true })).toBe("boss_rush");
    expect(resolveRunModeFromFlags({ dailyChallenge: true })).toBe("daily_challenge");
    expect(resolveRunModeFromFlags({})).toBe("standard");
  });

  it("builds run start artifacts with a canonical mode", () => {
    const result = createRunStartArtifacts({
      difficulty: "hard",
      starterLoadout: "tank",
      seed: 77,
      flags: { scoreAttack: true },
    });
    expect(result.mode).toBe("score_attack");
    expect(result.runClaim).toMatchObject({ mode: "score_attack", difficulty: "hard", seed: 77, starterLoadout: "tank" });
  });

  it("builds replay-safe run history entries and death events", () => {
    const historyEntry = createRunHistoryEntry({
      score: 9999,
      kills: 55,
      wave: 12,
      timeSeconds: 301,
      difficulty: "normal",
      flags: { cursed: true },
      runSeed: 2468,
      modifier: "chaos",
      traceEvidence: { level: "rich", count: 7, durationFrames: 96, weaknessReasons: [] },
      traceReceipt: { status: "verified", label: "Replay Proof Ready", score: 92, level: "rich" },
      performanceReceipt: { totalFrames: 720, slowFrames: 144, slowPct: 20, p95Ms: 25, worstMs: 48, assisted: true, assistActivations: 1 },
      integrityReceipt: {
        status: "degraded",
        onlineEligible: false,
        label: "LOCAL ONLY · RUNTIME RECOVERY",
        faultCount: 2,
        occurrenceCount: 3,
        stages: ["objective_director"],
      },
    });
    expect(historyEntry).toMatchObject({
      mode: "cursed",
      runSeed: 2468,
      modifier: "chaos",
      time: 301,
      traceReceipt: { status: "verified", score: 92 },
      traceEvidence: { level: "rich", count: 7 },
      performanceReceipt: { totalFrames: 720, slowFrames: 144, slowPct: 20, p95Ms: 25, worstMs: 48, assisted: true, assistActivations: 1 },
      integrityReceipt: {
        status: "degraded",
        onlineEligible: false,
        faultCount: 2,
        occurrenceCount: 3,
        stages: ["objective_director"],
      },
    });
    expect(createRunHistoryEntry({ integrityReceipt: { onlineEligible: true } })).not.toHaveProperty("integrityReceipt");

    const events = createDeathStudioEvents({
      score: 9999,
      kills: 55,
      wave: 12,
      difficulty: "normal",
      flags: { cursed: true },
      runSeed: 2468,
    });
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("first_death_wave");
    expect(events[0].payload).toMatchObject({
      mode: "cursed",
      difficulty: "normal",
      wave: 12,
      score: 9999,
      kills: 55,
    });
  });

  it("normalizes impossible performance evidence before persistence", () => {
    const historyEntry = createRunHistoryEntry({
      performanceReceipt: {
        totalFrames: 10.9,
        slowFrames: 99,
        slowPct: -500,
        p95Ms: 40,
        worstMs: 12,
        assisted: true,
        assistActivations: 0,
      },
    });
    expect(historyEntry.performanceReceipt).toMatchObject({
      totalFrames: 10,
      slowFrames: 10,
      slowPct: 100,
      p95Ms: 40,
      worstMs: 40,
      assisted: true,
      assistActivations: 1,
      label: "PERFORMANCE ASSISTED",
      claim: "observed-local-frame-timing-not-causality-or-score-validity",
    });
  });

  it("includes rejection metadata when score submission is rejected", () => {
    const result = createScoreSubmitStudioEvents({
      difficulty: "hard",
      score: 123456,
      wave: 22,
      runSeed: 2468,
      flags: { bossRush: true },
      globalRank: null,
      result: {
        submission: "rejected",
        rejectionReason: "Digest mismatch",
        rejectionReasons: ["digest_timeline"],
      },
      eventDigest: { v: 2 },
    });
    expect(result.mode).toBe("boss_rush");
    expect(result.events).toHaveLength(2);
    expect(result.events[1].payload.reason).toBe("Digest mismatch");
  });

  it("carries replay trace evidence into score submission events", () => {
    const result = createScoreSubmitStudioEvents({
      difficulty: "normal",
      score: 50000,
      wave: 18,
      runSeed: 99,
      result: { submission: "online" },
      traceEvidence: {
        level: "basic",
        count: 5,
        durationFrames: 84,
        weaknessReasons: ["low-movement-evidence"],
      },
    });

    expect(result.events[0].payload.traceEvidence).toMatchObject({
      level: "basic",
      count: 5,
      weaknessReasons: ["low-movement-evidence"],
    });
  });
  it("builds score-submit analytics payloads from submission truth", () => {
    const payload = buildScoreSubmitAnalyticsPayload({
      difficulty: "hard",
      mode: "boss_rush",
      wave: 22,
      score: 123456,
      result: {
        submission: "rejected",
        rejectionReason: "Digest mismatch",
      },
      eventDigest: { v: 2 },
      traceEvidence: { evidenceLevel: "rich" },
    });

    expect(payload).toMatchObject({
      difficulty: "hard",
      mode: "boss_rush",
      wave: 22,
      score: 123456,
      submission: "rejected",
      rejected: true,
      reason: "Digest mismatch",
      eventDigestVersion: 2,
      traceEvidenceLevel: "rich",
    });
  });
});
