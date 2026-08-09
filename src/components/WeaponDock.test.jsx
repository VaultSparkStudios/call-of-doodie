import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DesktopWeaponDock, MobileWeaponDock, PrimaryWeaponSelector } from "./WeaponDock.jsx";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const noop = () => {};
const sharedProps = {
  currentWeapon: 0,
  weaponUpgrades: Array(12).fill(0),
  weaponAmmos: Array(12).fill(10),
  weaponMods: {},
  ammo: 30,
  grenadeReady: true,
  dashReady: true,
  isReloading: false,
  onGrenade: noop,
  onDash: noop,
  onReload: noop,
};

describe("WeaponDock", () => {
  let container;
  let root;

  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
  });

  async function render(node) {
    container = document.createElement("div");
    document.body.appendChild(container);
    await act(async () => {
      root = createRoot(container);
      root.render(node);
    });
  }

  it("exposes all twelve weapons in the pre-run and desktop selectors", async () => {
    await render(<><PrimaryWeaponSelector selectedIndex={0} onSelect={noop} /><DesktopWeaponDock {...sharedProps} onSwitchWeapon={noop} /></>);
    expect(container.querySelector('[aria-label="Choose primary weapon"]').querySelectorAll("button")).toHaveLength(12);
    expect(container.querySelector('[aria-label="Weapons"]').querySelectorAll("button")).toHaveLength(12);
    expect(container.textContent).toContain("ACTIVE WEAPON");
  });

  it("opens the mobile arsenal and equips a weapon in one tap", async () => {
    const onSwitchWeapon = vi.fn();
    await render(<MobileWeaponDock {...sharedProps} onSwitchWeapon={onSwitchWeapon} />);
    const arsenalButton = container.querySelector('[aria-expanded="false"]');
    await act(async () => { arsenalButton.click(); });
    const selector = container.querySelector('[aria-label="Choose weapon"]');
    expect(selector.querySelectorAll("button")).toHaveLength(12);
    await act(async () => { selector.querySelectorAll("button")[4].click(); });
    expect(onSwitchWeapon).toHaveBeenCalledWith(4);
    expect(container.querySelector('[aria-label="Choose weapon"]')).toBeNull();
  });

  it("mobile dock defaults to standard size (no is-large class)", async () => {
    await render(<MobileWeaponDock {...sharedProps} onSwitchWeapon={noop} />);
    const dock = container.querySelector('[data-testid="mobile-weapon-dock"]');
    expect(dock.classList.contains("is-large")).toBe(false);
  });

  it("mobile dock applies is-large class when touchButtonSize is large", async () => {
    await render(<MobileWeaponDock {...sharedProps} onSwitchWeapon={noop} touchButtonSize="large" />);
    const dock = container.querySelector('[data-testid="mobile-weapon-dock"]');
    expect(dock.classList.contains("is-large")).toBe(true);
  });

  it("mobile dock does not apply is-large class for standard touchButtonSize", async () => {
    await render(<MobileWeaponDock {...sharedProps} onSwitchWeapon={noop} touchButtonSize="standard" />);
    const dock = container.querySelector('[data-testid="mobile-weapon-dock"]');
    expect(dock.classList.contains("is-large")).toBe(false);
  });
});
