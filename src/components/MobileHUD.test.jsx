import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import MobileHUD from "./MobileHUD.jsx";

const baseProps = {
  wave: 7,
  timeSurvived: 73,
  score: 4200,
  kills: 19,
  deaths: 0,
  health: 80,
  maxHealth: 100,
  level: 5,
  currentWeapon: 0,
  ammo: 8,
  isReloading: false,
  extraLives: 0,
  fmtTime: () => "1:13",
  onPause: () => {},
  bankedPerkChoices: 0,
  nextPerkLevel: 6,
};

describe("MobileHUD", () => {
  it("renders contract and readiness capabilities on the compact surface", () => {
    const html = renderToStaticMarkup(
      <MobileHUD
        {...baseProps}
        activeWaveContract={{ label: "NO-HIT CONTRACT", description: "Avoid damage" }}
        grenadeReady={false}
        dashReady
      />,
    );
    expect(html).toContain('data-hud-surface="compact"');
    expect(html).toContain('data-hud-capabilities="wave,time,score,health,weapon,ability-readiness"');
    expect(html).toContain("NO-HIT CONTRACT");
    expect(html).toContain('data-action-state="ready"');
    expect(html).toContain('data-action-state="cooldown"');
    expect(html).toContain("GRENADE · COOL");
  });
});
