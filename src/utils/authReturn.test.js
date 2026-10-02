import { describe, expect, it } from "vitest";
import { sanitizeAuthReturn, saveAuthReturn, takeAuthReturn } from "./authReturn.js";

function memoryStorage() {
  const map = new Map();
  return { getItem: (key) => map.get(key) || null, setItem: (key, value) => map.set(key, value), removeItem: (key) => map.delete(key) };
}

describe("Obelisk return target", () => {
  const origin = "https://callofdoodie.wtf";
  it("keeps only known same-origin game destinations", () => {
    expect(sanitizeAuthReturn("/#profile/save", origin)).toBe("/#profile/save");
    expect(sanitizeAuthReturn("/modes/", origin)).toBe("/modes/");
    expect(sanitizeAuthReturn("https://elsewhere.example/", origin)).toBe("/");
    expect(sanitizeAuthReturn("//elsewhere.example/", origin)).toBe("/");
    expect(sanitizeAuthReturn("/auth/callback?obelisk_session=secret", origin)).toBe("/");
    expect(sanitizeAuthReturn("/#unknown", origin)).toBe("/");
  });
  it("consumes a saved target once", () => {
    const storage = memoryStorage();
    saveAuthReturn("/#build/setup", storage, origin);
    expect(takeAuthReturn(null, storage, origin)).toBe("/#build/setup");
    expect(takeAuthReturn(null, storage, origin)).toBe("/");
  });
});
