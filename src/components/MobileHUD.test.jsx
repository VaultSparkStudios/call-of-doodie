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
  it("shows heat chip in overdrive when heat >= 70", () => {
    const html = renderToStaticMarkup(<MobileHUD {...baseProps} heat={73} showHeatMeter />);
    expect(html).toContain('data-testid="hud-heat-chip"');
    expect(html).toContain("73");
    expect(html).toContain("OD");
  });

  it("shows warm heat chip without OD label when heat is 40–69", () => {
    const html = renderToStaticMarkup(<MobileHUD {...baseProps} heat={45} showHeatMeter />);
    expect(html).toContain('data-testid="hud-heat-chip"');
    expect(html).toContain("45");
    expect(html).not.toContain("OD");
  });

  it("omits heat chip when heat is at or below threshold", () => {
    const html = renderToStaticMarkup(<MobileHUD {...baseProps} heat={5} showHeatMeter />);
    expect(html).not.toContain('data-testid="hud-heat-chip"');
  });

  it("omits heat chip when showHeatMeter is false regardless of heat level", () => {
    const html = renderToStaticMarkup(<MobileHUD {...baseProps} heat={80} showHeatMeter={false} />);
    expect(html).not.toContain('data-testid="hud-heat-chip"');
  });

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
