import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
// jsdom doesn't ship PointerEvent — alias MouseEvent so onPointerDown handlers fire
if (typeof PointerEvent === "undefined") globalThis.PointerEvent = MouseEvent;

import HUD from "./HUD.jsx";

const noop = () => {};
const baseHUDProps = {
  wave: 3, timeSurvived: 90, score: 1500, kills: 12, deaths: 0,
  health: 80, ammo: 15, isReloading: false,
  currentWeapon: 0, combo: 0, comboTimer: 0, killstreak: 0,
  level: 2, xp: 50, xpNeeded: 100,
  killFeed: [], username: "tester",
  grenadeReady: true, dashReady: true,
  extraLives: 0, guardianAngelFlash: false,
  bankedPerkChoices: 0, nextPerkLevel: 5,
  difficulty: "normal",
  isMobile: true,
  weaponUpgrades: {},
  activePerks: [],
  runModifier: null,
  weaponAmmos: [],
  weaponMods: {},
  weaponEvolutions: {},
  buildArchetype: null, unlockedArchetypes: [],
  onSwitchWeapon: noop, onReload: noop, onDash: noop, onGrenade: noop, onPause: noop,
  fmtTime: (s) => `${s}s`,
  overclockedActive: false, overclockedShots: 0,
  waveStreak: 0, mapTheme: null,
  vsScore: null, vsName: null,
  synergyChargeReady: false, onSynergyCharge: noop,
  cursedHideScore: false,
  speedrunMode: false, startTime: null,
  missions: [], missionDoneSet: new Set(),
  hud: null, heat: 0, topGhosts: [], weeklyRival: null,
  experimentMatched: null, careerBestWave: 0,
};

describe("MobileToolbar (isMobile HUD)", () => {
  let container, root;
  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
  });

  it("renders DASH, NADE, RELOAD buttons when isMobile=true", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    await act(async () => {
      root = createRoot(container);
      root.render(<HUD {...baseHUDProps} isMobile={true} />);
    });

    const text = container.textContent;
    expect(text).toContain("DASH");
    expect(text).toContain("NADE");
    expect(text).toContain("RELOAD");
  });

  it("does NOT render mobile toolbar when isMobile=false", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    await act(async () => {
      root = createRoot(container);
      root.render(<HUD {...baseHUDProps} isMobile={false} />);
    });

    // Desktop toolbar shows weapons (emoji + hotkeys), not the DASH/NADE/RELOAD labels
    const text = container.textContent;
    expect(text).not.toContain("DASH");
    expect(text).not.toContain("NADE");
  });

  it("dash button fires onDash callback on pointerdown", async () => {
    const onDash = vi.fn();
    container = document.createElement("div");
    document.body.appendChild(container);
    await act(async () => {
      root = createRoot(container);
      root.render(<HUD {...baseHUDProps} isMobile={true} onDash={onDash} dashReady={true} />);
    });

    const dashBtn = [...container.querySelectorAll("button")].find(b => /DASH/.test(b.textContent));
    expect(dashBtn).toBeTruthy();
    await act(async () => {
      dashBtn.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    });
    expect(onDash).toHaveBeenCalledTimes(1);
  });

  it("grenade button fires onGrenade callback on pointerdown", async () => {
    const onGrenade = vi.fn();
    container = document.createElement("div");
    document.body.appendChild(container);
    await act(async () => {
      root = createRoot(container);
      root.render(<HUD {...baseHUDProps} isMobile={true} onGrenade={onGrenade} grenadeReady={true} />);
    });

    const nadeBtn = [...container.querySelectorAll("button")].find(b => /NADE/.test(b.textContent));
    expect(nadeBtn).toBeTruthy();
    await act(async () => {
      nadeBtn.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    });
    expect(onGrenade).toHaveBeenCalledTimes(1);
  });

  it("reload button shows '...' when isReloading=true", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    await act(async () => {
      root = createRoot(container);
      root.render(<HUD {...baseHUDProps} isMobile={true} isReloading={true} />);
    });

    const text = container.textContent;
    expect(text).toContain("...");
  });

  it("weapon button cycles to next weapon on pointerdown", async () => {
    const onSwitchWeapon = vi.fn();
    container = document.createElement("div");
    document.body.appendChild(container);
    await act(async () => {
      root = createRoot(container);
      root.render(<HUD {...baseHUDProps} isMobile={true} currentWeapon={0} onSwitchWeapon={onSwitchWeapon} />);
    });

    const weaponBtn = [...container.querySelectorAll("button")].find(b => b.getAttribute("aria-label") === "Cycle weapon");
    expect(weaponBtn).toBeTruthy();
    await act(async () => {
      weaponBtn.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    });
    expect(onSwitchWeapon).toHaveBeenCalledWith(1);
  });
});
