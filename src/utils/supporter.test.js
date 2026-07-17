import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  LEGACY_SELF_ATTESTED_KEY,
  SUPPORTER_CACHE_TTL_MS,
  isSupporter,
  loadSupporterVerification,
  saveVerifiedSupporter,
  supporterVerificationStatus,
  verifySupporterCallsign,
} from "./supporter.js";

function memoryStorage() {
  const data = new Map();
  return {
    getItem: (key) => data.get(key) || null,
    setItem: (key, value) => data.set(key, value),
    removeItem: (key) => data.delete(key),
  };
}

function claimClient(result) {
  const maybeSingle = vi.fn().mockResolvedValue(result);
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    maybeSingle,
  };
  return { client: { from: vi.fn(() => query) }, query, maybeSingle };
}

describe("supporter verification", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("never treats the legacy self-attested flag as proof", () => {
    const storage = memoryStorage();
    storage.setItem(LEGACY_SELF_ATTESTED_KEY, "1");
    expect(isSupporter("RANGER", storage)).toBe(false);
    expect(supporterVerificationStatus("RANGER", storage).status).toBe("unverified");
  });

  it("requires a callsign match for a cached verified record", () => {
    const storage = memoryStorage();
    expect(saveVerifiedSupporter("RANGER", storage, 123)).toEqual({
      version: 2, verified: true, callsign: "RANGER", verifiedAt: 123,
    });
    expect(isSupporter("RANGER", storage, 124)).toBe(true);
    expect(isSupporter("OTHER", storage, 124)).toBe(false);
    expect(loadSupporterVerification(storage)?.callsign).toBe("RANGER");
  });

  it("expires cached proof so a revoked grant cannot live forever", () => {
    const storage = memoryStorage();
    saveVerifiedSupporter("RANGER", storage, 1000);
    expect(isSupporter("RANGER", storage, 1000 + SUPPORTER_CACHE_TTL_MS)).toBe(true);
    expect(isSupporter("RANGER", storage, 1001 + SUPPORTER_CACHE_TTL_MS)).toBe(false);
    expect(supporterVerificationStatus("RANGER", storage, 1001 + SUPPORTER_CACHE_TTL_MS)).toMatchObject({
      status: "stale", verified: false,
    });
  });

  it("caches supporter status only after the backend claim verifies it", async () => {
    const storage = memoryStorage();
    const verified = claimClient({ data: { name: "RANGER", supporter: true }, error: null });
    const result = await verifySupporterCallsign(" RANGER ", {
      client: verified.client,
      storage,
      now: () => 456,
    });
    expect(result).toMatchObject({ status: "verified", verified: true, callsign: "RANGER" });
    expect(verified.client.from).toHaveBeenCalledWith("callsign_claims");
    expect(verified.query.eq).toHaveBeenCalledWith("name", "RANGER");
    expect(isSupporter("RANGER", storage, 500)).toBe(true);
  });

  it("fails closed for pending, offline, and unavailable verification", async () => {
    const storage = memoryStorage();
    const pending = claimClient({ data: { name: "RANGER", supporter: false }, error: null });
    expect(await verifySupporterCallsign("RANGER", { client: pending.client, storage })).toMatchObject({ status: "pending", verified: false });
    expect(await verifySupporterCallsign("RANGER", { client: null, storage })).toMatchObject({ status: "offline", verified: false });
    const failed = claimClient({ data: null, error: new Error("network") });
    expect(await verifySupporterCallsign("RANGER", { client: failed.client, storage })).toMatchObject({ status: "unavailable", verified: false });
    expect(isSupporter("RANGER", storage)).toBe(false);
  });
});
