import { act } from "react";
import { createRoot } from "react-dom/client";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

import OperationCommandDeck from "./OperationCommandDeck.jsx";
import { OPERATIONS, ENCOUNTER_VERBS } from "../systems/operationCampaign.js";
import { recordOperationCompletion, createOperationCampaignProgress } from "../utils/operationCampaignProgress.js";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe("OperationCommandDeck", () => {
  let container;
  let root;

  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
  });

  async function render(onStart = vi.fn()) {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
      root.render(<OperationCommandDeck onStart={onStart} />);
    });
    return onStart;
  }

  it("presents three authored routes as the primary 7-encounter command deck", async () => {
    await render();

    expect(container.querySelector("[data-testid=operation-command-deck]")).not.toBeNull();
    expect(container.textContent).toContain("PRIMARY DEPLOYMENT PATH");
    expect(container.textContent).toContain("3 AUTHORED OPERATIONS · 7 ENCOUNTERS EACH · 12–18 MIN");
    expect(container.querySelectorAll("article")).toHaveLength(3);
    expect(container.querySelectorAll('input[type="radio"]')).toHaveLength(6);
    for (const operation of OPERATIONS) {
      expect(container.textContent).toContain(operation.title);
      if (operation.routeLabel) {
        expect(container.textContent).toContain(operation.routeLabel);
      } else {
        const routes = operation.acts.find((act) => act.routeFork).routeFork.routes;
        for (const route of routes) expect(container.textContent).toContain(route.label);
      }
      const duration = Array.isArray(operation.durationMinutes)
        ? `${operation.durationMinutes[0]}–${operation.durationMinutes[1]} MIN`
        : `${operation.durationMinutes} MIN`;
      expect(container.textContent).toContain(duration);
    }
    expect(container.textContent).toContain(
      OPERATIONS[0].scoring?.summary || "Score the route, objectives, and extraction",
    );
  });

  it("launches each semantic touch target with only its deterministic Operation contract", async () => {
    const onStart = await render();
    const buttons = [...container.querySelectorAll("button")];

    expect(buttons).toHaveLength(3);
    for (const button of buttons) {
      expect(button.type).toBe("button");
      expect(button.tabIndex).toBe(0);
      expect(button.style.minHeight).toBe("48px");
      expect(button.style.touchAction).toBe("manipulation");
      expect(button.getAttribute("aria-label")).toMatch(/^Start operation /);
    }

    await act(async () => buttons[1].click());
    expect(onStart).toHaveBeenCalledOnce();
    expect(onStart).toHaveBeenCalledWith(OPERATIONS[1].seed ?? expect.any(Number), {
      operationId: OPERATIONS[1].id,
      operationMode: true,
      operationRoute: OPERATIONS[1].routeOptions[0],
    });
  });

  it("renders an encounter spine with all 7 authored verb pills per operation", async () => {
    await render();

    for (const operation of OPERATIONS) {
      const spine = container.querySelector(`[data-testid="operation-encounter-spine-${operation.id}"]`);
      expect(spine).not.toBeNull();
      const pills = [...spine.querySelectorAll("span")];
      expect(pills).toHaveLength(7);
      for (const [i, pill] of pills.entries()) {
        expect(pill.textContent).toBe(ENCOUNTER_VERBS[i]);
        const title = operation.encounters[i]?.title;
        if (title) expect(pill.getAttribute("title")).toBe(title);
      }
    }
  });

  it("shows CLEARED + best score for completed operations and READY for fresh ones", async () => {
    const progress = recordOperationCompletion(
      recordOperationCompletion(createOperationCampaignProgress(), {
        operationId: "blacksite-flush", route: "service-tunnel", fingerprint: "AA001122", score: 1500,
      }),
      { operationId: "blacksite-flush", route: "executive-washroom", fingerprint: "BB334455", score: 4700 },
    );
    const storage = { getItem: (key) => key.includes("operation-campaign-progress") ? JSON.stringify(progress) : null };
    const storageDescriptor = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
    Object.defineProperty(globalThis, "localStorage", { value: storage, configurable: true });
    try {
      await render();
      const clearedStatus = container.querySelector('[data-testid="operation-status-blacksite-flush"]');
      expect(clearedStatus?.textContent).toBe("CLEARED");
      const bestScore = container.querySelector('[data-testid="operation-best-score-blacksite-flush"]');
      expect(bestScore).not.toBeNull();
      expect(bestScore.textContent).toContain("4,700");

      const readyStatus = container.querySelector('[data-testid="operation-status-porcelain-siege"]');
      expect(readyStatus?.textContent).toBe("READY");
      expect(container.querySelector('[data-testid="operation-best-score-porcelain-siege"]')).toBeNull();
    } finally {
      if (storageDescriptor) Object.defineProperty(globalThis, "localStorage", storageDescriptor);
      else delete globalThis.localStorage;
    }
  });

  it("is integrated above the explicitly preserved Arcade and Rivals front door", () => {
    const source = readFileSync(resolve(process.cwd(), "src/components/HomeV2.jsx"), "utf8");
    const operationIndex = source.indexOf("<OperationCommandDeck");
    const arcadeIndex = source.indexOf("ARCADE &amp; RIVALS");
    const legacyDeployIndex = source.indexOf('data-testid="front-door-deploy"');

    expect(source).toContain('import OperationCommandDeck from "./OperationCommandDeck.jsx";');
    expect(source).toContain("<OperationCommandDeck onStart={onStart} palette={themePalette} />");
    expect(operationIndex).toBeGreaterThan(0);
    expect(arcadeIndex).toBeGreaterThan(operationIndex);
    expect(legacyDeployIndex).toBeGreaterThan(arcadeIndex);
  });
});
