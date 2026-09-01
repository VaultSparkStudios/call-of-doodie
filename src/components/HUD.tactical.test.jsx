import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import HUD from "./HUD.jsx";

const baseProps = {
  wave: 5, timeSurvived: 90, score: 3000, kills: 10, deaths: 0,
  health: 80, ammo: 8, isReloading: false, currentWeapon: 0,
  combo: 0, comboTimer: 0, killstreak: 0, level: 4, xp: 40, xpNeeded: 100,
  killFeed: [], username: "tester", extraLives: 0, guardianAngelFlash: false,
  bankedPerkChoices: 0, nextPerkLevel: 5, difficulty: "normal",
  isMobile: false, weaponUpgrades: {}, activePerks: [], weaponEvolutions: {},
  fmtTime: (t) => String(t),
  onPause: () => {},
  hud: { useCompactDesktop: false },
};

describe("HUD tactical desktop — ability cooldown parity", () => {
  it("renders grenade and dash cooldown chips with data-action-state", () => {
    const html = renderToStaticMarkup(
      <HUD {...baseProps} grenadeReady dashReady={false} />,
    );
    expect(html).toContain('data-action-state="ready"');
    expect(html).toContain('data-action-state="cooldown"');
    expect(html).toContain("GRENADE [Q] · READY");
    expect(html).toContain("DASH [⇧] · COOL");
  });

  it("shows both chips ready when both abilities are off cooldown", () => {
    const html = renderToStaticMarkup(
      <HUD {...baseProps} grenadeReady dashReady />,
    );
    const readyCount = (html.match(/data-action-state="ready"/g) || []).length;
    expect(readyCount).toBe(2);
    expect(html).toContain("GRENADE [Q] · READY");
    expect(html).toContain("DASH [⇧] · READY");
  });

  it("marks both chips cooling when both abilities are on cooldown", () => {
    const html = renderToStaticMarkup(
      <HUD {...baseProps} grenadeReady={false} dashReady={false} />,
    );
    const cooldownCount = (html.match(/data-action-state="cooldown"/g) || []).length;
    expect(cooldownCount).toBe(2);
  });
});
