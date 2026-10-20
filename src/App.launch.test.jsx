import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const issueRunTokenMock = vi.fn(() => Promise.resolve("token-123"));
const barrierFixture = vi.hoisted(() => ({ refs: null, input: null }));
const launchFixture = vi.hoisted(() => ({ start: null, gauntlet: null, prepare: null }));
vi.mock("./systems/runLaunch.js", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, prepareRunDependencies: (...args) => launchFixture.prepare
    ? launchFixture.prepare(() => actual.prepareRunDependencies(...args))
    : actual.prepareRunDependencies(...args) };
});
vi.mock("./systems/inputBridge.js", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, releaseAllInputs: (refs, ...args) => {
    barrierFixture.input = refs;
    return actual.releaseAllInputs(refs, ...args);
  } };
});
vi.mock("./systems/gameplayBarrier.js", async (importOriginal) => {
  const actual = await importOriginal();
  return { createGameplayBarrier: (refs) => {
    barrierFixture.refs = refs;
    return actual.createGameplayBarrier(refs);
  } };
});

vi.mock("./components/WeaponDock.jsx", () => {
  function Dock({ onReload, onDash, onGrenade, onSwitchWeapon }) {
    return <div>
      <button data-testid="combat-reload" onClick={onReload}>reload</button>
      <button data-testid="combat-dash" onClick={onDash}>dash</button>
      <button data-testid="combat-grenade" onClick={onGrenade}>grenade</button>
      <button data-testid="combat-swap" onClick={() => onSwitchWeapon(1)}>swap</button>
      <button data-testid="combat-burst" onClick={() => onSwitchWeapon(7)}>burst</button>
      <button data-testid="combat-minigun" onClick={() => onSwitchWeapon(2)}>minigun</button>
      <button data-testid="combat-rail" onClick={() => onSwitchWeapon(9)}>rail</button>
    </div>;
  }
  return { DesktopWeaponDock: Dock, MobileWeaponDock: Dock };
});

vi.mock("./drawGame.js", () => ({
  drawGame: vi.fn(),
}));

// S163: the combat chunk is a dynamic import; stub it so the smoke never waits on
// vite-node transforming the enemy/projectile systems.
vi.mock("./systems/combatRuntime.js", async () => {
  const actual = await vi.importActual("./systems/combatRuntime.js");
  return { ...actual, stepEnemyFrame: () => ({ ok: true }), stepProjectileFrame: () => ({ ok: true }), pickTarget: (_enemy, _gs, player) => player };
});

vi.mock("./hooks/useGameLoop.js", () => ({
  useGameLoop: vi.fn(),
}));

vi.mock("./audio/soundFacade.js", () => ({
  loadSounds: () => Promise.resolve({}),
  soundsReady: () => true,
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
  setMusicMode: vi.fn(),
  setMusicObjective: vi.fn(),
  setMusicPaused: vi.fn(),
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
  recordHazardEvent: vi.fn(),
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
  default: function HomeV2Mock({ onStart, onSetGauntletMode, setStarterLoadout }) {
    launchFixture.start = onStart;
    launchFixture.gauntlet = onSetGauntletMode;
    return <>
      <button onClick={() => onStart()}>start</button>
      <button data-testid="gauntlet-start" onClick={() => { onSetGauntletMode(true); onStart(999, { gauntletWeek: -1 }); }}>gauntlet</button>
      <button data-testid="select-cannon" onClick={() => setStarterLoadout('cannon')}>cannon</button>
    </>;
  },
}));

vi.mock("./components/DraftScreen.jsx", () => ({
  default: function DraftScreenMock({ onSelect }) {
    return <button onClick={() => onSelect(null)}>draft-skip</button>;
  },
}));

