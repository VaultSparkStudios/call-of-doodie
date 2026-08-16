import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { saveRunToHistory } from "../storage.js";
import OperationPlaytestCommandPost from "./OperationPlaytestCommandPost.jsx";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const operationReceipt = {
  operationId: "blacksite-flush",
  route: "service-tunnel",
  fingerprint: "9a7f20c1",
  durationSeconds: 720,
  runScore: 2400,
};

describe("OperationPlaytestCommandPost", () => {
  let container;
  let root;

  beforeEach(() => localStorage.clear());
  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
  });

  function render() {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => root.render(<OperationPlaytestCommandPost receipt={operationReceipt} />));
  }

  it("fails closed until an eligible Standard history run exists", () => {
    render();
    expect(container.textContent).toContain("Finish one eligible non-practice Standard run");
    expect(container.querySelector('input[value="SAVE OPT-IN PAIR"]').disabled).toBe(true);
  });

  it("binds the opt-in comparison to real Standard and Operation evidence", () => {
    saveRunToHistory({ mode: "standard", difficulty: "hard", wave: 8, time: 640, score: 1200, kills: 95, runSeed: 42 });
    render();
    expect(container.querySelector("select[aria-label='Verified Standard run']")).not.toBeNull();
    act(() => container.querySelector('input[value="SAVE OPT-IN PAIR"]').click());
    const [saved] = JSON.parse(localStorage.getItem("cod-operation-paired-playtests-v1"));
    expect(saved.schemaVersion).toBe("operation-paired-playtest-v2");
    expect(saved.responses.standard.evidenceRef).toMatch(/^standard:[A-F0-9]{8}$/);
    expect(saved.responses.operation.evidenceRef).toMatch(/^operation:[A-F0-9]{8}$/);
    expect(saved).not.toHaveProperty("testerId");
  });
});
