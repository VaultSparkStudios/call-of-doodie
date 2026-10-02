import { describe, expect, it } from "vitest";
import { createLocalRateLimiter } from "./localRateLimiter.js";

describe("local burst guard", () => {
  it("does not reset an existing client's quota when key capacity is reached", () => {
    const consume = createLocalRateLimiter(2, 2);
    expect(consume("a", 0)).toBe(true);
    expect(consume("a", 0)).toBe(true);
    expect(consume("b", 0)).toBe(true);
    expect(consume("c", 0)).toBe(false);
    expect(consume("a", 0)).toBe(false);
    expect(consume("c", 60000)).toBe(true);
  });
});
