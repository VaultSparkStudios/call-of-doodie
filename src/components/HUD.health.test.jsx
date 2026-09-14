import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import HUD from "./HUD.jsx";
const props = { wave: 1, timeSurvived: 0, score: 0, kills: 0, deaths: 0, health: 140, maxHealth: 150, level: 1, currentWeapon: 0, ammo: 8, fmtTime: () => "0:00", difficulty: "normal", killFeed: [], activePerks: [], weaponUpgrades: [], missions: [], missionDoneSet: new Set() };
describe("HUD health capacity", () => {
  it.each([true, false])("uses the player's actual bonus capacity on compact HUD (mobile=%s)", (isMobile) => {
    const html = renderToStaticMarkup(<HUD {...props} isMobile={isMobile} />);
    expect(html).toContain("140/150");
    expect(html).not.toContain("140/100");
  });
  it("uses actual capacity on the expanded desktop HUD", () => {
    expect(renderToStaticMarkup(<HUD {...props} hud={{useCompactDesktop:false}} />)).toContain("140/150");
  });
  it("falls back to difficulty capacity for older callers", () => {
    expect(renderToStaticMarkup(<HUD {...props} health={80} maxHealth={undefined} />)).toContain("80/100");
  });
});
