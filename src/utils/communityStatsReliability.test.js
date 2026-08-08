import { describe, expect, it } from "vitest";
import {
  buildCommunityStatsCacheRecord,
  MAX_RUN_FACT_OUTBOX,
  normalizeCommunityStatsCache,
  normalizeRunFactOutbox,
  selectRunnableRunFacts,
  settleRunFactAttempt,
  upsertRunFactOutbox,
} from "./communityStatsReliability.js";

const fact = {
  runToken: "run-1",
  summarySig: "signed",
  score: 1200,
  kills: 12,
  feedbackDifficulty: null,
};

describe("Community Stats reliability contracts", () => {
  it("keeps one durable outbox row per run and merges richer post-run feedback", () => {
    const first = upsertRunFactOutbox([], fact, 100);
    const updated = upsertRunFactOutbox(first, {
      ...fact,
      feedbackDifficulty: "too_easy",
      totalShots: 90,
    }, 200);
    expect(updated).toHaveLength(1);
    expect(updated[0]).toMatchObject({
      runToken: "run-1",
      queuedAt: 100,
      updatedAt: 200,
      payload: { feedbackDifficulty: "too_easy", totalShots: 90 },
    });
  });

  it("retains failed facts with bounded exponential retry and removes acknowledged facts", () => {
    const queued = upsertRunFactOutbox([], fact, 100);
    const failed = settleRunFactAttempt(queued, "run-1", { ok: false, error: "offline" }, 1000);
    expect(failed[0]).toMatchObject({ attempts: 1, lastAttemptAt: 1000, nextAttemptAt: 16000 });
    expect(selectRunnableRunFacts(failed, { now: 15999 })).toEqual([]);
    expect(selectRunnableRunFacts(failed, { now: 16000 })).toHaveLength(1);
    expect(settleRunFactAttempt(failed, "run-1", { ok: true }, 17000)).toEqual([]);
  });

  it("bounds corrupt or oversized persisted queues without accepting unsigned rows", () => {
    const oversized = Array.from({ length: MAX_RUN_FACT_OUTBOX + 20 }, (_, index) => ({
      payload: { runToken: `run-${index}`, summarySig: "signed" },
      queuedAt: index + 1,
    }));
    oversized.unshift({ payload: { runToken: "unsigned" } });
    expect(normalizeRunFactOutbox(oversized)).toHaveLength(MAX_RUN_FACT_OUTBOX);
    expect(normalizeRunFactOutbox(oversized).some((entry) => entry.runToken === "unsigned")).toBe(false);
  });

  it("stores a last-known-good aggregate independently from network availability", () => {
    const record = buildCommunityStatsCacheRecord({ runs: 12, kills: 259 }, 1234);
    expect(normalizeCommunityStatsCache(record)).toEqual(record);
    expect(normalizeCommunityStatsCache({ cachedAt: 1234 })).toBeNull();
  });
});
