import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { MostWantedPanel } from "./MenuPanels.jsx";
import { saveCareerStats } from "../storage.js";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let container;
let root;

beforeEach(() => {
  localStorage.clear();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("MOST WANTED environmental case files", () => {
  it("renders event-specific metrics and countermeasures after the enemy roster", () => {
    saveCareerStats({
      hazardChronicle: {
        sewer_flood: { deaths: 2, encounters: 0 },
        extraction_lockdown: { deaths: 0, encounters: 3 },
      },
    });
    act(() => root.render(<MostWantedPanel onClose={() => {}} />));
    const section = container.querySelector('[data-testid="most-wanted-hazards"]');
    expect(section).not.toBeNull();
    expect(section.textContent).toContain("killed you 2×");
    expect(section.textContent).toContain("sealed the exit 3×");
    expect(section.textContent).toContain("Evacuate below alarm 100");
    expect(section.previousElementSibling?.textContent).toContain("The Developer");
  });

  it("keeps the hazards row absent before the player has evidence", () => {
    saveCareerStats({ hazardChronicle: {} });
    act(() => root.render(<MostWantedPanel onClose={() => {}} />));
    expect(container.querySelector('[data-testid="most-wanted-hazards"]')).toBeNull();
  });
});
