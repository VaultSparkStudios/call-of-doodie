import { describe, expect, it, vi } from "vitest";
import { scheduleIdleWork } from "./deferredWork.js";

describe("scheduleIdleWork", () => {
  it("uses the browser idle queue and remains cancellable", () => {
    const task = vi.fn();
    let queued;
    const windowRef = {
      requestIdleCallback: vi.fn((callback) => { queued = callback; return 17; }),
      cancelIdleCallback: vi.fn(),
    };
    const cancel = scheduleIdleWork(task, { windowRef });
    expect(windowRef.requestIdleCallback).toHaveBeenCalledWith(expect.any(Function), { timeout: 4_000 });
    cancel();
    queued();
    expect(task).not.toHaveBeenCalled();
    expect(windowRef.cancelIdleCallback).toHaveBeenCalledWith(17);
  });

  it("falls back to a delayed timer when the idle API is absent", () => {
    const task = vi.fn();
    let queued;
    const windowRef = {
      setTimeout: vi.fn((callback) => { queued = callback; return 23; }),
      clearTimeout: vi.fn(),
    };
    scheduleIdleWork(task, { windowRef, fallbackMs: 1_500 });
    expect(windowRef.setTimeout).toHaveBeenCalledWith(expect.any(Function), 1_500);
    queued();
    expect(task).toHaveBeenCalledOnce();
  });
});
