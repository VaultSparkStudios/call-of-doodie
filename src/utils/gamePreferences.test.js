import { beforeEach, describe, expect, it, vi } from "vitest";
import { readPreference, writePreference } from "./gamePreferences.js";
import { getStorageHealth, resetStorageHealthForTests } from "./storageHealth.js";

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  resetStorageHealthForTests();
  vi.restoreAllMocks();
});

describe("fail-open game preferences", () => {
  it("keeps local and session preferences isolated", () => {
    expect(writePreference("hud", "compact").ok).toBe(true);
    expect(writePreference("banner", "1", "session", "home").ok).toBe(true);
    expect(readPreference("hud", "standard")).toBe("compact");
    expect(readPreference("banner", "0", "session", "home")).toBe("1");
  });

  it("returns the default and records sanitized denial evidence", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw Object.assign(new Error("private"), { name: "SecurityError" });
    });
    expect(readPreference("hud", "standard")).toBe("standard");
    expect(getStorageHealth()).toMatchObject({ status: "degraded", lastFailure: { surface: "preference.hud", code: "access-denied" } });
  });
});
