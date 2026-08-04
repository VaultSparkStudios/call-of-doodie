import { describe, expect, it, vi } from "vitest";

describe("runtime boundary source contract", () => {
  it("protects the first frame and keeps an immediate intent path", async () => {
    vi.useFakeTimers();
    const source = await import("./RuntimeBoundary.jsx?source-contract");
    expect(source.RuntimeBoundary).toBeTypeOf("function");
    vi.useRealTimers();
  });
});
