import { beforeEach, describe, expect, it } from "vitest";
import {
  classifyStorageFailure,
  getStorageHealth,
  probeLocalStorage,
  removeLocalState,
  resetStorageHealthForTests,
  writeLocalState,
} from "./storageHealth.js";

beforeEach(() => resetStorageHealthForTests());

describe("local storage durability receipt", () => {
  it("records success without retaining keys or values", () => {
    const data = new Map();
    const storage = { setItem: (key, value) => data.set(key, value), removeItem: (key) => data.delete(key) };
    const result = writeLocalState("secret-key", "secret-value", { storage, surface: "career", now: 10 });
    expect(result.ok).toBe(true);
    expect(data.get("secret-key")).toBe("secret-value");
    expect(JSON.stringify(result.receipt)).not.toContain("secret");
    expect(result.receipt).toMatchObject({ status: "healthy", successCount: 1, failureCount: 0 });
  });

  it("classifies quota/privacy/unavailable failures and bounds the journal", () => {
    const storage = { setItem: () => { throw Object.assign(new Error("private detail"), { name: "QuotaExceededError" }); } };
    for (let i = 0; i < 12; i += 1) writeLocalState(`key-${i}`, `value-${i}`, { storage, surface: `career ${i}`, now: i + 1 });
    const receipt = getStorageHealth();
    expect(receipt.status).toBe("degraded");
    expect(receipt.failures).toHaveLength(8);
    expect(receipt.lastFailure).toEqual({ surface: "career-11", code: "quota-exceeded", at: 12 });
    expect(JSON.stringify(receipt)).not.toContain("private detail");
    expect(classifyStorageFailure({ name: "SecurityError" })).toBe("access-denied");
    expect(classifyStorageFailure({ name: "InvalidStateError" })).toBe("storage-unavailable");
  });

  it("marks recovery only after a later successful write", () => {
    writeLocalState("a", "b", { storage: null, surface: "missions", now: 10 });
    expect(getStorageHealth().status).toBe("degraded");
    const data = new Map();
    const storage = { setItem: (key, value) => data.set(key, value), removeItem: (key) => data.delete(key) };
    writeLocalState("a", "b", { storage, surface: "missions", now: 11 });
    expect(getStorageHealth()).toMatchObject({ status: "recovered", failureCount: 1, successCount: 1 });
    expect(removeLocalState("a", { storage, surface: "missions", now: 12 }).ok).toBe(true);
  });

  it("does not let an unrelated surface mask an active progression failure", () => {
    writeLocalState("career", "x", { storage: null, surface: "progression", now: 20 });
    const data = new Map();
    const storage = { setItem: (key, value) => data.set(key, value) };
    writeLocalState("theme", "dark", { storage, surface: "settings", now: 21 });
    expect(getStorageHealth()).toMatchObject({ status: "degraded", activeFailureCount: 1, lastFailure: { surface: "progression" } });
    writeLocalState("career", "ok", { storage, surface: "progression", now: 22 });
    expect(getStorageHealth()).toMatchObject({ status: "recovered", activeFailureCount: 0 });
  });

  it("probes and restores the reserved health key", () => {
    const data = new Map([["__cod_storage_health_probe__", "existing"]]);
    const storage = {
      getItem: (key) => data.get(key) ?? null,
      setItem: (key, value) => data.set(key, value),
      removeItem: (key) => data.delete(key),
    };
    expect(probeLocalStorage(storage, 20).ok).toBe(true);
    expect(data.get("__cod_storage_health_probe__")).toBe("existing");
  });
});
