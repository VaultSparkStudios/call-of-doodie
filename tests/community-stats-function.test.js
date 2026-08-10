import { describe, expect, it, vi } from "vitest";
import { readCommunityStats } from "../functions/api/community-stats.js";

const request = () => new Request("https://callofdoodie.wtf/api/community-stats");
const env = {
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_ANON_KEY: "public-anon-key",
};
const stats = {
  scope: "all_available_server_history",
  runs: 12,
  coverage: { history: "all_available_server_history", richRuns: 0, legacyRuns: 12 },
};

describe("Community Stats Pages API", () => {
  it("returns the aggregate without exposing upstream credentials", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify(stats), { status: 200 }));
    const response = await readCommunityStats({ request: request(), env, fetchImpl });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      schemaVersion: "community-stats-live-v1",
      stats: { runs: 12, scope: "all_available_server_history" },
    });
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://example.supabase.co/rest/v1/rpc/get_cod_community_stats",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("fails closed when runtime configuration or the aggregate contract is missing", async () => {
    expect((await readCommunityStats({ request: request(), env: {}, fetchImpl: vi.fn() })).status).toBe(503);
    const invalid = vi.fn().mockResolvedValue(new Response(JSON.stringify({ runs: 12 }), { status: 200 }));
    expect((await readCommunityStats({ request: request(), env, fetchImpl: invalid })).status).toBe(502);
  });

  it("rejects writes to the public read endpoint", async () => {
    const response = await readCommunityStats({
      request: new Request("https://callofdoodie.wtf/api/community-stats", { method: "POST" }),
      env,
      fetchImpl: vi.fn(),
    });
    expect(response.status).toBe(405);
  });

  it("rejects browser requests from a foreign origin", async () => {
    const response = await readCommunityStats({
      request: new Request("https://callofdoodie.wtf/api/community-stats", {
        headers: { origin: "https://evil.example.com" },
      }),
      env,
      fetchImpl: vi.fn(),
    });
    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ ok: false, reason: "origin-not-allowed" });
  });

  it("allows Cloudflare Pages preview origins for this project", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify(stats), { status: 200 }));
    const response = await readCommunityStats({
      request: new Request("https://callofdoodie.wtf/api/community-stats", {
        headers: { origin: "https://session-147-staging.call-of-doodie.pages.dev" },
      }),
      env,
      fetchImpl,
    });
    expect(response.status).toBe(200);
  });

  it("rate-limits a client IP past the per-minute ceiling", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify(stats), { status: 200 }));
    const now = () => 60000;
    let last;
    for (let i = 0; i < 61; i++) {
      last = await readCommunityStats({
        request: new Request("https://callofdoodie.wtf/api/community-stats", {
          headers: { "cf-connecting-ip": "203.0.113.9" },
        }),
        env,
        fetchImpl,
        now,
      });
    }
    expect(last.status).toBe(429);
    expect(await last.json()).toMatchObject({ ok: false, reason: "rate-limited" });
  });
});
