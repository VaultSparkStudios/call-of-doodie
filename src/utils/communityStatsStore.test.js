import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const loadCommunityStats = vi.fn();
const loadCachedCommunityStats = vi.fn();
const requestCompletedRunFactSync = vi.fn();

vi.mock("../storage.js", () => ({
  loadCommunityStats: (...args) => loadCommunityStats(...args),
  loadCachedCommunityStats: (...args) => loadCachedCommunityStats(...args),
  requestCompletedRunFactSync: (...args) => requestCompletedRunFactSync(...args),
}));
vi.mock("../supabase.js", () => ({
  getSupabaseClient: () => Promise.resolve(null),
}));

import {
  __resetCommunityStatsStoreForTests,
  getCommunityStatsSnapshot,
  getCommunityStatsStatus,
  getCommunityStatsTrend,
  refreshCommunityStatsNow,
  subscribeCommunityStats,
  COMMUNITY_STATS_POLL_MS,
} from "./communityStatsStore.js";

const liveStats = (overrides = {}) => ({
  dataSource: "live", runs: 12, kills: 259, score: 119223, damage: 21628, runners: 5, ...overrides,
});

describe("community stats store (S145)", () => {
  beforeEach(() => {
    __resetCommunityStatsStoreForTests();
    vi.useFakeTimers();
    loadCachedCommunityStats.mockReturnValue({ dataSource: "cache", runs: 10 });
    loadCommunityStats.mockResolvedValue(liveStats());
    requestCompletedRunFactSync.mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    __resetCommunityStatsStoreForTests();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("serves the cache snapshot before any subscriber mounts", () => {
    expect(getCommunityStatsSnapshot().runs).toBe(10);
    expect(getCommunityStatsStatus()).toBe("cached");
    expect(loadCommunityStats).not.toHaveBeenCalled();
  });

  it("starts exactly one poller regardless of subscriber count", async () => {
    const un1 = subscribeCommunityStats(() => {});
    const un2 = subscribeCommunityStats(() => {});
    const un3 = subscribeCommunityStats(() => {});
    await refreshCommunityStatsNow();
    const callsAfterMount = loadCommunityStats.mock.calls.length;
    await vi.advanceTimersByTimeAsync(COMMUNITY_STATS_POLL_MS);
    // One interval tick → exactly one more fetch even with three subscribers.
    expect(loadCommunityStats.mock.calls.length).toBe(callsAfterMount + 1);
    un1(); un2(); un3();
  });

  it("stops polling when the last subscriber unmounts", async () => {
    const un = subscribeCommunityStats(() => {});
    await refreshCommunityStatsNow();
    const calls = loadCommunityStats.mock.calls.length;
    un();
    await vi.advanceTimersByTimeAsync(60000);
    expect(loadCommunityStats.mock.calls.length).toBe(calls);
  });

  it("notifies subscribers and updates status on live data", async () => {
    const listener = vi.fn();
    const un = subscribeCommunityStats(listener);
    await refreshCommunityStatsNow();
    expect(listener).toHaveBeenCalled();
    expect(getCommunityStatsStatus()).toBe("live");
    expect(getCommunityStatsSnapshot().runs).toBe(12);
    un();
  });

  it("records a bounded trend ring of distinct live snapshots", async () => {
    const un = subscribeCommunityStats(() => {});
    await refreshCommunityStatsNow();
    for (let i = 1; i <= 40; i += 1) {
      loadCommunityStats.mockResolvedValue(liveStats({ kills: 259 + i }));
      await refreshCommunityStatsNow();
    }
    const trend = getCommunityStatsTrend();
    expect(trend.length).toBeLessThanOrEqual(32);
    expect(trend[trend.length - 1].kills).toBe(299);
    un();
  });

  it("does not extend the trend for identical consecutive snapshots", async () => {
    const un = subscribeCommunityStats(() => {});
    await refreshCommunityStatsNow();
    const before = getCommunityStatsTrend().length;
    await refreshCommunityStatsNow();
    await refreshCommunityStatsNow();
    expect(getCommunityStatsTrend().length).toBe(before);
    un();
  });

  it("reports cached status when live load falls back to cache", async () => {
    loadCommunityStats.mockResolvedValue({ dataSource: "cache", runs: 10 });
    const un = subscribeCommunityStats(() => {});
    await refreshCommunityStatsNow();
    expect(getCommunityStatsStatus()).toBe("cached");
    un();
  });
});