vi.mock("./components/DeathScreen.jsx", () => ({
  default: function DeathScreenMock({ onStartGame, onMenu, score, wave, timeSurvived }) {
    return <><button data-testid="retry-run" data-score={score} data-wave={wave} data-time={timeSurvived} onClick={() => onStartGame()}>death-screen</button><button data-testid="death-menu" onClick={() => onMenu()}>menu</button></>;
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
  // S163: run start awaits dynamic chunks (combat systems, sounds); give the
  // module runner a few macrotasks instead of a single microtask.
  await act(async () => {
    for (let i = 0; i < 4; i += 1) await new Promise((resolve) => setTimeout(resolve, 15));
  });
}

// S163: warm the dynamic chunks once so run start resolves inside a flush.
beforeAll(async () => {
  await import("./systems/combatRuntime.js");
  const facade = await import("./audio/soundFacade.js");
  await facade.loadSounds?.()?.catch?.(() => {});
});

afterEach(async () => {
  issueRunTokenMock.mockReset().mockResolvedValue("token-123");
  launchFixture.prepare = null;
  vi.restoreAllMocks();
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
  async function mountRun() {
    const { default: App } = await import("./App.jsx");
    container = document.createElement("div"); document.body.appendChild(container); root = createRoot(container);
    await act(async () => { root.render(<App />); }); await flush();
    await act(async () => { container.querySelector("button").click(); }); await flush();
  }
  function appHooks() {
    const canvas = container.querySelector("#game-canvas");
    let fiber = canvas[Object.keys(canvas).find(k => k.startsWith("__reactFiber"))];
    while (fiber) {
      const hooks = []; let h = fiber.memoizedState;
      while (h) { hooks.push(h.memoizedState); h = h.next; }
      if (hooks.some(h => h?.current?.player && Array.isArray(h.current.enemies))) return hooks;
      fiber = fiber.return;
    }
    throw new Error("App hooks missing");
  }
  it("keeps pause and reload stable through keyboard autorepeat while retaining held movement and interaction", async () => {
    await mountRun();
    const game = barrierFixture.input.gsRef.current;
    const key = async (value, repeat = false, target = window, type = "keydown") => {
      const event = new KeyboardEvent(type, { key: value, repeat, bubbles: true, cancelable: true });
      await act(async () => { target.dispatchEvent(event); });
      return event;
    };
    await key("Escape");
    expect(barrierFixture.refs.paused.current).toBe(true);
    expect((await key("Escape", true)).defaultPrevented).toBe(true);
    expect(barrierFixture.refs.paused.current).toBe(true);
    const input = document.createElement("input"); container.appendChild(input);
    input.focus();
    await key("Escape", true, input);
    expect(barrierFixture.refs.paused.current).toBe(true);
    await key("Escape", false, input);
    expect(barrierFixture.refs.paused.current).toBe(false);
    input.remove();
    await key("w"); await key("e");
    await key("w", true); await key("e", true);
    expect(barrierFixture.input.keysRef.current.w).toBe(true);
    expect(game._interactHeld).toBe(true);
    await key("w", false, window, "keyup"); await key("e", false, window, "keyup");
    expect(barrierFixture.input.keysRef.current.w).toBe(false);
    expect(game._interactHeld).toBe(false);
    await key("1");
    game.ammoCount = 0;
    await key("r");
    const pending = game.pendingReload;
    expect(pending).toBeTruthy();
    await key("1", true);
    expect(game.pendingReload).toBe(pending);
    const { setMuted } = await import("./audio/soundFacade.js");
    setMuted.mockClear();
    await key("m");
    expect(setMuted).toHaveBeenCalledTimes(1);
    await key("m", true);
    expect(setMuted).toHaveBeenCalledTimes(1);
  }, 60000);
  it.each(["resolve", "reject"])("ignores an older ticket %s after the replacement ticket arrives", async (outcome) => {
    let resolveOld, rejectOld;
    issueRunTokenMock.mockImplementationOnce(() => new Promise((resolve, reject) => { resolveOld = resolve; rejectOld = reject; }))
      .mockResolvedValueOnce({ token: "example-current-ticket", summarySig: "current-signature" });
    await mountRun();
    await act(async () => { await launchFixture.start(222); }); await flush();
    const refs = appHooks();
    const token = refs.find(h => h?.current === "example-current-ticket"), signature = refs.find(h => h?.current === "current-signature");
    expect(token).toBeDefined(); expect(signature).toBeDefined();
    await act(async () => { if (outcome === "resolve") resolveOld({ token: "old-ticket", summarySig: "old-signature" }); else rejectOld(new Error("old offline request")); });
    expect(token.current).toBe("example-current-ticket"); expect(signature.current).toBe("current-signature");
  }, 60000);
  it("rejects superseded dependency preparation before initializing a run", async () => {
    await mountRun();
    let release;
    launchFixture.prepare = actual => new Promise(resolve => { release = async () => resolve(await actual()); });
    let oldStart;
    await act(async () => { oldStart = launchFixture.start(111); });
    launchFixture.prepare = null;
    await act(async () => { await launchFixture.start(222); }); await flush();
    const game = appHooks().find(h => h?.current?.player && h.current.enemies).current;
    const tickets = issueRunTokenMock.mock.calls.length;
    await act(async () => { await release(); await oldStart; }); await flush();
    expect(appHooks().find(h => h?.current?.player && h.current.enemies).current).toBe(game);
    expect(issueRunTokenMock).toHaveBeenCalledTimes(tickets);
  }, 60000);
  it("keeps delayed ticket delivery for the same ended run and ignores delivery after unmount", async () => {
    let resolveTicket;
    issueRunTokenMock.mockImplementationOnce(() => new Promise(resolve => { resolveTicket = resolve; }));
    await mountRun();
    const hooks = appHooks(), game = hooks.find(h => h?.current?.player && h.current.enemies).current;
    game.runPhase = "ended";
    await act(async () => { resolveTicket({ token: "example-ended-ticket", summarySig: "ended-signature" }); });
    expect(hooks.some(h => h?.current === "example-ended-ticket")).toBe(true);
    issueRunTokenMock.mockImplementationOnce(() => new Promise(resolve => { resolveTicket = resolve; }));
    await act(async () => { await launchFixture.start(333); }); await flush();
    const refs = appHooks().filter(h => h && Object.hasOwn(h, "current"));
    await act(async () => { root.unmount(); }); root = null;
    const snapshot = refs.map(h => h.current);
    await act(async () => { resolveTicket({ token: "example-unmounted-ticket", summarySig: "unmounted-signature" }); });
    expect(refs.map(h => h.current)).toEqual(snapshot);
  }, 60000);
  it("cancels pending rematch preparation when the player returns to the menu", async () => {
    await mountRun();
    const { useGameLoop } = await import("./hooks/useGameLoop.js");
    vi.spyOn(console, "error").mockImplementation(() => {});
    await act(async () => { useGameLoop.mock.calls.at(-1)[3].onError(new Error("menu cancellation fixture")); }); await flush();
    let release, pending;
    launchFixture.prepare = actual => new Promise(resolve => { release = async () => resolve(await actual()); });
    await act(async () => { pending = launchFixture.start(555); });
    await act(async () => { container.querySelector('[data-testid="death-menu"]').click(); }); await flush();
    const tickets = issueRunTokenMock.mock.calls.length;
    await act(async () => { await release(); await pending; }); await flush();
    expect(container.querySelector("#game-canvas")).toBeNull();
    expect(container.textContent).toContain("start");
    expect(issueRunTokenMock).toHaveBeenCalledTimes(tickets);
  }, 60000);
  it("binds delayed draft and audio work to its live owning run", async () => {
    const delayed = [], originalTimeout = globalThis.setTimeout;
    const spy = vi.spyOn(globalThis, "setTimeout").mockImplementation((callback, delay, ...args) => {
      if (delay === 80 || delay === 200) { delayed.push({ callback, delay }); return originalTimeout(() => {}, 0); }
      return originalTimeout(callback, delay, ...args);
    });
    const { startMusic, startAmbient } = await import("./audio/soundFacade.js");
    try {
      await mountRun();
      await act(async () => { launchFixture.gauntlet(true); await launchFixture.start(999, { gauntletWeek: -1 }); }); await flush();
      const oldDraft = delayed.findLast(t => t.delay === 80), oldAudio = delayed.findLast(t => t.delay === 200);
      expect(oldDraft).toBeDefined(); expect(oldAudio).toBeDefined();
      await act(async () => { await launchFixture.start(444); }); await flush();
      const hooks = appHooks(), game = hooks.find(h => h?.current?.player && h.current.enemies).current;
      const before = JSON.stringify({ game, mods: barrierFixture.input });
      startMusic.mockClear(); startAmbient.mockClear();
      await act(async () => { oldDraft.callback(); oldAudio.callback(); });
      expect(JSON.stringify({ game, mods: barrierFixture.input })).toBe(before);
      expect(startMusic).not.toHaveBeenCalled(); expect(startAmbient).not.toHaveBeenCalled();
      const currentDraft = delayed.findLast(t => t.delay === 80), currentAudio = delayed.findLast(t => t.delay === 200);
      const { track } = await import("./utils/analytics.js"); track.mockClear();
      await act(async () => { currentDraft.callback(); currentAudio.callback(); });
      expect(startMusic).toHaveBeenCalledTimes(1); expect(startAmbient).toHaveBeenCalledTimes(1);
      expect(track).toHaveBeenCalledWith("perk_chosen", expect.any(Object));
      startMusic.mockClear(); startAmbient.mockClear(); game.runPhase = "ended";
      await act(async () => { currentDraft.callback(); currentAudio.callback(); });
      expect(startMusic).not.toHaveBeenCalled(); expect(startAmbient).not.toHaveBeenCalled();
      game.runPhase = "playing"; track.mockClear();
      await act(async () => { root.unmount(); }); root = null;
      const ended = JSON.stringify(game);
      await act(async () => { currentDraft.callback(); currentAudio.callback(); });
      expect(JSON.stringify(game)).toBe(ended);
      expect(track).not.toHaveBeenCalledWith("perk_chosen", expect.any(Object));
      expect(startMusic).not.toHaveBeenCalled(); expect(startAmbient).not.toHaveBeenCalled();
    } finally { spy.mockRestore(); }
  }, 60000);
  it("preserves earned speed and applies Kill Frenzy on exactly its active movement frames", async () => {
    const { default: App } = await import("./App.jsx");
    const { useGameLoop } = await import("./hooks/useGameLoop.js");
    container = document.createElement("div"); document.body.appendChild(container); root = createRoot(container);
    await act(async () => { root.render(<App />); }); await flush();
    await act(async () => { container.querySelector("button").click(); }); await flush();
    const canvas = container.querySelector("#game-canvas");
    let fiber = canvas[Object.keys(canvas).find(key => key.startsWith("__reactFiber"))];
    let gs;
    while (fiber && !gs) { let h = fiber.memoizedState; while (h) { const value = h.memoizedState?.current; if (value && Object.hasOwn(value, "player") && value.player && value.enemies) gs = value; h = h.next; } fiber = fiber.return; }
    const context = vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({});
    const tick = () => useGameLoop.mock.calls.at(-1)[0]({ render: false });
    for (const ref of Object.values(barrierFixture.refs)) ref.current = false;
    gs.spawnTimer = 1e9; gs.maxEnemiesThisWave = 1e9; gs.enemies = []; gs.obstacles = []; gs.hazards = [];
    gs.player.health = 1e9; gs.player.maxHealth = 1e9; gs.settHighlightCapture = false;
    gs._killFrenzyUnlocked = true; gs._killFrenzyTimer = 90; gs.player.speed = 5;
    barrierFixture.input.keysRef.current = { d: true };
    try {
      for (const ref of Object.values(barrierFixture.refs)) {
        ref.current = true;
        await act(async () => { tick(); });
        expect(gs._killFrenzyTimer).toBe(90); expect(gs.player.speed).toBe(5);
        ref.current = false;
      }
      await act(async () => {
        for (let i = 0; i < 90; i++) {
          if (i === 30) gs.player.speed *= 1.1; // shop/perk multiplicative gain
          if (i === 60) gs.player.speed += 0.12; // level gain during active Frenzy
          gs.player.x = 100; gs.player.y = 200;
          const base = gs.player.speed;
          tick();
          expect(gs.player.x - 100).toBeCloseTo(base * 1.2);
          expect(gs.player.speed).toBe(base);
          expect(gs._killFrenzyTimer).toBe(89 - i);
        }
        gs.player.x = 100; tick();
      });
      expect(gs.player.speed).toBeCloseTo(5.62);
      expect(gs.player.x - 100).toBeCloseTo(5.62);
      gs._killFrenzyTimer = 90;
      await act(async () => { gs.player.x = 100; tick(); });
      expect(gs.player.x - 100).toBeCloseTo(5.62 * 1.2);
    } finally { context.mockRestore(); }
  }, 60000);
  it("uses active steps for firing and terminal time across wall jumps, barriers and rematches", async () => {
    const { default: App } = await import("./App.jsx");
    const { useGameLoop } = await import("./hooks/useGameLoop.js");
    container = document.createElement("div"); document.body.appendChild(container); root = createRoot(container);
    await act(async () => { root.render(<App />); }); await flush();
    await act(async () => { container.querySelector("button").click(); }); await flush();
    const canvas = container.querySelector("#game-canvas");
    let fiber = canvas[Object.keys(canvas).find(key => key.startsWith("__reactFiber"))];
    const refs = [];
    while (fiber) { let h = fiber.memoizedState; while (h) { if (h.memoizedState && Object.hasOwn(h.memoizedState, "current")) refs.push(h.memoizedState); h = h.next; } fiber = fiber.return; }
    const gs = refs.find(r => r.current?.player && r.current?.enemies).current;
    const context = vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({});
    const clock = vi.spyOn(Date, "now").mockReturnValue(100000);
    const tick = () => useGameLoop.mock.calls.at(-1)[0]({ render: false });
    for (const ref of Object.values(barrierFixture.refs)) ref.current = false;
    gs.spawnTimer = 1e9; gs.maxEnemiesThisWave = 1e9; gs.enemies = []; gs.obstacles = []; gs.hazards = [];
    gs.player.health = 1e9; gs.player.maxHealth = 1e9; gs.settHighlightCapture = false;
    try {
      await act(async () => { container.querySelector('[data-testid="combat-minigun"]').click(); });
      gs.ammoCount = 1000; barrierFixture.input.mouseRef.current.down = true;
      await act(async () => { for (let i = 0; i < 61; i++) tick(); });
      expect(gs.ammoCount).toBe(979); expect(gs.activeRunFrames).toBe(61);
      for (const [name, ref] of Object.entries(barrierFixture.refs)) {
        ref.current = true; clock.mockReturnValue(Date.now() + 60000);
        await act(async () => { tick(); });
        expect(gs.ammoCount, name).toBe(979); expect(gs.activeRunFrames, name).toBe(61);
        ref.current = false;
      }
      await act(async () => { tick(); });
      expect(gs.ammoCount).toBe(979); // Wall time did not mature the cooldown.
      barrierFixture.input.mouseRef.current.down = false;
      await act(async () => { for (let i = 62; i < 120; i++) tick(); });
      expect(gs.activeRunFrames).toBe(120);
      const report = vi.spyOn(console, "error").mockImplementation(() => {});
      try { await act(async () => { useGameLoop.mock.calls.at(-1)[3].onError(new Error("clock terminal fixture")); }); }
      finally { report.mockRestore(); }
      await flush();
      expect(container.querySelector('[data-testid="retry-run"]').dataset.time).toBe("2");
      await act(async () => { container.querySelector('[data-testid="retry-run"]').click(); }); await flush();
      const next = refs.find(r => r.current?.player && r.current?.enemies).current;
      expect(next).not.toBe(gs); expect(next.activeRunFrames).toBe(0);
      next.settHighlightCapture = false;
      barrierFixture.input.mouseRef.current.down = true;
      const before = next.ammoCount;
      await act(async () => { tick(); });
      expect(next.ammoCount).toBe(before - 1);
    } finally { clock.mockRestore(); context.mockRestore(); }
  }, 60000);
  it.each([1, 8])("preserves burst continuations and snapshots rail builds with deterministic seed %i", async (seed) => {
    const { default: App } = await import("./App.jsx");
    const { useGameLoop } = await import("./hooks/useGameLoop.js");
    container = document.createElement("div"); document.body.appendChild(container); root = createRoot(container);
    await act(async () => { root.render(<App />); }); await flush();
    await act(async () => { await launchFixture.start(seed); }); await flush();
    const canvas = container.querySelector("#game-canvas");
    let fiber = canvas[Object.keys(canvas).find(key => key.startsWith("__reactFiber"))];
    const refs = [];
    while (fiber) {
      let hook = fiber.memoizedState;
      while (hook) { if (hook.memoizedState && Object.hasOwn(hook.memoizedState, "current")) refs.push(hook.memoizedState); hook = hook.next; }
      fiber = fiber.return;
    }
    const gs = refs.find(ref => ref.current?.player && ref.current?.enemies).current;
    const evolutions = refs.find(ref => Array.isArray(ref.current) && ref.current.length === 12 && ref.current[9]?.damageMult);
    const context = vi.spyOn(canvas, "getContext").mockReturnValue({});
    const clock = vi.spyOn(Date, "now").mockReturnValue(Date.now() + 10000);
    const tick = () => act(async () => { useGameLoop.mock.calls.at(-1)[0]({ render: false }); });
    for (const ref of Object.values(barrierFixture.refs)) ref.current = false;
    gs.spawnTimer = 1e9; gs.maxEnemiesThisWave = 1e9; gs.enemies = []; gs.obstacles = []; gs.hazards = [];
    gs.player.health = 1e9; gs.player.maxHealth = 1e9; gs.settHighlightCapture = false;
    try {
      await act(async () => { container.querySelector('[data-testid="combat-burst"]').click(); });
      barrierFixture.input.mouseRef.current.down = true;
      const ammoBefore = gs.ammoCount;
      await tick();
      barrierFixture.input.mouseRef.current.down = false;
      expect(gs.ammoCount).toBe(ammoBefore - 1);
      expect(gs.bullets).toHaveLength(1);
      expect(gs.pendingBurstShots.map(shot => shot.remainingFrames)).toEqual([6, 11]);
      for (const [name, ref] of Object.entries(barrierFixture.refs)) {
        ref.current = true;
        clock.mockReturnValue(Date.now() + 10000);
        await tick();
        expect(gs.pendingBurstShots.map(shot => shot.remainingFrames), name).toEqual([6, 11]);
        expect(gs.bullets, name).toHaveLength(1);
        ref.current = false;
      }
      for (let frame = 1; frame <= 11; frame++) {
        await tick();
        expect(gs.bullets).toHaveLength(frame < 6 ? 1 : frame < 11 ? 2 : 3);
      }
      expect(gs.ammoCount).toBe(ammoBefore - 1);
      await act(async () => { container.querySelector('[data-testid="combat-rail"]').click(); });
      for (const [synergy, weaponMod, evolution, upgrade] of [[1, 1, 1, 0], [3, 1, 1, 0], [1, 0.5, 1, 0], [1, 1, 1.5, 0], [3, 0.5, 1.5, 2]]) {
        gs.ammoCount = 100; gs.weaponAmmos[9] = 100;
        gs.synergyDamageMult = synergy; gs.weaponMods[9] = { damageMult: weaponMod };
        gs.weaponUpgrades[9] = upgrade; evolutions.current[9].damageMult = evolution;
        clock.mockReturnValue(Date.now() + 10000);
        gs.activeRunFrames += 600;
        barrierFixture.input.mouseRef.current.down = true;
        await tick();
        barrierFixture.input.mouseRef.current.down = false;
        const runDamageMult = seed === 8 ? 2 : 1; // Glass Cannon versus Vampire
        expect(gs.pendingBeam.damage).toBeCloseTo(160 * runDamageMult * synergy * weaponMod * evolution * (1 + upgrade * 0.25));
      }
      // Terminal transitions discard delayed projectiles before any rematch.
      gs.pendingBurstShots = [{ remainingFrames: 1 }];
      const report = vi.spyOn(console, "error").mockImplementation(() => {});
      try { await act(async () => { useGameLoop.mock.calls.at(-1)[3].onError(new Error("burst terminal fixture")); }); }
      finally { report.mockRestore(); }
      expect(gs.pendingBurstShots).toEqual([]);
    } finally { clock.mockRestore(); context.mockRestore(); }
  }, 60000);
  it("freezes ability readiness and pickup duration, preserves base speed, and respects manual reload", async () => {
    const { default: App } = await import("./App.jsx");
    const { useGameLoop } = await import("./hooks/useGameLoop.js");
    container = document.createElement("div"); document.body.appendChild(container); root = createRoot(container);
    await act(async () => { root.render(<App />); }); await flush();
    await act(async () => { container.querySelector("button").click(); }); await flush();
    const canvas = container.querySelector("#game-canvas");
    let fiber = canvas[Object.keys(canvas).find(key => key.startsWith("__reactFiber"))];
    const refs = [];
    while (fiber) {
      let hook = fiber.memoizedState;
      while (hook) { if (hook.memoizedState && Object.hasOwn(hook.memoizedState, "current")) refs.push(hook.memoizedState); hook = hook.next; }
      fiber = fiber.return;
    }
    const gs = refs.find(ref => ref.current?.player && ref.current?.enemies).current;
    const grenade = refs.find(ref => ref.current && Object.hasOwn(ref.current, "ready") && !Object.hasOwn(ref.current, "active"));
    const dash = refs.find(ref => ref.current && Object.hasOwn(ref.current, "ready") && Object.hasOwn(ref.current, "active"));
    const context = vi.spyOn(canvas, "getContext").mockReturnValue({});
    for (const ref of Object.values(barrierFixture.refs)) ref.current = false;
    gs.spawnTimer = 1e9; gs.maxEnemiesThisWave = 1e9; gs.enemies = []; gs.obstacles = []; gs.hazards = [];
    gs.player.health = 1e9; gs.player.maxHealth = 1e9; gs.settHighlightCapture = false;
    try {
      vi.useFakeTimers();
      await act(async () => {
        container.querySelector('[data-testid="combat-grenade"]').click();
        container.querySelector('[data-testid="combat-dash"]').click();
      });
      expect(grenade.current.ready).toBe(false); expect(dash.current.ready).toBe(false);
      barrierFixture.refs.paused.current = true;
      await act(async () => { await vi.advanceTimersByTimeAsync(9000); });
      expect(grenade.current.ready).toBe(false); expect(dash.current.ready).toBe(false);
      vi.useRealTimers();
      barrierFixture.refs.paused.current = false;
      gs.player.speed = 3.2;
      gs.pickups = [{ type: "speed", x: gs.player.x, y: gs.player.y, life: 100 }];
      await act(async () => { useGameLoop.mock.calls.at(-1)[0]({ render: false }); });
      expect(gs.player.speed).toBe(3.2);
      expect(gs.speedPickupFrames).toEqual([300]);
      for (const [name, ref] of Object.entries(barrierFixture.refs)) {
        ref.current = true;
        const before = { ...gs.abilityCooldowns };
        await act(async () => { useGameLoop.mock.calls.at(-1)[0]({ render: false }); });
        expect(gs.abilityCooldowns, name).toEqual(before);
        expect(gs.speedPickupFrames, name).toEqual([300]);
        ref.current = false;
      }
      const before = { ...gs.abilityCooldowns };
      await act(async () => { useGameLoop.mock.calls.at(-1)[0]({ render: false }); });
      expect(gs.abilityCooldowns.dash).toBe(before.dash - 1);
      expect(gs.abilityCooldowns.grenade).toBe(before.grenade - 1);
      expect(gs.speedPickupFrames).toEqual([299]);
      gs.settAutoReload = false; gs.ammoCount = 1; gs.weaponAmmos[0] = 1;
      barrierFixture.input.mouseRef.current.down = true;
      await act(async () => { useGameLoop.mock.calls.at(-1)[0]({ render: false }); });
      expect(gs.ammoCount).toBe(0); expect(gs.pendingReload).toBeFalsy();
      await act(async () => { container.querySelector('[data-testid="combat-reload"]').click(); });
      expect(gs.pendingReload?.weaponIndex).toBe(0);
      barrierFixture.input.mouseRef.current.down = false;
      gs.pendingReload.remainingFrames = 1;
      await act(async () => { useGameLoop.mock.calls.at(-1)[0]({ render: false }); });
      gs.settAutoReload = true; gs.ammoCount = 1; gs.weaponAmmos[0] = 1;
      const clock = vi.spyOn(Date, "now").mockReturnValue(Date.now() + 10000);
      try {
        gs.activeRunFrames += 600;
        barrierFixture.input.mouseRef.current.down = true;
        await act(async () => { useGameLoop.mock.calls.at(-1)[0]({ render: false }); });
        expect(gs.ammoCount).toBe(0); expect(gs.pendingReload?.weaponIndex).toBe(0);
        barrierFixture.input.mouseRef.current.down = false;
        gs.pendingReload.remainingFrames = 1;
        await act(async () => { useGameLoop.mock.calls.at(-1)[0]({ render: false }); });
        const { PERK_FACTS } = await import("./config/perkFacts.js");
        gs.settAutoReload = false; gs.overclocked = true; gs.overclockedShots = PERK_FACTS.overclocked.forcedReloadShots - 1;
        barrierFixture.input.mouseRef.current.down = true;
        clock.mockReturnValue(Date.now() + 10000);
        gs.activeRunFrames += 600;
        await act(async () => { useGameLoop.mock.calls.at(-1)[0]({ render: false }); });
        expect(gs.pendingReload?.weaponIndex).toBe(0);
      } finally { clock.mockRestore(); }
    } finally { vi.useRealTimers(); context.mockRestore(); }
  }, 60000);
  it("reloads and resupplies a usable RPG magazine after Haste Poison", async () => {
    const { default: App } = await import("./App.jsx");
    const { useGameLoop } = await import("./hooks/useGameLoop.js");
    const { CURSED_PERKS } = await import("./constants.js");
    container = document.createElement("div"); document.body.appendChild(container); root = createRoot(container);
    await act(async () => { root.render(<App />); }); await flush();
    await act(async () => { container.querySelector("button").click(); }); await flush();
    const canvas = container.querySelector("#game-canvas");
    let fiber = canvas[Object.keys(canvas).find(key => key.startsWith("__reactFiber"))];
    const refs = [];
    while (fiber) {
      let hook = fiber.memoizedState;
      while (hook) { if (hook.memoizedState && Object.hasOwn(hook.memoizedState, "current")) refs.push(hook.memoizedState); hook = hook.next; }
      fiber = fiber.return;
    }
    const gs = refs.find(ref => ref.current?.player && ref.current?.enemies).current;
    // perkModsRef immediately follows difficultyRef in the App's ref declaration.
    const mods = refs[refs.findIndex(ref => ref.current === "normal") + 1].current;
    CURSED_PERKS.find(perk => perk.id === "haste_poison").apply(mods);
    expect(mods.ammoMult).toBe(0.3);
    const context = vi.spyOn(canvas, "getContext").mockReturnValue({});
    for (const ref of Object.values(barrierFixture.refs)) ref.current = false;
    gs.spawnTimer = 1e9; gs.maxEnemiesThisWave = 1e9; gs.enemies = []; gs.obstacles = []; gs.hazards = [];
    gs.player.health = 1e9; gs.player.maxHealth = 1e9; gs.settHighlightCapture = false; gs.settAutoReload = false;
    try {
      await act(async () => { container.querySelector('[data-testid="combat-swap"]').click(); });
      gs.ammoCount = 0; gs.weaponAmmos[1] = 0;
      await act(async () => { container.querySelector('[data-testid="combat-reload"]').click(); });
      expect(gs.pendingReload?.weaponIndex).toBe(1);
      gs.pendingReload.remainingFrames = 1;
      await act(async () => { useGameLoop.mock.calls.at(-1)[0]({ render: false }); });
      expect(gs.ammoCount).toBe(1); expect(gs.weaponAmmos[1]).toBe(1);
      barrierFixture.input.mouseRef.current.down = true;
      await act(async () => { useGameLoop.mock.calls.at(-1)[0]({ render: false }); });
      expect(gs.ammoCount).toBe(0); expect(gs.bullets.some(bullet => bullet.wpnIdx === 1)).toBe(true);
      barrierFixture.input.mouseRef.current.down = false;
      gs.pickups = [{ type: "ammo", x: gs.player.x, y: gs.player.y, life: 100 }];
      await act(async () => { useGameLoop.mock.calls.at(-1)[0]({ render: false }); });
      expect(gs.ammoCount).toBe(1); expect(gs.weaponAmmos[1]).toBe(1);
      // Scavenger's partial all-weapon resupply also respects the same capacity.
      mods.ammoRestoreMult = 1.3;
      gs.ammoCount = 0; gs.weaponAmmos[1] = 0;
      gs.pickups = [{ type: "ammo", x: gs.player.x, y: gs.player.y, life: 100 }];
      await act(async () => { useGameLoop.mock.calls.at(-1)[0]({ render: false }); });
      expect(gs.ammoCount).toBeGreaterThanOrEqual(1);
    } finally { context.mockRestore(); }
  }, 60000);
  it("blocks combat through keyboard, pointer, touch, controller and dock during every frozen state, then resumes", async () => {
    const { default: App } = await import("./App.jsx");
    const { useGameLoop } = await import("./hooks/useGameLoop.js");
    const { soundDash, soundGrenadeAt, soundReload, soundWeaponSwap } = await import("./audio/soundFacade.js");
    container = document.createElement("div"); document.body.appendChild(container); root = createRoot(container);
    await act(async () => { root.render(<App />); }); await flush();
    await act(async () => { container.querySelector("button").click(); }); await flush();
    const canvas = container.querySelector("#game-canvas");
    let fiber = canvas[Object.keys(canvas).find(key => key.startsWith("__reactFiber"))];
    const refs = [];
    while (fiber) {
      let hook = fiber.memoizedState;
      while (hook) { if (hook.memoizedState && Object.hasOwn(hook.memoizedState, "current")) refs.push(hook.memoizedState); hook = hook.next; }
      fiber = fiber.return;
    }
    const gs = refs.find(ref => ref.current?.player && ref.current?.enemies).current;
    const mouse = refs.find(ref => ref.current && Object.hasOwn(ref.current, "down") && Object.hasOwn(ref.current, "moved"));
    const moveStick = refs.find(ref => ref.current && Object.hasOwn(ref.current, "startX") && !Object.hasOwn(ref.current, "shooting"));
    const keyState = barrierFixture.input.keysRef;
    const context = vi.spyOn(canvas, "getContext").mockReturnValue({});
    const buttons = Array.from({ length: 17 }, () => ({ pressed: false, value: 0 }));
    const gamepad = { index: 0, id: "Xbox test", connected: true, axes: [1, 0, 1, 0], buttons };
    const priorGamepads = Object.getOwnPropertyDescriptor(navigator, "getGamepads");
    Object.defineProperty(navigator, "getGamepads", { configurable: true, value: () => [gamepad] });
    const sounds = [soundDash, soundGrenadeAt, soundReload, soundWeaponSwap];
    for (const sound of sounds) sound.mockClear();
    try {
      for (const [name, ref] of Object.entries(barrierFixture.refs)) {
        ref.current = true;
        gs.synergyChargeReady = true;
        const before = { bullets: gs.bullets.length, grenades: gs.grenades.length, ammo: gs.ammoCount, pendingReload: gs.pendingReload, x: gs.player.x, y: gs.player.y };
        await act(async () => {
          for (const key of ["w", "q", "r", " ", "e", "2", "z"]) window.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
          window.dispatchEvent(new MouseEvent("mousedown", { button: 0, bubbles: true }));
          const touch = new Event("touchstart", { bubbles: true, cancelable: true });
          Object.defineProperty(touch, "changedTouches", { value: [{ clientX: 30, clientY: 80, identifier: 1 }] });
          canvas.dispatchEvent(touch);
          for (const action of ["reload", "dash", "grenade", "swap"]) container.querySelector(`[data-testid="combat-${action}"]`).click();
          for (const index of [0, 1, 2, 4, 5, 7]) buttons[index] = { pressed: true, value: 1 };
          await new Promise(resolve => setTimeout(resolve, 25));
          useGameLoop.mock.calls.at(-1)[0]({ render: false });
        });
        expect(gs.bullets.length, name).toBe(before.bullets);
        expect(gs.grenades.length, name).toBe(before.grenades);
        expect(gs.ammoCount, name).toBe(before.ammo);
        expect(gs.pendingReload, name).toBe(before.pendingReload);
        expect(gs.player.x, name).toBe(before.x);
        expect(gs.player.y, name).toBe(before.y);
        expect(gs.synergyChargeReady, name).toBe(true);
        expect(mouse.current.down, name).toBe(false);
        expect(moveStick.current.active, name).toBe(false);
        expect(Boolean(keyState.current.w), name).toBe(false);
        expect(barrierFixture.input.gamepadMoveRef.current.active, name).toBe(false);
        expect(barrierFixture.input.gamepadShootRef.current, name).toBe(false);
        expect(useGameLoop.mock.calls.at(-1)[3].shouldMeasure(), name).toBe(false);
        for (const sound of sounds) expect(sound, name).not.toHaveBeenCalled();
        ref.current = false;
        for (const button of buttons) { button.pressed = false; button.value = 0; }
      }
      gamepad.axes = [0, 0, 0, 0];
      await act(async () => {
        window.dispatchEvent(new KeyboardEvent("keydown", { key: "q", bubbles: true }));
        window.dispatchEvent(new KeyboardEvent("keydown", { key: " ", bubbles: true }));
        window.dispatchEvent(new KeyboardEvent("keydown", { key: "r", bubbles: true }));
        container.querySelector('[data-testid="combat-swap"]').click();
      });
      expect(soundGrenadeAt).toHaveBeenCalledOnce();
      expect(soundDash).toHaveBeenCalledOnce();
      expect(soundReload).toHaveBeenCalledOnce();
      expect(soundWeaponSwap).toHaveBeenCalledOnce();
      expect(gs.grenades).toHaveLength(1);
      expect(useGameLoop.mock.calls.at(-1)[3].shouldMeasure()).toBe(true);
      await act(async () => { window.dispatchEvent(new KeyboardEvent("keydown", { key: "E", bubbles: true })); });
      expect(gs._interactHeld).toBe(true);
      await act(async () => { window.dispatchEvent(new KeyboardEvent("keyup", { key: "E", bubbles: true })); });
      expect(gs._interactHeld).toBe(false);
      await act(async () => { window.dispatchEvent(new KeyboardEvent("keydown", { key: "E", bubbles: true })); });
      gs._operationInteractHeld = { keyboard: true, touch: true, controller: true };
      await act(async () => { window.dispatchEvent(new Event("blur")); });
      expect(gs._interactHeld).toBe(false);
      expect(gs._operationInteractHeld).toEqual({ keyboard: false, mouse: false, touch: false, controller: false });
      expect(Boolean(keyState.current.e)).toBe(false);
      expect(barrierFixture.refs.paused.current).toBe(true);
    } finally {
      context.mockRestore();
      if (priorGamepads) Object.defineProperty(navigator, "getGamepads", priorGamepads);
      else delete navigator.getGamepads;
    }
  }, 60000);
  it("applies the newly selected starting kit on the first launch", async () => {
    const { default: App } = await import("./App.jsx");
    container = document.createElement("div"); document.body.appendChild(container); root = createRoot(container);
    await act(async () => { root.render(<App />); }); await flush();
    await act(async () => { container.querySelector('[data-testid="select-cannon"]').click(); }); await flush();
    await act(async () => { container.querySelector('button').click(); }); await flush();
    const canvas = container.querySelector('#game-canvas');
    let fiber = canvas[Object.keys(canvas).find(key => key.startsWith('__reactFiber'))], state;
    while (fiber && !state) {
      let hook = fiber.memoizedState;
      while (hook) { const value = hook.memoizedState?.current; if (value?.player && value?.enemies) { state = value; break; } hook = hook.next; }
      fiber = fiber.return;
    }
    expect(state?.runStarterLoadout).toBe('cannon');
    expect(state.player.health).toBe(Math.max(20, Math.floor(state.player.maxHealth * .6)));
    state.score = 12345; state.currentWave = 9;
    const { useGameLoop } = await import('./hooks/useGameLoop.js');
    const report = vi.spyOn(console, 'error').mockImplementation(() => {});
    await act(async () => { useGameLoop.mock.calls.at(-1)[3].onError(new Error('terminal fixture')); }); await flush();
    expect(container.querySelector('[data-testid="retry-run"]').dataset).toMatchObject({ score: '12345', wave: '9' });
    report.mockRestore();
  }, 60000);
  it("deploys and rematches directly without a draft and requests one run token each", async () => {
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

    expect(container.querySelector("#game-canvas")).not.toBeNull();
    expect(container.textContent).not.toContain("draft-skip");
    expect(issueRunTokenMock).toHaveBeenCalledTimes(1);
    const { useGameLoop } = await import("./hooks/useGameLoop.js");
    const report = vi.spyOn(console, "error").mockImplementation(() => {});
    await act(async () => { useGameLoop.mock.calls.at(-1)[3].onError(new Error("test run end")); });
    await flush();
    await act(async () => { container.querySelector("[data-testid=retry-run]").click(); });
    await flush();
    expect(container.textContent).not.toContain("draft-skip");
    expect(container.querySelector("#game-canvas")).not.toBeNull();
    expect(issueRunTokenMock).toHaveBeenCalledTimes(2);
    report.mockRestore();
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
