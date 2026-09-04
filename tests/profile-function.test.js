import { describe, expect, it, vi } from "vitest";
import { onRequest } from "../functions/api/profile.js";

const SECRET = "test-secret";
async function keyFor(subject) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`profile:${SECRET}:${subject}`));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
const env = { SUPABASE_URL: "https://db.example", SUPABASE_SERVICE_ROLE_KEY: "svc", OBELISK_VERIFY_SECRET: SECRET };
const origin = "https://callofdoodie.wtf";

describe("/api/profile (S163 cloud backup)", () => {
  it("answers 503 when the deployment has no secrets", async () => {
    const res = await onRequest({ request: new Request("https://callofdoodie.wtf/api/profile?subject=s1", { headers: { origin } }), env: {} });
    expect(res.status).toBe(503);
  });

  it("rejects a wrong or missing profile key", async () => {
    const bad = await onRequest({ request: new Request("https://callofdoodie.wtf/api/profile?subject=s1", { headers: { origin, "x-profile-key": "f".repeat(64) } }), env });
    expect(bad.status).toBe(401);
    const missing = await onRequest({ request: new Request("https://callofdoodie.wtf/api/profile?subject=s1", { headers: { origin } }), env });
    expect(missing.status).toBe(401);
  });

  it("reads and writes through the service-role REST path with a valid key", async () => {
    const key = await keyFor("s1");
    const calls = [];
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (url, init) => {
      calls.push({ url: String(url), method: init?.method || "GET", auth: init?.headers?.authorization });
      if ((init?.method || "GET") === "GET") return new Response(JSON.stringify([{ backup: { schema: "cod-progress-backup-v1", entries: {} }, updated_at: "2026-09-03T00:00:00Z" }]), { status: 200 });
      return new Response("", { status: 201 });
    });
    try {
      const get = await onRequest({ request: new Request("https://callofdoodie.wtf/api/profile?subject=s1", { headers: { origin, "x-profile-key": key } }), env });
      expect(get.status).toBe(200);
      expect((await get.json()).updatedAt).toBe("2026-09-03T00:00:00Z");
      const put = await onRequest({ request: new Request("https://callofdoodie.wtf/api/profile", { method: "PUT", headers: { origin, "x-profile-key": key, "content-type": "application/json" }, body: JSON.stringify({ subject: "s1", backup: { schema: "cod-progress-backup-v1", entries: { "cod-career-v1": "{}" } } }) }), env });
      expect(put.status).toBe(200);
      expect(calls.every((c) => c.auth === "Bearer svc")).toBe(true);
      expect(calls.some((c) => c.url.includes("cod_profiles?on_conflict=subject"))).toBe(true);
      // A key for another subject cannot touch this row.
      const other = await onRequest({ request: new Request("https://callofdoodie.wtf/api/profile?subject=s1", { headers: { origin, "x-profile-key": await keyFor("s2") } }), env });
      expect(other.status).toBe(401);
    } finally {
      fetchSpy.mockRestore();
    }
  });

  it("rejects foreign origins and malformed backups", async () => {
    const key = await keyFor("s1");
    const foreign = await onRequest({ request: new Request("https://callofdoodie.wtf/api/profile?subject=s1", { headers: { origin: "https://evil.example", "x-profile-key": key } }), env });
    expect(foreign.status).toBe(403);
    const bad = await onRequest({ request: new Request("https://callofdoodie.wtf/api/profile", { method: "PUT", headers: { origin, "x-profile-key": key }, body: JSON.stringify({ subject: "s1", backup: { schema: "nope" } }) }), env });
    expect(bad.status).toBe(400);
  });
});
