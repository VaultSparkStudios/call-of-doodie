import { describe, expect, it, vi } from "vitest";
import { describeAccountState, revalidateAccountSession } from "./accountSession.js";
import { saveCloudSession } from "./cloudSession.js";

const passport = { subject: "player-1" };
function storage() {
  const data = new Map();
  return { getItem: (key) => data.get(key) || null, setItem: (key, value) => data.set(key, value), removeItem: (key) => data.delete(key) };
}

describe("account session", () => {
  it("keeps a restored receipt separate from a verified session", async () => {
    expect(describeAccountState(null, "receipt", false).state).toBe("guest");
    expect(describeAccountState(passport, "receipt", true).state).toBe("receipt");
    expect(await revalidateAccountSession(passport, { storage: storage(), fetchImpl: vi.fn() })).toEqual({ state: "receipt" });
  });

  it("requires upstream subject agreement and clears a revoked session", async () => {
    const now = Date.now();
    const memory = storage();
    saveCloudSession({ token: "live-token", subject: passport.subject, capability: "v1.payload.signature", expiresAt: now + 100000 }, memory, now);
    const verify = vi.fn(async () => new Response(JSON.stringify({ ok: true, identity: { subject: "someone-else" } }), { status: 200 }));
    expect(await revalidateAccountSession(passport, { storage: memory, fetchImpl: verify, now })).toEqual({ state: "expired" });
    expect(JSON.stringify([...verify.mock.calls])).toContain("live-token");
    expect(await revalidateAccountSession(passport, { storage: memory, fetchImpl: verify, now })).toEqual({ state: "receipt" });
  });

  it("reports verified only after a matching upstream response", async () => {
    const now = Date.now();
    const memory = storage();
    saveCloudSession({ token: "live-token", subject: passport.subject, capability: "v1.payload.signature", expiresAt: now + 100000 }, memory, now);
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ ok: true, identity: { subject: passport.subject }, verifiedAt: now }), { status: 200 }));
    expect(await revalidateAccountSession(passport, { storage: memory, fetchImpl, now })).toEqual({ state: "verified", verifiedAt: now, cloudCapability: false });
    expect(describeAccountState(passport, "verified", false).state).toBe("verified");
    expect(describeAccountState(passport, "verified", true).state).toBe("cloud-available");
  });

  it("calls an elapsed tab session expired while keeping the local receipt", async () => {
    const now = Date.now();
    const memory = storage();
    saveCloudSession({ token: "old", subject: passport.subject, capability: "v1.payload.signature", expiresAt: now + 1000 }, memory, now);
    expect(await revalidateAccountSession(passport, { storage: memory, now: now + 2000, fetchImpl: vi.fn() })).toEqual({ state: "expired" });
  });
});
