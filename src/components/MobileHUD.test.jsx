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

  it("shows heat badge when heat is in warm range", () => {
    const html = renderToStaticMarkup(<MobileHUD {...baseProps} heat={45} />);
    expect(html).toContain('data-testid="hud-heat-badge"');
    expect(html).toContain("🔥 45");
  });

  it("shows overdrive label when heat reaches overdrive threshold", () => {
    const html = renderToStaticMarkup(<MobileHUD {...baseProps} heat={72} />);
    expect(html).toContain('data-testid="hud-heat-badge"');
    expect(html).toContain("OVERDRIVE");
  });

  it("hides heat badge when heat is cold (≤5)", () => {
    const html = renderToStaticMarkup(<MobileHUD {...baseProps} heat={3} />);
    expect(html).not.toContain('data-testid="hud-heat-badge"');
  });

  it("hides heat badge when heat prop is omitted", () => {
    const html = renderToStaticMarkup(<MobileHUD {...baseProps} />);
    expect(html).not.toContain('data-testid="hud-heat-badge"');
  });
});
