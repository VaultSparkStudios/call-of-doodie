import { act, lazy } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AsyncPanelBoundary from "./AsyncPanelBoundary.jsx";
import { planPanelRecovery } from "../utils/asyncPanelRecovery.js";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let container;
let root;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.restoreAllMocks();
});

describe("AsyncPanelBoundary", () => {
  it("renders an accessible non-empty loading state", () => {
    const Pending = lazy(() => new Promise(() => {}));
    act(() => root.render(<AsyncPanelBoundary label="command center"><Pending /></AsyncPanelBoundary>));
    expect(container.querySelector('[role="status"]')?.textContent).toContain("LOADING COMMAND CENTER");
    expect(container.textContent).toContain("run state stays in memory");
  });

  it("prevents a rejected chunk from causing a reload loop", () => {
    const data = new Map();
    const storage = { getItem: (key) => data.get(key) || null, setItem: (key, value) => data.set(key, value) };
    expect(planPanelRecovery(storage, 100_000)).toEqual({ action: "reload", retryAfterMs: 0 });
    expect(planPanelRecovery(storage, 100_500)).toEqual({ action: "wait", retryAfterMs: 59_500 });
    expect(planPanelRecovery(storage, 160_001)).toEqual({ action: "reload", retryAfterMs: 0 });
  });

  it("contains a panel failure and offers an injected recovery action", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const recover = vi.fn();
    function BrokenPanel() { throw Object.assign(new Error("private chunk URL"), { name: "ChunkLoadError" }); }
    act(() => root.render(<AsyncPanelBoundary onRecover={recover}><BrokenPanel /></AsyncPanelBoundary>));
    expect(container.querySelector('[role="alert"]')?.textContent).toContain("PANEL LOAD INTERRUPTED");
    expect(container.textContent).not.toContain("private chunk URL");
    act(() => container.querySelector("button").click());
    expect(recover).toHaveBeenCalledOnce();
  });
});
