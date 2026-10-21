import { afterEach, expect, it, vi } from "vitest";
import { readPassport, savePassport, clearPassport, sanitizeObeliskIdentity } from "./obeliskPassport.js";
import { exportProgressBackup, importProgressBackup } from "./progressBackup.js";

afterEach(() => vi.restoreAllMocks());
const passport = sanitizeObeliskIdentity({ ok: true, identity: { subject: "guest-test" } }, 0);
const backup = { schema: "cod-progress-backup-v2", entries: { "cod-career-v1": '{"bestScore":42}' } };
function deny() { vi.spyOn(globalThis, "localStorage", "get").mockImplementation(() => { throw new DOMException("denied", "SecurityError"); }); }

it("keeps Passport reads and cleanup optional when the getter is denied", () => {
  deny(); expect(readPassport()).toBeNull(); expect(savePassport(passport)).toBe(false); expect(() => clearPassport()).not.toThrow();
});
it("never reports an absent Passport write as persisted", () => {
  expect(savePassport(passport, null)).toBe(false); expect(readPassport(null)).toBeNull();
});
it("reports denied backup access without exporting an empty save or restoring", () => {
  deny(); expect(() => exportProgressBackup()).toThrow("Backup unavailable"); expect(() => importProgressBackup(backup)).toThrow("Restore unavailable");
});
it("reports denied methods and explicit null storage clearly", () => {
  const store = { get length() { throw new DOMException("denied", "SecurityError"); }, getItem() { throw new DOMException("denied", "SecurityError"); } };
  expect(() => exportProgressBackup(store)).toThrow("Backup unavailable"); expect(() => importProgressBackup(backup, store)).toThrow("Restore unavailable");
  expect(() => exportProgressBackup(null)).toThrow("Backup unavailable"); expect(() => importProgressBackup(backup, null)).toThrow("Restore unavailable");
});
it("keeps explicit injected stores and later browser recovery working", () => {
  const values = new Map(), store = { get length() { return values.size; }, key: i => [...values.keys()][i], getItem: k => values.get(k) ?? null, setItem: (k, v) => values.set(k, v), removeItem: k => values.delete(k) };
  deny(); expect(savePassport(passport, store)).toBe(true); expect(readPassport(store)).toEqual(passport);
  expect(importProgressBackup(backup, store).restored).toBe(1); expect(exportProgressBackup(store).entries).toEqual(backup.entries);
  vi.restoreAllMocks(); localStorage.clear(); expect(savePassport(passport)).toBe(true); expect(readPassport()).toEqual(passport); clearPassport(); expect(readPassport()).toBeNull();
});
it("does not emit a partial export when a record read fails", () => {
  const store = { length: 2, key: i => ["cod-career-v1", "cod-stash-v1"][i], getItem(k) { if (k === "cod-stash-v1") throw new DOMException("denied", "SecurityError"); return '{"bestScore":42}'; } };
  expect(() => exportProgressBackup(store)).toThrow("Backup unavailable");
  expect(() => exportProgressBackup({ length: 1, key() { throw new DOMException("denied", "SecurityError"); } })).toThrow("Backup unavailable");
});
it("fails Passport persistence on method denial and quota, then recovers", () => {
  let full = true;
  const values = new Map(), store = { getItem: k => values.get(k) ?? null, setItem(k, v) { if (full) throw new DOMException("full", "QuotaExceededError"); values.set(k, v); }, removeItem: k => values.delete(k) };
  expect(savePassport(passport, store)).toBe(false); expect(readPassport(store)).toBeNull();
  expect(readPassport({ getItem() { throw new DOMException("denied", "SecurityError"); } })).toBeNull();
  expect(() => clearPassport({ removeItem() { throw new DOMException("denied", "SecurityError"); } })).not.toThrow();
  full = false; expect(savePassport(passport, store)).toBe(true); expect(readPassport(store)).toEqual(passport);
});
it("can retry a quota-interrupted restore without losing previous records", () => {
  let full = true;
  const values = new Map([["cod-career-v1", '{"bestScore":7}']]), store = { getItem: k => values.get(k) ?? null, setItem(k, v) { if (full) throw new DOMException("full", "QuotaExceededError"); values.set(k, v); }, removeItem: k => values.delete(k) };
  expect(() => importProgressBackup(backup, store)).toThrow("previous save preserved"); expect(values.get("cod-career-v1")).toBe('{"bestScore":7}');
  full = false; expect(importProgressBackup(backup, store).restored).toBe(1); expect(values.get("cod-career-v1")).toBe('{"bestScore":42}');
});
