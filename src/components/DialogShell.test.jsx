import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import DialogShell from "./DialogShell.jsx";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe("DialogShell", () => {
  let host;
  let root;
  let trigger;

  afterEach(() => {
    act(() => root?.unmount());
    host?.remove();
    trigger?.remove();
    vi.restoreAllMocks();
    root = null;
  });

  it("traps keyboard focus, closes on Escape, and returns focus to the trigger", () => {
    vi.spyOn(HTMLElement.prototype, "getClientRects").mockReturnValue([{ width: 40, height: 40 }]);
    trigger = document.createElement("button");
    trigger.textContent = "Open";
    document.body.appendChild(trigger);
    trigger.focus();
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
    const close = vi.fn();

    act(() => root.render(
      <DialogShell title="Test panel" onClose={close}>
        <button>First</button>
        <button>Last</button>
      </DialogShell>,
    ));

    const dialog = host.querySelector('[role="dialog"]');
    const [first, last] = dialog.querySelectorAll("button");
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(dialog.getAttribute("aria-label")).toBe("Test panel");
    expect(document.activeElement).toBe(dialog);

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true }));
    expect(document.activeElement).toBe(first);
    first.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", shiftKey: true, bubbles: true, cancelable: true }));
    expect(document.activeElement).toBe(last);
    last.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true }));
    expect(document.activeElement).toBe(first);

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
    expect(close).toHaveBeenCalledOnce();
    act(() => root.render(null));
    expect(document.activeElement).toBe(trigger);
  });
});
