import { describe, expect, it } from "vitest";
import { clearCloudSession, readCloudSession, saveCloudSession } from "./cloudSession.js";

describe("tab-scoped cloud session", () => {
  it("expires after fifteen minutes and cannot authorize a different subject", () => {
    const storage = new Map();
    const fake = { setItem: (key, value) => storage.set(key, value), getItem: (key) => storage.get(key) ?? null, removeItem: (key) => storage.delete(key) };
    expect(saveCloudSession({ token: "token", subject: "player-123", capability: "v1.a.b", expiresAt: 901000 }, fake, 1000)).toBe(true);
    expect(readCloudSession("player-123", fake, 1001)).toEqual({ token: "token", capability: "v1.a.b" });
    expect(readCloudSession("other", fake, 1001)).toBeNull();
    expect(readCloudSession("player-123", fake, 901000)).toBeNull();
    clearCloudSession(fake);
    expect(readCloudSession("player-123", fake, 1001)).toBeNull();
  });
});
