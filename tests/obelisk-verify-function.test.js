import { describe, expect, it, vi } from "vitest";
import { verifyObeliskRequest } from "../functions/api/obelisk-verify.js";

function request(body, method = "POST") {
  return new Request("https://callofdoodie.wtf/api/obelisk-verify", {
    method,
    headers: { "content-type": "application/json" },
    body: body == null ? undefined : JSON.stringify(body),
  });
}

async function readJson(response) {
  return response.json();
}

describe("obelisk verify Pages Function", () => {
  it("rejects requests without a token", async () => {
    const response = await verifyObeliskRequest({
      request: request({}),
      env: { OBELISK_VERIFY_URL: "https://obeliskgate.com/verify" },
    });

    expect(response.status).toBe(400);
    expect(await readJson(response)).toMatchObject({ ok: false, reason: "no-token" });
  });

  it("reports an honest not-configured state when no verify URL exists", async () => {
    const response = await verifyObeliskRequest({
      request: request({ token: "session-token" }),
      env: {},
    });

    expect(response.status).toBe(503);
    expect(await readJson(response)).toMatchObject({
      ok: false,
      reason: "verify-not-configured",
    });
  });

  it("returns a redacted identity receipt after upstream verification", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({
      ok: true,
      identity: {
        subject: "player-123",
        handle: "plungerAce",
        tier: "T4",
        email: "private@example.test",
      },
    }), { status: 200, headers: { "content-type": "application/json" } }));

    const response = await verifyObeliskRequest({
      request: request({ token: "session-token" }),
      env: {
        OBELISK_VERIFY_URL: "https://obeliskgate.com/verify",
        OBELISK_VERIFY_SECRET: "secret-value",
      },
      fetchImpl,
      now: () => 123456,
    });
    const body = await readJson(response);

    expect(response.status).toBe(200);
    expect(fetchImpl).toHaveBeenCalledWith("https://obeliskgate.com/verify", expect.objectContaining({
      method: "POST",
      headers: expect.objectContaining({ authorization: "Bearer secret-value" }),
    }));
    expect(body).toMatchObject({
      ok: true,
      provider: "obelisk",
      project: "Call of Doodie",
      verifiedAt: 123456,
      identity: {
        subject: "player-123",
        handle: "plungerAce",
        tier: "T4",
      },
      receipt: {
        version: "cod-obelisk-receipt-v1",
      },
    });
    expect(JSON.stringify(body)).not.toContain("private@example.test");
    expect(JSON.stringify(body)).not.toContain("session-token");
  });

  it("rejects failed upstream verification", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({
      ok: false,
      reason: "bad-session",
    }), { status: 401, headers: { "content-type": "application/json" } }));

    const response = await verifyObeliskRequest({
      request: request({ token: "session-token" }),
      env: { OBELISK_VERIFY_URL: "https://obeliskgate.com/verify" },
      fetchImpl,
    });

    expect(response.status).toBe(401);
    expect(await readJson(response)).toMatchObject({ ok: false, reason: "bad-session" });
  });
});
