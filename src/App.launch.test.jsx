import * as React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const issueRunTokenMock = vi.fn(() => Promise.resolve("token-123"));

vi.mock("./drawGame.js", () => ({
  drawGame: vi.fn(),
}));

vi.mock("./hooks/useGameLoop.js", () => ({
  useGameLoop: vi.fn(),
}));

vi.mock("./sounds.js", () => ({
  soundShoot: vi.fn(),
  soundHitAt: vi.fn(),
  soundDeath: vi.fn(),
  soundLevelUp: vi.fn(),
  soundPickupAt: vi.fn(),
  soundEnemyDeathAt: vi.fn(),
  soundGrenadeAt: vi.fn(),
  soundBossWave: vi.fn(),
  soundAchievement: vi.fn(),
  soundReload: vi.fn(),
  soundDash: vi.fn(),
  soundBossKill: vi.fn(),
  soundWaveClear: vi.fn(),
  soundPerkSelect: vi.fn(),
  soundSummonDismissed: vi.fn(),
  soundGamepadConnect: vi.fn(),
  soundGamepadDisconnect: vi.fn(),
  startMusic: vi.fn(),
  stopMusic: vi.fn(),
  setMusicIntensity: vi.fn(),
  getMuted: vi.fn(() => false),
  setMuted: vi.fn(),
  setMusicVibe: vi.fn(),
  startAmbient: vi.fn(),
  stopAmbient: vi.fn(),
  setDangerIntensity: vi.fn(),
  stopDangerDrone: vi.fn(),
  setMusicTier: vi.fn(),
}));

vi.mock("./utils/analytics.js", () => ({
  analyticsInit: vi.fn(),
  track: vi.fn(),
  identify: vi.fn(),
  gameCtx: vi.fn(() => ({})),
  resolveMode: vi.fn(() => "standard"),
}));

vi.mock("./settings.js", async () => {
  const actual = await vi.importActual("./settings.js");
  return {
    ...actual,
    loadSettings: vi.fn(() => actual.SETTINGS_DEFAULTS),
  };
});

vi.mock("./storage.js", () => ({
  loadLeaderboard: vi.fn(() => Promise.resolve([])),
  saveToLeaderboard: vi.fn(),
  updateCareerStats: vi.fn(),
  loadCareerStats: vi.fn(() => ({
    totalKills: 0,
    bestScore: 0,
    bestWave: 0,
    totalRuns: 0,
    totalPlayTime: 0,
    achievementsEver: [],
  })),
  getDailyMissions: vi.fn(() => []),
  loadMissionProgress: vi.fn(() => ({})),
  saveMissionProgress: vi.fn(),
  loadMetaProgress: vi.fn(() => ({ prestige: 0, upgradeTiers: {}, playerSkin: "", careerPoints: 0 })),
  getLockedCallsign: vi.fn(() => null),
  lockCallsign: vi.fn(),
  clearLockedCallsign: vi.fn(),
  claimCallsign: vi.fn(),
  getAccountLevel: vi.fn(() => 1),
  markDailyChallengeSubmitted: vi.fn(),
  getPlayerGlobalRank: vi.fn(() => Promise.resolve(1)),
  saveRunToHistory: vi.fn(),
  loadMetaTree: vi.fn(() => new Set()),
  issueRunToken: issueRunTokenMock,
}));

vi.mock("./components/UsernameScreen.jsx", () => {
  return {
    default: function UsernameScreenMock({ setUsername, onContinue }) {
      React.useEffect(() => {
        setUsername("LaunchTester");
      }, [setUsername]);
      return <button onClick={onContinue}>continue</button>;
    },
  };
});

vi.mock("./components/MenuScreen.jsx", () => ({
  default: function MenuScreenMock({ onStart }) {
    return <button onClick={() => onStart()}>start</button>;
  },
}));

vi.mock("./components/DraftScreen.jsx", () => ({
  default: function DraftScreenMock({ onSelect }) {
    return <button onClick={() => onSelect(null)}>draft-skip</button>;
  },
}));

vi.mock("./components/DeathScreen.jsx", () => ({
  default: function DeathScreenMock() {
    return <div>death-screen</div>;
  },
}));

vi.mock("./components/PauseMenu.jsx", () => ({
  default: function PauseMenuMock() {
    return <div>pause-menu</div>;
  },
}));

vi.mock("./components/HUD.jsx", () => ({
  default: function HUDMock() {
    return <div>hud</div>;
  },
}));

vi.mock("./components/AchievementsPanel.jsx", () => ({
  default: function AchievementsPanelMock() {
    return <div>achievements-panel</div>;
  },
}));

vi.mock("./components/PerkModal.jsx", () => ({
  default: function PerkModalMock() {
    return <div>perk-modal</div>;
  },
}));

vi.mock("./utils/perkOptions.js", () => ({
  getRandomPerks: () => [],
  getFullyCursedPerks: () => [],
}));

vi.mock("./components/WaveShopModal.jsx", () => ({
  default: function WaveShopModalMock() {
    return <div>wave-shop</div>;
  },
}));

vi.mock("./components/RouteSelectModal.jsx", () => ({
  default: function RouteSelectModalMock() {
    return <div>route-select</div>;
  },
}));

vi.mock("./utils/routeOptions.js", () => ({
  getRouteOptions: () => [],
}));

vi.mock("./components/TutorialOverlay.jsx", () => ({
  default: function TutorialOverlayMock() {
    return <div>tutorial-overlay</div>;
  },
}));

let container;
let root;

async function flush() {
  await act(async () => {
    await Promise.resolve();
  });
}

afterEach(async () => {
  issueRunTokenMock.mockClear();
  if (root) {
    await act(async () => {
      root.unmount();
    });
  }
  root = null;
  if (container) {
    container.remove();
  }
  container = null;
});

describe("CallOfDoodie launch smoke", () => {
  it("can progress from username to menu to draft to game and request a run token", async () => {
    const { default: App } = await import("./App.jsx");

    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root.render(<App />);
    });
    await flush();

    await act(async () => {
      container.querySelector("button")?.click();
    });
    await flush();

    await act(async () => {
      container.querySelector("button")?.click();
    });
    await flush();

    await act(async () => {
      container.querySelector("button")?.click();
    });
    await flush();

    expect(container.querySelector("#game-canvas")).not.toBeNull();
    expect(issueRunTokenMock).toHaveBeenCalledTimes(1);
    expect(issueRunTokenMock).toHaveBeenCalledWith({
      mode: null,
      difficulty: "normal",
      seed: expect.any(Number),
    });
  });
});
