import { describe, it, expect } from "vitest";
import { encodeReplayCode, decodeReplayCode, isValidReplayCode } from "./replayCode.js";

describe("replayCode", () => {
  it("round-trips a typical run", () => {
    const orig = { seed: 123456, mode: "score_attack", difficulty: "hard", weaponIdx: 7, starterLoadout: "cannon" };
    const code = encodeReplayCode(orig);
    expect(code).toHaveLength(12);
    expect(isValidReplayCode(code)).toBe(true);
    const back = decodeReplayCode(code);
    expect(back).toEqual(orig);
  });
  it("invalidates corrupt checksum", () => {
    const code = encodeReplayCode({ seed: 1, mode: "standard", difficulty: "normal" });
    const broken = code.slice(0, 11) + "0";
    if (broken[11] === code[11]) {
      // randomly the last char already matched — flip a body char instead
      const flipped = (code[0] === "0" ? "F" : "0") + code.slice(1);
      expect(isValidReplayCode(flipped)).toBe(false);
    } else {
      expect(isValidReplayCode(broken)).toBe(false);
    }
  });
  it("rejects non-hex input", () => {
    expect(isValidReplayCode("zzz")).toBe(false);
    expect(isValidReplayCode("")).toBe(false);
    expect(isValidReplayCode(null)).toBe(false);
  });
  it("clamps out-of-range values without throwing", () => {
    const code = encodeReplayCode({ seed: 99999999, mode: "unknown_mode", difficulty: "wat", weaponIdx: 999, starterLoadout: "ghost" });
    expect(isValidReplayCode(code)).toBe(true);
    const back = decodeReplayCode(code);
    expect(back.mode).toBe("standard");
    expect(back.difficulty).toBe("normal");
    expect(back.starterLoadout).toBe("standard");
  });
});
