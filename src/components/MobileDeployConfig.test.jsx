import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import MobileDeployConfig from "./MobileDeployConfig.jsx";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const modes = [
  { id: "standard", label: "NORMAL", emoji: "N", color: "#FFD700" },
  { id: "zombies", label: "SEWER ZOMBIES", emoji: "Z", color: "#8DFF67" },
];
const difficulties = {
  normal: { label: "NORMAL", emoji: "N", color: "#FFD700" },
  hard: { label: "HARD", emoji: "H", color: "#FF6600" },
};

describe("MobileDeployConfig", () => {
  let root;
  let container;
  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
    vi.unstubAllGlobals();
  });

  it("exposes labelled radio groups, selected state, and direct choices", async () => {
    vi.stubGlobal("requestAnimationFrame", (callback) => { callback(); return 1; });
    const onSelectMode = vi.fn();
    const onSelectDifficulty = vi.fn();
    container = document.createElement("div");
    document.body.appendChild(container);
    await act(async () => {
      root = createRoot(container);
      root.render(
        <MobileDeployConfig
          modes={modes}
          modeId="standard"
          onSelectMode={onSelectMode}
          difficulties={difficulties}
          difficulty="normal"
          onSelectDifficulty={onSelectDifficulty}
        />,
      );
    });

    const groups = container.querySelectorAll('[role="radiogroup"]');
    expect(groups).toHaveLength(2);
    expect(container.querySelector('[data-mode-id="standard"]').getAttribute("aria-checked")).toBe("true");
    expect(container.querySelector('[data-mode-id="zombies"]').style.minHeight).toBe("44px");

    await act(async () => {
      container.querySelector('[data-mode-id="zombies"]').click();
      container.querySelector('[data-difficulty-id="hard"]').click();
      await new Promise((resolve) => setTimeout(resolve, 60));
    });
    expect(onSelectMode).toHaveBeenCalledWith("zombies");
    expect(onSelectDifficulty).toHaveBeenCalledWith("hard");
    expect(container.querySelector('[data-mode-id="zombies"]').getAttribute("aria-checked")).toBe("true");
    expect(container.textContent).toContain("Selected: SEWER ZOMBIES · HARD");

    const standard = container.querySelector('[data-mode-id="standard"]');
    await act(async () => {
      standard.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 60));
    });
    expect(onSelectMode).toHaveBeenLastCalledWith("zombies");
    expect(document.activeElement).toBe(container.querySelector('[data-mode-id="zombies"]'));
  });
});
