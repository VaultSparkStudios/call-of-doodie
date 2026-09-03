import { describe, expect, it } from "vitest";
import { exportPassport, importPassport, readPassport, sanitizeObeliskIdentity, savePassport } from "./obeliskPassport.js";

function memoryStorage() {
  const values = new Map();
  return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key) };
}

describe("Porcelain Passport", () => {
  it("stores only the minimum verified identity receipt", () => {
    const passport = sanitizeObeliskIdentity({ ok: true, identity: { subject: "player-123", tier: "T4", token: "must-not-persist", email: "private@example.com" } }, 0);
    expect(passport).toEqual({ schemaVersion: "porcelain-passport-v1", issuer: "Obelisk", project: "call-of-doodie", subject: "player-123", tier: "T4", verifiedAt: "1970-01-01T00:00:00.000Z", profileKey: null });
    expect(JSON.stringify(passport)).not.toContain("must-not-persist");
    expect(JSON.stringify(passport)).not.toContain("private@example.com");
  });

  it("round-trips an integrity-checked local export", () => {
    const passport = sanitizeObeliskIdentity({ ok: true, identity: { subject: "player-123" } }, 0);
    expect(importPassport(exportPassport(passport))).toEqual(passport);
    expect(() => importPassport(exportPassport(passport).replace("player-123", "attacker"))).toThrow("integrity");
  });

  it("reads only versioned Passport records", () => {
    const storage = memoryStorage();
    const passport = sanitizeObeliskIdentity({ ok: true, identity: { subject: "player-123" } }, 0);
    expect(savePassport(passport, storage)).toBe(true);
    expect(readPassport(storage)).toEqual(passport);
  });
});
