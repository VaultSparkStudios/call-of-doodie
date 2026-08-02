import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import InputDebugOverlay from "./InputDebugOverlay.jsx";
import { buildInputDebugRows, formatDebugNumber } from "./inputDebugRows.js";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe("InputDebugOverlay", () => {
  let container;
  let root;

  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
  });

  it("normalizes finite diagnostics without inventing unavailable values", () => {
    expect(formatDebugNumber(Number.NaN)).toBe("--");
    expect(formatDebugNumber(Math.PI)).toBe("3.14");
    const rows = Object.fromEntries(buildInputDebugRows({
      source: "gamepad",
      movementSources: ["keyboard", "gamepad"],
      movementContention: true,
      connected: true,
      controllerType: "xbox",
      controllerIndex: 0,
      lastReleaseReason: "visibility-hidden",
      lastReleaseAgeMs: 12.4,
    }));
    expect(rows.MOVE).toBe("keyboard+gamepad !CONFLICT");
    expect(rows.PAD).toBe("xbox #0");
    expect(rows.RELEASE).toBe("visibility-hidden · 12 ms");
    expect(rows.AIM).toBe("-- rad");
  });

  it("renders every bounded diagnostic row", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    await act(async () => {
      root = createRoot(container);
      root.render(<InputDebugOverlay data={{ source: "mouse", shoot: true, traceEvents: 3 }} />);
    });
    expect(container.querySelector('[data-testid="input-debug-hud"]')).not.toBeNull();
    expect(container.textContent).toContain("INPUT DIAGNOSTICS");
    expect(container.textContent).toContain("shoot:1");
    expect(container.textContent).toContain("3 events");
    expect(container.querySelectorAll('[data-testid="input-debug-hud"] > div')).toHaveLength(15);
  });
});
