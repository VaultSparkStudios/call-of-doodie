import { describe, expect, it, vi } from "vitest";
import { profileRequest } from "../functions/api/profile.js";
import { issueProfileCapability, PROFILE_CAPABILITY_LIFETIME_MS } from "../src/server/profileCapability.js";

const env = {
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "service-role",
  OBELISK_VERIFY_URL: "https://obeliskgate.com/verify",
  OBELISK_VERIFY_SECRET: "verify-secret",
};
const url = "https://callofdoodie.wtf/api/profile?subject=player-123";
const NOW = 123456;

function request(headers = {}) { return new Request(url, { headers: { "cf-connecting-ip": crypto.randomUUID(), ...headers } }); }
async function headersFor(subject = "player-123", token = "active") {
  const issued = await issueProfileCapability(env.OBELISK_VERIFY_SECRET, subject, token, NOW);
  return { authorization: `Bearer ${token}`, "x-profile-capability": issued.capability };
}

describe("profile cloud authorization", () => {
  it("answers 503 when cloud dependencies are absent and rejects foreign origins", async () => {
    const disabled = await profileRequest({ request: request(), env: {}, fetchImpl: vi.fn() });
    expect(disabled.status).toBe(503);
    const foreign = await profileRequest({ request: request({ origin: "https://evil.example" }), env, fetchImpl: vi.fn() });
    expect(foreign.status).toBe(403);
  });

  it("rejects the old permanent profile hash and never reaches storage", async () => {
    const fetchImpl = vi.fn();
    const response = await profileRequest({ request: request({ "x-profile-key": "a".repeat(64) }), env, fetchImpl });
    expect(response.status).toBe(401);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("rejects a revoked upstream session and never reaches storage", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ ok: false, reason: "revoked" }), { status: 401 }));
    const response = await profileRequest({ request: request(await headersFor("player-123", "revoked-session")), env, fetchImpl, now: () => NOW });
    expect(response.status).toBe(401);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("rejects expired, tampered and wrong-token capabilities before upstream access", async () => {
    const fetchImpl = vi.fn();
    const headers = await headersFor();
    const expired = await profileRequest({ request: request(headers), env, fetchImpl, now: () => NOW + PROFILE_CAPABILITY_LIFETIME_MS });
    const tampered = await profileRequest({ request: request({ ...headers, "x-profile-capability": `${headers["x-profile-capability"]}x` }), env, fetchImpl, now: () => NOW });
    const wrongToken = await profileRequest({ request: request({ ...headers, authorization: "Bearer other-session" }), env, fetchImpl, now: () => NOW });
    expect([expired.status, tampered.status, wrongToken.status]).toEqual([401, 401, 401]);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("strips credentials from a legacy cloud backup before returning it", async () => {
    const fetchImpl = vi.fn(async (target) => target === env.OBELISK_VERIFY_URL
      ? new Response(JSON.stringify({ ok: true, identity: { subject: "player-123" } }), { status: 200 })
      : new Response(JSON.stringify([{ backup: { schema: "cod-progress-backup-v1", entries: {
        "cod-career-v1": JSON.stringify({ bestScore: 42 }),
        "cod-obelisk-passport-v1": JSON.stringify({ profileKey: "leaked" }),
      } }, updated_at: "2026-09-30T00:00:00Z" }]), { status: 200 }));
    const response = await profileRequest({ request: request(await headersFor()), env, fetchImpl, now: () => NOW });
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.ignored).toContain("cod-obelisk-passport-v1");
    expect(JSON.stringify(body.backup)).not.toContain("leaked");
  });

  it("reads and writes only the verified subject through the service-role store", async () => {
    const calls = [];
    const fetchImpl = vi.fn(async (target, init) => {
      calls.push({ target: String(target), init });
      if (target === env.OBELISK_VERIFY_URL) return new Response(JSON.stringify({ ok: true, identity: { subject: "player-123" } }), { status: 200 });
      if (init?.method === "POST") return new Response("", { status: 201 });
      return new Response(JSON.stringify([{ backup: { schema: "cod-progress-backup-v2", entries: {} }, updated_at: "2026-09-30T00:00:00Z" }]), { status: 200 });
    });
    const activeHeaders = await headersFor();
    const get = await profileRequest({ request: request(activeHeaders), env, fetchImpl, now: () => NOW });
    expect(get.status).toBe(200);
    const put = await profileRequest({
      request: new Request("https://callofdoodie.wtf/api/profile", {
        method: "PUT", headers: { ...activeHeaders, "content-type": "application/json", "cf-connecting-ip": crypto.randomUUID() },
        body: JSON.stringify({ subject: "player-123", backup: { schema: "cod-progress-backup-v2", entries: { "cod-career-v1": "{}" } } }),
      }), env, fetchImpl, now: () => NOW,
    });
    expect(put.status).toBe(200);
    expect(calls.filter((call) => call.target.includes("cod_profiles")).every((call) => call.init.headers.authorization === "Bearer service-role")).toBe(true);
    expect(calls.some((call) => call.target.includes("on_conflict=subject"))).toBe(true);
    const wrongSubject = await profileRequest({ request: new Request("https://callofdoodie.wtf/api/profile?subject=other", { headers: { ...activeHeaders, "cf-connecting-ip": crypto.randomUUID() } }), env, fetchImpl, now: () => NOW });
    expect(wrongSubject.status).toBe(401);
  });

  it("rejects a credential-bearing cloud upload", async () => {
    const fetchImpl = vi.fn();
    const response = await profileRequest({
      request: new Request("https://callofdoodie.wtf/api/profile", {
        method: "PUT", headers: { authorization: "Bearer active", "content-type": "application/json", "cf-connecting-ip": crypto.randomUUID() },
        body: JSON.stringify({ subject: "player-123", backup: { schema: "cod-progress-backup-v2", entries: { "cod-obelisk-passport-v1": "{}" } } }),
      }), env, fetchImpl,
    });
    expect(response.status).toBe(400);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("rejects oversized and unsupported uploads before contacting identity or storage", async () => {
    const fetchImpl = vi.fn();
    const oversized = await profileRequest({
      request: new Request(url, {
        method: "PUT", headers: { "content-type": "application/json", "cf-connecting-ip": crypto.randomUUID() },
        body: JSON.stringify({ subject: "player-123", backup: { schema: "cod-progress-backup-v2", entries: {} }, pad: "é".repeat(270000) }),
      }), env, fetchImpl,
    });
    const wrongType = await profileRequest({
      request: new Request(url, {
        method: "PUT", headers: { "content-type": "text/plain", "cf-connecting-ip": crypto.randomUUID() }, body: "{}",
      }), env, fetchImpl,
    });
    expect(oversized.status).toBe(413);
    expect((await oversized.json()).error).toBe("too_large");
    expect(wrongType.status).toBe(415);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("types upstream verification timeouts and bounds retries", async () => {
    const controller = new AbortController();
    const timeout = vi.spyOn(AbortSignal, "timeout").mockReturnValue(controller.signal);
    const fetchImpl = vi.fn(async (_target, init) => {
      expect(init.signal).toBe(controller.signal);
      controller.abort();
      throw new DOMException("Timed out", "TimeoutError");
    });
    const response = await profileRequest({ request: request(await headersFor()), env, fetchImpl, now: () => NOW });
    expect(response.status).toBe(504);
    expect((await response.json()).error).toBe("verify_timeout");
    expect(response.headers.get("retry-after")).toBe("5");
    expect(fetchImpl).toHaveBeenCalledOnce();
    timeout.mockRestore();
  });
});
