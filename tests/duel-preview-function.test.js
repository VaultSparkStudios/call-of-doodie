import { describe, expect, it, vi } from "vitest";
import { readDuelPreview } from "../functions/api/duel-preview.js";

const id = "12345678-1234-1234-1234-123456789abc";
const env = { SUPABASE_URL: "https://db.example", SUPABASE_ANON_KEY: "public-key" };
const request = (suffix = `?id=${id}`, origin = "https://callofdoodie.wtf") => new Request(`https://callofdoodie.wtf/api/duel-preview${suffix}`, { headers: { origin, "cf-connecting-ip": "198.51.100.192" } });

describe("saved friendly duel preview", () => {
  it("returns only bounded fields from the fixed public row query", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify([{ id, seed: 42, mode: "standard", difficulty: "hard", challenger_name: "Rival", challenger_score: 12345, expires_at: "2026-10-03T12:00:00Z", responder_score: null, payload: { secret: "never" } }]), { status: 200 }));
    const response = await readDuelPreview({ request: request(), env, fetchImpl, now: () => Date.parse("2026-10-02T12:00:00Z") });
    expect(response.status).toBe(200);
    const result = await response.json();
    expect(result.duel).toMatchObject({ id, seed: 42, score: 12345, status: "open" });
    expect(JSON.stringify(result)).not.toContain("secret");
    expect(fetchImpl.mock.calls[0][0]).toContain(`id=eq.${id}&select=id,seed,mode`);
  });
  it("rejects bad identifiers and foreign origins before upstream access", async () => {
    const fetchImpl = vi.fn();
    expect((await readDuelPreview({ request: request("?id=bad"), env, fetchImpl })).status).toBe(400);
    expect((await readDuelPreview({ request: request(`?id=${id}`, "https://evil.example"), env, fetchImpl })).status).toBe(403);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
