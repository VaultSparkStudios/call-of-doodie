import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import OperationCompleteModal from "./OperationCompleteModal.jsx";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const receipt = {
  mission: "Flush the Blacksite",
  score: 128450,
  act: "ACT I",
  route: "SEWER SPINE",
  checkpoint: "PUMP CONTROL",
  stateFingerprint: "9A7F20C1",
};

describe("OperationCompleteModal", () => {
  let container;
  let root;

  async function render(props = {}) {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
      root.render(
        <OperationCompleteModal
          campaignGate={null}
          onContinue={vi.fn()}
          onRematch={vi.fn()}
          onReturnToMenu={vi.fn()}
          receipt={receipt}
          {...props}
        />,
      );
    });
  }

  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
  });

  it("renders the victory receipt and three 48px action targets", async () => {
    await render();

    expect(container.querySelector("[role=dialog]")).not.toBeNull();
    expect(container.textContent).toContain("MISSION VICTORY");
    expect(container.textContent).toContain("Flush the Blacksite");
    expect(container.textContent).toContain("128,450");
    expect(container.textContent).toContain("ACT I · SEWER SPINE");
    expect(container.textContent).toContain("PUMP CONTROL");
    expect(container.textContent).toContain("9A7F20C1");
    const buttons = [...container.querySelectorAll("button")];
    expect(buttons).toHaveLength(3);
    expect(buttons.map((button) => button.textContent)).toEqual([
      "CONTINUE",
      "REMATCH",
      "RETURN TO MENU · ESC",
    ]);
    for (const button of buttons) expect(button.style.minHeight).toBe("48px");
  });

  it("routes all actions and Escape without inventing campaign or co-op availability", async () => {
    const onContinue = vi.fn();
    const onRematch = vi.fn();
    const onReturnToMenu = vi.fn();
    await render({ onContinue, onRematch, onReturnToMenu });
    const buttons = [...container.querySelectorAll("button")];

    await act(async () => buttons[0].click());
    await act(async () => buttons[1].click());
    await act(async () => buttons[2].click());
    await act(async () => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", cancelable: true }));
    });

    expect(onContinue).toHaveBeenCalledOnce();
    expect(onRematch).toHaveBeenCalledOnce();
    expect(onReturnToMenu).toHaveBeenCalledTimes(2);
    expect(container.textContent).toContain(
      "Campaign progression is not live yet; this victory is a local operation checkpoint.",
    );
    expect(container.textContent).toContain(
      "Co-op is not connected; this result does not represent a shared squad save.",
    );
  });

  it("honors explicit gate copy and disables Continue when the caller closes the gate", async () => {
    const onContinue = vi.fn();
    await render({
      onContinue,
      campaignGate: {
        campaignMessage: "Act II is awaiting campaign save support.",
        coopMessage: "Squad routing is planned, not active.",
        continueAvailable: false,
      },
    });

    const continueButton = container.querySelector("button");
    expect(continueButton.disabled).toBe(true);
    await act(async () => continueButton.click());
    expect(onContinue).not.toHaveBeenCalled();
    expect(container.textContent).toContain("Act II is awaiting campaign save support.");
    expect(container.textContent).toContain("Squad routing is planned, not active.");
  });

  it("shows the exact versioned score evidence without upgrading its trust claim", async () => {
    await render({
      receipt: {
        ...receipt,
        scoreBreakdown: {
          schemaVersion: "operation-score-v2",
          objective: 9800,
          interaction: 315,
          tempo: 420,
          extraction: 500,
          pressurePenalty: 200,
          awarded: 10835,
        },
      },
    });

    expect(container.textContent).toContain("OPERATION SCORE BREAKDOWN");
    expect(container.textContent).toContain("OBJECTIVES+9,800");
    expect(container.textContent).toContain("REINFORCEMENT PRESSURE−200");
    expect(container.textContent).toContain("not server-authoritative");
  });

  it("keeps legacy receipts readable without fabricating a breakdown", async () => {
    await render();
    expect(container.textContent).not.toContain("OPERATION SCORE BREAKDOWN");
  });
});
