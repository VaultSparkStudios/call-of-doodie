import { beforeEach, describe, expect, it, vi } from "vitest";

const supabase = vi.hoisted(() => ({
  supabaseUrl: "https://example.supabase.co",
  supabaseAnonKey: "anon-public-key",
  getAuthUid: vi.fn(),
  getOrCreateClientUid: vi.fn(() => "11111111-1111-4111-8111-111111111111"),
  getSupabaseClient: vi.fn(),
}));

vi.mock("./supabase.js", () => supabase);

import {
  loadCachedCommunityStats,
  loadCommunityStats,
  loadCompletedRunFactOutbox,
  queueCompletedRunFactForRetry,
  syncCompletedRunFact,
} from "./storage.js";

const aggregate = {
  scope: "all_available_server_history",
  runs: 12,
  runners: 5,
  kills: 259,
  score: 119223,
  coverage: { history: "all_available_server_history", richRuns: 0, legacyRuns: 12 },
  updatedAt: "2026-07-17T22:38:02.110Z",
};

const run = {
  runToken: "run-token-1",
  summarySig: "signed-summary",
  mode: "standard",
  difficulty: "normal",
  score: 9000,
  kills: 40,
  wave: 5,
};

describe("Community Stats storage reliability", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    supabase.getOrCreateClientUid.mockReturnValue("11111111-1111-4111-8111-111111111111");
  });

  it("returns the last-known-good aggregate when a live refresh fails", async () => {
    const rpc = vi.fn()
      .mockResolvedValueOnce({ data: aggregate, error: null })
      .mockResolvedValueOnce({ data: null, error: new Error("temporary outage") });
    supabase.getSupabaseClient.mockResolvedValue({ rpc });

    const live = await loadCommunityStats();
    expect(live).toMatchObject({ runs: 12, dataSource: "live", cacheAgeMs: 0 });

    const cached = await loadCommunityStats();
    expect(cached).toMatchObject({ runs: 12, kills: 259, dataSource: "cache" });
    expect(loadCachedCommunityStats().coverage.legacyRuns).toBe(12);
  });

  it("persists and enriches one retry row per run token", () => {
    queueCompletedRunFactForRetry(run);
    queueCompletedRunFactForRetry({ ...run, feedbackDifficulty: "dialed_in", totalShots: 100 });
    expect(loadCompletedRunFactOutbox()).toHaveLength(1);
    expect(loadCompletedRunFactOutbox()[0].payload).toMatchObject({
      runToken: "run-token-1",
      feedbackDifficulty: "dialed_in",
      totalShots: 100,
    });
  });

  it("keeps a transiently failed run then removes it after an acknowledged retry", async () => {
    supabase.getSupabaseClient.mockResolvedValue({
      auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) },
    });
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
        text: vi.fn().mockResolvedValue(JSON.stringify({ error: "temporarily unavailable" })),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValue(JSON.stringify({ ok: true, stats: aggregate })),
      });

    await expect(syncCompletedRunFact(run)).resolves.toMatchObject({ ok: false, submission: "queued", pending: 1 });
    expect(loadCompletedRunFactOutbox()).toHaveLength(1);

    await expect(syncCompletedRunFact({ ...run, feedbackDifficulty: "too_easy" })).resolves.toMatchObject({
      ok: true,
      submission: "synced",
      pending: 0,
    });
    expect(loadCompletedRunFactOutbox()).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
