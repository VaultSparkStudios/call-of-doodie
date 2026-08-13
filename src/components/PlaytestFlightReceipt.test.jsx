import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createPlaytestFlight, recordPlaytestMilestone } from "../utils/playtestFlightRecorder.js";
import PlaytestFlightReceipt from "./PlaytestFlightReceipt.jsx";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe("PlaytestFlightReceipt", () => {
  let container;
  let root;
  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
    sessionStorage.clear();
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it("captures four structured questions without a free-text path", async () => {
    let receipt = createPlaytestFlight({ now: 100 });
    receipt = recordPlaytestMilestone(receipt, "death", { now: 200 });
    sessionStorage.setItem("cod-playtest-flight-v1", JSON.stringify(receipt));
    container = document.createElement("div");
    document.body.appendChild(container);
    await act(async () => {
      root = createRoot(container);
      root.render(<PlaytestFlightReceipt enabled />);
    });

    expect(container.querySelectorAll("fieldset")).toHaveLength(4);
    expect(container.textContent).toContain("Did the controls obey you?");
    expect(container.textContent).toContain("Could you read the danger?");
    expect(container.querySelector("input,textarea")).toBeNull();
    const buttons = [...container.querySelectorAll("button")];
    await act(async () => { buttons.find((button) => button.textContent === "MOSTLY").click(); });
    await act(async () => { buttons.find((button) => button.textContent === "BUSY").click(); });
    const saved = JSON.parse(sessionStorage.getItem("cod-playtest-flight-v1"));
    expect(saved.annotations).toMatchObject({ inputTrust: "mixed", threatReadability: "busy" });
  });
});
