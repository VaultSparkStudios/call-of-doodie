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
    vi.spyOn(document, "hasFocus").mockReturnValue(true);
    input.pad = { index: 0, id: "pad", mapping: "standard" };
    input.controls = {};
    onConfirm = vi.fn(); onBack = vi.fn();
    host = document.createElement("div"); document.body.appendChild(host);
    root = createRoot(host);
  });
  afterEach(() => { act(() => root.unmount()); host.remove(); vi.restoreAllMocks(); vi.useRealTimers(); });

  it("stays suspended when enabled in an already unfocused window", () => {
    document.hasFocus.mockReturnValue(false);
    render(); tick(); input.controls = { confirm: true, menuDown: true }; tick(1000);
    expect(index()).toBe(0); expect(onConfirm).not.toHaveBeenCalled();
    act(() => window.dispatchEvent(new Event("focus"))); tick();
    expect(index()).toBe(0); expect(onConfirm).not.toHaveBeenCalled();
    input.controls = {}; tick(); input.controls = { confirm: true }; tick();
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("removes focus and visibility listeners when disabled", () => {
    const removeWindow = vi.spyOn(window, "removeEventListener");
    const removeDocument = vi.spyOn(document, "removeEventListener");
    render(); tick(); render({ enabled: false });
    expect(removeWindow).toHaveBeenCalledWith("blur", expect.any(Function));
    expect(removeWindow).toHaveBeenCalledWith("focus", expect.any(Function));
    expect(removeDocument).toHaveBeenCalledWith("visibilitychange", expect.any(Function));
    expect(vi.getTimerCount()).toBe(0);
  });

  it("cancels repeat immediately on blur and requires neutral after focus returns", () => {
    render(); tick(); input.controls = { menuDown: true }; tick();
    expect(index()).toBe(1);
    act(() => window.dispatchEvent(new Event("blur")));
    tick(1000); expect(index()).toBe(1);
    act(() => window.dispatchEvent(new Event("focus")));
    tick(1000); expect(index()).toBe(1);
    input.controls = {}; tick(); input.controls = { menuDown: true }; tick();
    expect(index()).toBe(2);
  });

  it.each(["confirm", "back"])("ignores %s while blurred and held on return", button => {
    render(); tick(); act(() => window.dispatchEvent(new Event("blur")));
    input.controls = { [button]: true }; tick();
    const callback = button === "confirm" ? onConfirm : onBack;
    expect(callback).not.toHaveBeenCalled();
    act(() => window.dispatchEvent(new Event("focus"))); tick();
    expect(callback).not.toHaveBeenCalled();
    input.controls = {}; tick(); input.controls = { [button]: true }; tick();
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("suspends hidden documents and preserves blur when visibility returns", () => {
    let hidden = false;
    const spy = vi.spyOn(document, "hidden", "get").mockImplementation(() => hidden);
    render(); tick(); input.controls = { menuDown: true }; tick();
    hidden = true; act(() => document.dispatchEvent(new Event("visibilitychange")));
    tick(1000); expect(index()).toBe(1);
    act(() => window.dispatchEvent(new Event("blur")));
    hidden = false; act(() => document.dispatchEvent(new Event("visibilitychange")));
    input.controls = {}; tick(); input.controls = { confirm: true }; tick();
    expect(onConfirm).not.toHaveBeenCalled();
    act(() => window.dispatchEvent(new Event("focus"))); tick();
    expect(onConfirm).not.toHaveBeenCalled();
    input.controls = {}; tick(); input.controls = { confirm: true }; tick();
    expect(onConfirm).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });

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
