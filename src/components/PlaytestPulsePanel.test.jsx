import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import PlaytestPulsePanel from "./PlaytestPulsePanel.jsx";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const palette = { ink: "#fff", muted: "#bbb", cyan: "#8fefff", line: "#555", panel: "#111", panelSoft: "#181818", panelStrong: "#050505" };
const pulse = {
  schemaVersion: "playtest-pulse-v1",
  sampleSize: 2,
  clarity: { clear: 1, partial: 1, unclear: 0 },
  replay: { now: 1, later: 0, no: 1 },
  inputTrust: { trusted: 1, mixed: 1, failed: 0 },
  threatReadability: { clear: 1, busy: 1, lost: 0 },
  flights: [{ signalComplete: true, flightId: "private-flight" }, { signalComplete: false, flightId: "private-flight-2" }],
};

describe("PlaytestPulsePanel", () => {
  let container;
  let root;
  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
    vi.unstubAllGlobals();
  });

  it("renders four explicit aggregate groups and exports aggregate-only JSON", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    container = document.createElement("div");
    document.body.appendChild(container);
    await act(async () => {
      root = createRoot(container);
      root.render(<PlaytestPulsePanel pulse={pulse} palette={palette} />);
    });

    expect(container.textContent).toContain("PLAYTEST COMMAND POST · 2 LOCAL RECEIPTS");
    expect(container.textContent).toContain("CONTROL TRUST");
    expect(container.textContent).toContain("DANGER READABILITY");
    const button = container.querySelector("button");
    await act(async () => { button.click(); });
    const exported = JSON.parse(writeText.mock.calls[0][0]);
    expect(exported).toMatchObject({ sampleSize: 2, signalCompleteCount: 1 });
    expect(exported).not.toHaveProperty("flights");
    expect(writeText.mock.calls[0][0]).not.toContain("private-flight");
  });

  it("stays absent until a local receipt exists", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    await act(async () => {
      root = createRoot(container);
      root.render(<PlaytestPulsePanel pulse={{ ...pulse, sampleSize: 0 }} palette={palette} />);
    });
    expect(container.querySelector("[data-testid='playtest-pulse-panel']")).toBeNull();
  });
});
