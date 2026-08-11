import { afterEach, describe, expect, it, vi } from "vitest";

describe("audio unlock prewarm", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("constructs the audio context during idle and only resumes it on the first gesture", async () => {
    let idleCallback;
    const resume = vi.fn();
    const AudioContext = vi.fn(function AudioContextStub() {
      this.state = "suspended";
      this.resume = resume;
    });
    vi.stubGlobal("AudioContext", AudioContext);
    vi.stubGlobal("requestIdleCallback", (callback) => {
      idleCallback = callback;
      return 1;
    });

    await import("./sounds.js");
    expect(AudioContext).not.toHaveBeenCalled();
    idleCallback();
    expect(AudioContext).toHaveBeenCalledTimes(1);

    document.dispatchEvent(new Event("pointerdown"));
    expect(AudioContext).toHaveBeenCalledTimes(1);
    expect(resume).toHaveBeenCalledTimes(1);
  });
});
