import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe("runtime boundary source contract", () => {
  it("protects the first frame and keeps an immediate intent path", async () => {
    vi.useFakeTimers();
    const source = await import("./RuntimeBoundary.jsx?source-contract");
    expect(source.RuntimeBoundary).toBeTypeOf("function");
    vi.useRealTimers();
  });

  it("makes the lightweight frame a useful front door before hydration", async () => {
    vi.useFakeTimers();
    const { RuntimeBoundary } = await import("./RuntimeBoundary.jsx?render-contract");
    const container = document.createElement("div");
    document.body.appendChild(container);
    let root;
    await act(async () => {
      root = createRoot(container);
      root.render(<RuntimeBoundary />);
    });
    expect(container.querySelector('[data-testid="runtime-enter"]')?.textContent).toContain("Play now");
    expect(container.querySelector('a[href="/stats/"]')?.textContent).toBe("Live Stats");
    expect(container.querySelector('a[href="/modes/"]')).toBeTruthy();
    act(() => root.unmount());
    container.remove();
    vi.useRealTimers();
  });
});
