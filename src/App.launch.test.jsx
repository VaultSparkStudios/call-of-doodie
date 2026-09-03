import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const issueRunTokenMock = vi.fn(() => Promise.resolve("token-123"));

vi.mock("./drawGame.js", () => ({
  drawGame: vi.fn(),
}));

// S163: the combat chunk is a dynamic import; stub it so the smoke never waits on
// vite-node transforming the enemy/projectile systems.
vi.mock("./systems/combatRuntime.js", () => ({
  stepEnemyFrame: () => ({ ok: true }),
  stepProjectileFrame: () => ({ ok: true }),
  pickTarget: (_enemy, _gs, player) => player,
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
  soundOperationObjective: vi.fn(),
  soundOperationReinforcement: vi.fn(),
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
  getMusicBPM: vi.fn(() => 108),
  setBusVolume: vi.fn(),
  setMusicLowpass: vi.fn(),
  soundPlayerHurt: vi.fn(),
  soundEmptyMag: vi.fn(),
  soundWeaponSwap: vi.fn(),
  soundWaveAnnounce: vi.fn(),
  soundCoinAt: vi.fn(),
  soundShopPurchase: vi.fn(),
  soundBossPhase2: vi.fn(),
  soundLastStand: vi.fn(),
  soundHeartbeatPulse: vi.fn(),
  soundBossFinale: vi.fn(),
  soundPrecisionClick: vi.fn(),
  soundPrecisionLock: vi.fn(),
  soundChainEscalate: vi.fn(),
  soundBossGrudge: vi.fn(),
  soundComboTick: vi.fn(),
  soundComboBreak: vi.fn(),
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
  getMissionStreak: vi.fn(() => ({ streak: 0, lastCompleted: null })),
  advanceMissionStreak: vi.fn(),
  loadTopGhosts: vi.fn(() => Promise.resolve([])),
  loadWeeklyTopGhost: vi.fn(() => Promise.resolve(null)),
  saveStudioGameEvent: vi.fn(),
  recordDeathByEnemy: vi.fn(),
  loadRivalryHistory: vi.fn(() => []),
  getAdaptiveSpawnMods: vi.fn(() => ({})),
  getProximityRivals: vi.fn(() => []),
  getWeaponLegendRank: vi.fn(() => null),
  getWaveDeathCounts: vi.fn(() => ({})),
  getCommunityChokePoints: vi.fn(() => new Set()),
  trackRhythmMasteryHit: vi.fn(() => 1),
  getWeaponEvolutionState: vi.fn(() => ({ evolved: false, kills: 0, name: null, damageMult: 1 })),
  getBossKillRecord: vi.fn(() => ({ kills: 0, deaths: 0 })),
  saveBossKillRecord: vi.fn(),
  isNemesis: vi.fn(() => false),
  loadExperimentIntent: vi.fn(() => null),
  saveExperimentIntent: vi.fn(),
  clearExperimentIntent: vi.fn(),
  saveRunHistory: vi.fn(),
  loadRunHistory: vi.fn(() => []),
}));

vi.mock("./components/HomeV2.jsx", () => ({
  default: function HomeV2Mock({ onStart, onSetGauntletMode }) {
    return <>
      <button onClick={() => onStart()}>start</button>
      <button data-testid="gauntlet-start" onClick={() => { onSetGauntletMode(true); onStart(999, { gauntletWeek: -1 }); }}>gauntlet</button>
    </>;
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
  window.localStorage.clear();
  window.sessionStorage.clear();
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
  it("can progress directly from menu to draft to game and request a run token", async () => {
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
      starterLoadout: "standard",
    });
  }, 60000);

  it("turns a Gauntlet quick launch into the authoritative weekly contract and skips the draft", async () => {
    const { default: App } = await import("./App.jsx");
    const { track } = await import("./utils/analytics.js");
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => { root.render(<App />); });
    await flush();
    const gauntletButton = container.querySelector('[data-testid="gauntlet-start"]');
    expect(gauntletButton, container.textContent).not.toBeNull();
    await act(async () => { gauntletButton.click(); });
    await flush();
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 50)); });

    expect(container.querySelector("#game-canvas")).not.toBeNull();
    expect(container.textContent).not.toContain("draft-skip");
    expect(track).toHaveBeenCalledWith("gauntlet_contract_start", expect.objectContaining({
      schemaVersion: "weekly-gauntlet-launch-v1",
      noShop: true,
      noPerkChoice: true,
      seed: expect.any(Number),
      weaponIndex: expect.any(Number),
      startPerkId: expect.any(String),
    }));
  }, 60000);
});
