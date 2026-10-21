import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useGamepadNav } from "./useGamepadNav.js";

const input = vi.hoisted(() => ({ pad: null, controls: {} }));
vi.mock("../utils/gamepad.js", () => ({
  getPrimaryGamepad: () => input.pad,
  readGamepadControls: () => input.controls,
}));
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function Harness(props) {
  const index = useGamepadNav({ count: 20, ...props });
  return <output>{index}</output>;
}

describe("controller menu interruption", () => {
  let root, host, onConfirm, onBack;
  const tick = (ms = 50) => act(() => vi.advanceTimersByTime(ms));
  const render = (props = {}) => act(() => root.render(<Harness onConfirm={onConfirm} onBack={onBack} {...props} />));
  const index = () => Number(host.textContent);
  beforeEach(() => {
    vi.useFakeTimers();
    input.pad = { index: 0, id: "pad", mapping: "standard" };
    input.controls = {};
    onConfirm = vi.fn(); onBack = vi.fn();
    host = document.createElement("div"); document.body.appendChild(host);
    root = createRoot(host);
  });
  afterEach(() => { act(() => root.unmount()); host.remove(); vi.useRealTimers(); });

  it("cancels repeat when the controller disappears", () => {
    render(); tick(); input.controls = { menuDown: true }; tick();
    expect(index()).toBe(1);
    input.pad = null; tick(); tick(1000);
    expect(index()).toBe(1);
  });
  it.each(["confirm", "back"])("requires release before %s on activation and reconnect", button => {
    input.controls = { [button]: true }; render(); tick();
    expect(onConfirm).not.toHaveBeenCalled(); expect(onBack).not.toHaveBeenCalled();
    input.controls = {}; tick(); input.controls = { [button]: true }; tick(); tick();
    const callback = button === "confirm" ? onConfirm : onBack;
    expect(callback).toHaveBeenCalledTimes(1);
    input.pad = null; tick(); input.pad = { index: 0, id: "pad" }; tick();
    expect(callback).toHaveBeenCalledTimes(1);
    input.controls = {}; tick(); input.controls = { [button]: true }; tick();
    expect(callback).toHaveBeenCalledTimes(2);
  });
  it.each(["index", "id", "mapping"])("requires neutral after controller %s changes", field => {
    render(); tick(); input.controls = { menuDown: true }; tick();
    input.pad = { ...input.pad, [field]: field === "index" ? 1 : "changed" };
    tick(); tick(1000); expect(index()).toBe(1);
    input.controls = {}; tick(); input.controls = { menuDown: true }; tick();
    expect(index()).toBe(2);
  });
  it("does not move on a held direction when a menu is enabled", () => {
    input.controls = { menuDown: true }; render({ enabled: false }); tick();
    render(); tick(1000); expect(index()).toBe(0);
    input.controls = {}; tick(); input.controls = { menuDown: true }; tick();
    expect(index()).toBe(1); tick(400); expect(index()).toBe(2);
  });
  it("stops on disable and unmount, and clamps a shrinking list", () => {
    render(); tick(); input.controls = { menuDown: true }; tick(900);
    expect(index()).toBeGreaterThan(1);
    render({ count: 2 }); expect(index()).toBe(1);
    tick(1000); expect(index()).toBe(1);
    render({ enabled: false, count: 2 }); tick(1000); expect(index()).toBe(1);
    act(() => root.unmount()); root = createRoot(host);
    expect(vi.getTimerCount()).toBe(0);
  });
});
