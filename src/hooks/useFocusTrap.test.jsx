import { act, createRef } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useFocusTrap } from "./useFocusTrap.js";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function TrapHarness({ enabled = true }) {
  const ref = createRef();
  useFocusTrap(ref, enabled);
  return (
    <div ref={ref}>
      <button data-id="first">FIRST</button>
      <button data-id="last">LAST</button>
    </div>
  );
}

describe("useFocusTrap", () => {
  let container;
  let root;
  let opener;

  beforeEach(() => {
    opener = document.createElement("button");
    opener.textContent = "OPEN";
    document.body.appendChild(opener);
    opener.focus();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    opener.remove();
  });

  it("moves focus inside, wraps Tab in both directions, and restores the opener", () => {
    act(() => root.render(<TrapHarness />));
    const first = container.querySelector('[data-id="first"]');
    const last = container.querySelector('[data-id="last"]');
    expect(document.activeElement).toBe(first);

    last.focus();
    last.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true }));
    expect(document.activeElement).toBe(first);

    first.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", shiftKey: true, bubbles: true, cancelable: true }));
    expect(document.activeElement).toBe(last);

    act(() => root.unmount());
    expect(document.activeElement).toBe(opener);
    root = createRoot(container);
  });

  it("leaves focus unchanged when disabled", () => {
    act(() => root.render(<TrapHarness enabled={false} />));
    expect(document.activeElement).toBe(opener);
  });
});
