import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import PrimaryNavigation from "./PrimaryNavigation.jsx";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe("PrimaryNavigation", () => {
  let root;
  let container;
  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
  });

  it("exposes high-value routes and restores focus when More closes", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    const onOpenProgress = vi.fn();
    await act(async () => {
      root = createRoot(container);
      root.render(<PrimaryNavigation onOpenProgress={onOpenProgress} />);
    });

    expect(container.querySelector('a[href="/stats/"]')).toBeTruthy();
    expect(container.querySelector('a[href="/leaderboard/"]')).toBeTruthy();
    const more = [...container.querySelectorAll("button")].find((button) => button.textContent === "More");
    more.focus();
    await act(async () => { more.click(); });
    expect(container.querySelector('[role="dialog"]')).toBeTruthy();
    expect(document.activeElement?.getAttribute("aria-label")).toBe("Close navigation");
    await act(async () => { document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })); });
    expect(container.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(more);
  });

  it("routes mobile Progress and Loadout actions without adding a page layer", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    const onOpenProgress = vi.fn();
    const onOpenLoadout = vi.fn();
    await act(async () => {
      root = createRoot(container);
      root.render(<PrimaryNavigation onOpenProgress={onOpenProgress} onOpenLoadout={onOpenLoadout} />);
    });
    const mobile = container.querySelector('[aria-label="Game navigation"]');
    await act(async () => {
      [...mobile.querySelectorAll("button")].find((button) => button.textContent.includes("Progress")).click();
      [...mobile.querySelectorAll("button")].find((button) => button.textContent.includes("Loadout")).click();
    });
    expect(onOpenProgress).toHaveBeenCalledTimes(1);
    expect(onOpenLoadout).toHaveBeenCalledTimes(1);
  });

  it("marks Play as active by default and Stats when activeSection is stats", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    await act(async () => {
      root = createRoot(container);
      root.render(<PrimaryNavigation activeSection="play" />);
    });
    const mobile = container.querySelector('[aria-label="Game navigation"]');
    const playLink = mobile.querySelector('a[href="#deploy"]');
    const statsLink = mobile.querySelector('a[href="#live-stats"]');
    expect(playLink.getAttribute("aria-current")).toBe("true");
    expect(statsLink.getAttribute("aria-current")).toBeNull();

    await act(async () => {
      root.render(<PrimaryNavigation activeSection="stats" />);
    });
    expect(playLink.getAttribute("aria-current")).toBeNull();
    expect(statsLink.getAttribute("aria-current")).toBe("true");
  });
});
