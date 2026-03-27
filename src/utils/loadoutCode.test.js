import { describe, it, expect } from "vitest";
import { encodeLoadout, decodeLoadout, isValidLoadoutCode } from "./loadoutCode.js";

// Format: 2-char weapon hex (00–0C) + 1-char starter index (0–3) = 3 chars total

describe("encodeLoadout", () => {
  it("encodes weapon 0 + standard as '000'", () => {
    expect(encodeLoadout({ weaponIdx: 0, starterLoadout: "standard" })).toBe("000");
  });

  it("encodes weapon 11 + cannon as '0B1'", () => {
    expect(encodeLoadout({ weaponIdx: 11, starterLoadout: "cannon" })).toBe("0B1");
  });

  it("encodes weapon 12 (max valid) correctly", () => {
    expect(encodeLoadout({ weaponIdx: 12, starterLoadout: "standard" })).toBe("0C0");
  });

  it("clamps weaponIdx above 12 to 12", () => {
    expect(encodeLoadout({ weaponIdx: 99, starterLoadout: "standard" })).toBe("0C0");
  });

  it("clamps negative weaponIdx to 0", () => {
    expect(encodeLoadout({ weaponIdx: -5, starterLoadout: "standard" })).toBe("000");
  });

  it("defaults unknown starterLoadout to index 0 (standard)", () => {
    // indexOf returns -1 for unknown; Math.max(0, -1) = 0
    expect(encodeLoadout({ weaponIdx: 3, starterLoadout: "unknown" })).toBe("030");
  });

  it("encodes speedster (index 3)", () => {
    expect(encodeLoadout({ weaponIdx: 5, starterLoadout: "speedster" })).toBe("053");
  });

  it("encodes tank (index 2)", () => {
    expect(encodeLoadout({ weaponIdx: 0, starterLoadout: "tank" })).toBe("002");
  });

  it("defaults missing fields gracefully", () => {
    expect(encodeLoadout({})).toBe("000");
  });
});

describe("decodeLoadout", () => {
  it("decodes '000' → weapon 0 + standard", () => {
    expect(decodeLoadout("000")).toEqual({ weaponIdx: 0, starterLoadout: "standard" });
  });

  it("decodes '0B1' → weapon 11 + cannon", () => {
    expect(decodeLoadout("0B1")).toEqual({ weaponIdx: 11, starterLoadout: "cannon" });
  });

  it("is case-insensitive (lowercase)", () => {
    expect(decodeLoadout("0b1")).toEqual({ weaponIdx: 11, starterLoadout: "cannon" });
  });

  it("round-trips all 4 starter loadouts for weapon 3", () => {
    ["standard", "cannon", "tank", "speedster"].forEach((sl) => {
      const code = encodeLoadout({ weaponIdx: 3, starterLoadout: sl });
      expect(decodeLoadout(code)).toEqual({ weaponIdx: 3, starterLoadout: sl });
    });
  });

  it("round-trips all valid weapon indices (0–12)", () => {
    for (let i = 0; i <= 12; i++) {
      const code = encodeLoadout({ weaponIdx: i, starterLoadout: "standard" });
      expect(decodeLoadout(code)).toEqual({ weaponIdx: i, starterLoadout: "standard" });
    }
  });

  it("returns null for string shorter than 3 chars", () => {
    expect(decodeLoadout("00")).toBeNull();
    expect(decodeLoadout("0")).toBeNull();
    expect(decodeLoadout("")).toBeNull();
  });

  it("returns null for null input", () => {
    expect(decodeLoadout(null)).toBeNull();
  });

  it("returns null for non-string input", () => {
    expect(decodeLoadout(42)).toBeNull();
    expect(decodeLoadout(undefined)).toBeNull();
  });

  it("returns null when weaponIdx > 12", () => {
    // '0D0' = decimal 13 for weapon
    expect(decodeLoadout("0D0")).toBeNull();
  });

  it("returns null when starter index > 3", () => {
    expect(decodeLoadout("004")).toBeNull();
  });
});

describe("isValidLoadoutCode", () => {
  it("accepts valid 3-char hex codes (uppercase)", () => {
    expect(isValidLoadoutCode("000")).toBe(true);
    expect(isValidLoadoutCode("0C3")).toBe(true);
    expect(isValidLoadoutCode("0B1")).toBe(true);
    expect(isValidLoadoutCode("FFF")).toBe(true);
  });

  it("accepts valid 3-char hex codes (lowercase)", () => {
    expect(isValidLoadoutCode("0b1")).toBe(true);
    expect(isValidLoadoutCode("abc")).toBe(true);
  });

  it("rejects codes shorter than 3 chars", () => {
    expect(isValidLoadoutCode("00")).toBe(false);
    expect(isValidLoadoutCode("0")).toBe(false);
    expect(isValidLoadoutCode("")).toBe(false);
  });

  it("rejects codes longer than 3 chars", () => {
    expect(isValidLoadoutCode("0000")).toBe(false);
  });

  it("rejects non-hex characters", () => {
    expect(isValidLoadoutCode("00G")).toBe(false);
    expect(isValidLoadoutCode("XYZ")).toBe(false);
    expect(isValidLoadoutCode("00!")).toBe(false);
  });

  it("rejects non-string types", () => {
    expect(isValidLoadoutCode(null)).toBe(false);
    expect(isValidLoadoutCode(undefined)).toBe(false);
    expect(isValidLoadoutCode(123)).toBe(false);
  });

  it("trims whitespace before validating", () => {
    // isValidLoadoutCode uses .trim() internally
    expect(isValidLoadoutCode(" 000 ")).toBe(true);
  });
});
