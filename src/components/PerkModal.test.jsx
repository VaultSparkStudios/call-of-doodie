import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import PerkModal from "./PerkModal.jsx";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe("PerkModal doctrine preview", () => {
  let container;
  let root;

  async function render(props = {}) {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
      root.render(
        <PerkModal
          level={7}
          onSelect={vi.fn()}
          options={[
            { id: "bloodlust", name: "Bloodlust", emoji: "🩸", tier: "rare", desc: "Heal on kills." },
            { id: "parkour_pro", name: "Parkour Pro", emoji: "🏃", tier: "uncommon", desc: "Move faster." },
          ]}
          activePerks={[{ id: "iron_gut" }, { id: "vampire" }]}
          buildArchetype={null}
          {...props}
        />,
      );
    });
  }

  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
  });

  it("shows the authored capstone before selection", async () => {
    await render();
    const delta = container.querySelector("[data-testid='doctrine-delta-bloodlust']");
    expect(delta.textContent).toContain("PICK → FRONTLINE DOCTRINE");
    expect(delta.getAttribute("aria-label")).toContain("selecting this perk reaches Frontline Doctrine");
  });

  it("shows bounded progress without inventing a milestone", async () => {
    await render({
      activePerks: [{ id: "iron_gut" }, { id: "vampire" }, { id: "bloodlust" }],
      options: [{ id: "parkour_pro", name: "Parkour Pro", emoji: "🏃", tier: "uncommon", desc: "Move faster." }],
    });
    const delta = container.querySelector("[data-testid='doctrine-delta-parkour_pro']");
    expect(delta.textContent).toContain("VANGUARD 4/5");
    expect(delta.textContent).toContain("WALL OF FLESH");
  });

  it("can render the exact pre-change baseline for the visual comparison harness", async () => {
    await render({ previewDoctrineDeltas: false });
    expect(container.querySelectorAll("[data-testid^='doctrine-delta-']")).toHaveLength(0);
  });
});
