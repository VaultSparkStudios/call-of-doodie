// S145 — one shared Community Stats store for every mounted surface.
// Before this, each panel mount (Home, leaderboard, debrief) ran its own 15s
// poller and its own Supabase realtime channel; with the leaderboard open two
// pollers raced on the same numbers. Now exactly one poller and one channel
// exist while at least one subscriber is mounted, and every surface reads the
// same snapshot through useSyncExternalStore.
//
// The store also keeps a bounded trend ring (last 32 distinct snapshots) so
// panels can draw sparklines without new network traffic or storage growth.

import {
  loadCachedCommunityStats,
  loadCommunityStats,
  requestCompletedRunFactSync,
} from "../storage.js";
import { getSupabaseClient } from "../supabase.js";

const POLL_MS = 15000;
const TREND_CAP = 32;
const TREND_KEYS = ["runs", "kills", "score", "damage", "runners"];

const subscribers = new Set();
let snapshot = null;
let status = "connecting";
let trend = [];
let timer = null;
let channel = null;
let refreshPromise = null;
let disposed = false;

function emit() {
  for (const listener of subscribers) {
    try { listener(); } catch { /* subscriber errors never break the store */ }
  }
}

function pushTrend(stats) {
  const last = trend[trend.length - 1];
  const point = { at: Date.now() };
  let changed = !last;
  for (const key of TREND_KEYS) {
    point[key] = Number(stats?.[key]) || 0;
    if (last && point[key] !== last[key]) changed = true;
  }
  if (!changed) return;
  trend = [...trend.slice(-(TREND_CAP - 1)), point];
}

async function refresh() {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    await requestCompletedRunFactSync({ limit: 20 });
    const next = await loadCommunityStats();
    if (!disposed) {
      snapshot = next;
      status = next.dataSource === "live" ? "live" : next.dataSource === "cache" ? "cached" : "offline";
      if (next.dataSource === "live") pushTrend(next);
      emit();
    }
    return next;
  })().finally(() => { refreshPromise = null; });
  return refreshPromise;
}

function wake() {
  if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
  refresh();
}

function start() {
  if (timer !== null || typeof window === "undefined") return;
  disposed = false;
  refresh();
  timer = setInterval(wake, POLL_MS);
  window.addEventListener("online", wake);
  window.addEventListener("focus", wake);
  window.addEventListener("cod:community-stats-updated", wake);
  document.addEventListener("visibilitychange", wake);
  getSupabaseClient().then((client) => {
    if (disposed || !client?.channel || channel) return;
    channel = client.channel("cod-community-stats")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "leaderboard" }, wake)
      .subscribe();
  }).catch(() => {});
}

function stop() {
  disposed = true;
  if (timer !== null) { clearInterval(timer); timer = null; }
  if (typeof window !== "undefined") {
    window.removeEventListener("online", wake);
    window.removeEventListener("focus", wake);
    window.removeEventListener("cod:community-stats-updated", wake);
    document.removeEventListener("visibilitychange", wake);
  }
  if (channel) {
    const held = channel;
    channel = null;
    getSupabaseClient().then((client) => client?.removeChannel?.(held)).catch(() => {});
  }
}

export function subscribeCommunityStats(listener) {
  subscribers.add(listener);
  if (subscribers.size === 1) start();
  return () => {
    subscribers.delete(listener);
    if (subscribers.size === 0) stop();
  };
}

export function getCommunityStatsSnapshot() {
  if (!snapshot) {
    snapshot = loadCachedCommunityStats();
    status = snapshot?.dataSource === "cache" ? "cached" : "connecting";
  }
  return snapshot;
}

export function getCommunityStatsStatus() {
  return status;
}

export function getCommunityStatsTrend() {
  return trend;
}

export function refreshCommunityStatsNow() {
  return refresh();
}

// Test-only reset — never called from app code.
export function __resetCommunityStatsStoreForTests() {
  stop();
  subscribers.clear();
  snapshot = null;
  status = "connecting";
  trend = [];
}
