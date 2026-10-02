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

  it("keeps twelve pre-run choices but collapses the combat dock until requested", async () => {
    const onSwitchWeapon = vi.fn();
    await render(<><PrimaryWeaponSelector selectedIndex={0} onSelect={noop} /><DesktopWeaponDock {...sharedProps} onSwitchWeapon={onSwitchWeapon} /></>);
    expect(container.querySelector('[aria-label="Choose primary weapon"]').querySelectorAll("button")).toHaveLength(12);
    expect(container.textContent).toContain("ACTIVE WEAPON");
    expect(document.querySelector('[aria-label="Weapons"]')).toBeNull();
    const toggle = container.querySelector('[aria-controls="desktop-weapon-selector"]');
    await act(async () => toggle.click());
    const selector = document.querySelector('[aria-label="Weapons"]');
    expect(selector.querySelectorAll('.weapon-dock__weapon')).toHaveLength(12);
    await act(async () => selector.querySelectorAll('.weapon-dock__weapon')[4].click());
    expect(onSwitchWeapon).toHaveBeenCalledWith(4);
    expect(document.querySelector('[aria-label="Weapons"]')).toBeNull();
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
});
