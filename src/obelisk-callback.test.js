import { afterEach, describe, expect, it, vi } from "vitest";
import { handleObeliskCallback } from "./obelisk-callback.js";

describe("handleObeliskCallback", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    window.history.pushState({}, "", "/");
  });

  it("returns no-token without calling verify endpoint", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    window.history.pushState({}, "", "/auth/callback");

    await expect(handleObeliskCallback()).resolves.toEqual({ ok: false, reason: "no-token" });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("posts the returned session token to the verify endpoint", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({
      ok: true,
      identity: { subject: "player-123" },
    }), { status: 200, headers: { "content-type": "application/json" } }));
    window.history.pushState({}, "", "/auth/callback?obelisk_session=session-token");

    await expect(handleObeliskCallback({ verifyEndpoint: "/api/obelisk-verify" })).resolves.toMatchObject({
      ok: true,
      identity: { subject: "player-123" },
    });
    expect(fetch).toHaveBeenCalledWith("/api/obelisk-verify", expect.objectContaining({
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token: "session-token" }),
    }));
  });

  it("returns verify-failed for a rejected backend response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({
      ok: false,
      reason: "bad-session",
    }), { status: 401, headers: { "content-type": "application/json" } }));
    window.history.pushState({}, "", "/auth/callback?obelisk_session=session-token");

    await expect(handleObeliskCallback()).resolves.toEqual({ ok: false, reason: "bad-session", detail: null });
  });
});
