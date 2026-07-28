import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("../supabase.js", () => ({
  getSupabaseClient: async () => null,
  getOrCreateClientUid: () => "test-uid",
  getAuthUid: () => null,
}));

vi.mock("../utils/analytics.js", () => ({
  track: vi.fn(),
  analyticsInit: vi.fn(),
  identify: vi.fn(),
  analyticsReset: vi.fn(),
  gameCtx: () => ({}),
  resolveMode: () => "standard",
  getAnalyticsStatus: () => ({ enabled: false, provider: "none" }),
}));

// Stub all lazy-loaded panels so tests don't need network/chunk resolution
vi.mock("./LeaderboardPanel.jsx", () => ({ default: () => <div data-testid="panel-leaderboard" /> }));
vi.mock("./AchievementsPanel.jsx", () => ({ default: () => <div data-testid="panel-achievements" /> }));
vi.mock("./SettingsPanel.jsx", () => ({ default: (props) => <div data-testid="panel-settings"><button onClick={props.onClose}>close</button></div> }));
vi.mock("./MetaTreePanel.jsx", () => ({ default: () => <div data-testid="panel-meta" /> }));
vi.mock("./SupporterModal.jsx", () => ({ default: () => <div data-testid="panel-support" /> }));
vi.mock("./MenuPanels.jsx", () => ({
  RulesPanel: () => <div data-testid="panel-rules" />,
  ControlsPanel: () => <div data-testid="panel-controls" />,
  MostWantedPanel: () => <div data-testid="panel-enemies" />,
  RunHistoryPanel: () => <div data-testid="panel-history" />,
  LoadoutBuilderPanel: () => <div data-testid="panel-loadout" />,
  CareerStatsPanel: () => <div data-testid="panel-stats" />,
  MissionsPanel: () => <div data-testid="panel-missions" />,
  UpgradesPanel: () => <div data-testid="panel-upgrades" />,
  NewFeaturesPanel: () => <div data-testid="panel-news" />,
}));

import HomeV3 from "./HomeV3.jsx";

const noop = () => {};

const baseProps = {
  username: "tester",
  difficulty: "normal",
  setDifficulty: noop,
  isMobile: false,
  leaderboard: [],
  lbLoading: false,
  lbHasMore: false,
  onLoadMore: noop,
  onStart: vi.fn(),
  onRefreshLeaderboard: noop,
  onChangeUsername: noop,
  starterLoadout: "standard",
  setStarterLoadout: noop,
  gameSettings: {},
  onSaveSettings: noop,
  gamepadConnected: false,
  controllerType: null,
  scoreAttackMode: false,
  onSetScoreAttackMode: noop,
  dailyChallengeMode: false,
  onSetDailyChallengeMode: noop,
  cursedRunMode: false,
  onSetCursedRunMode: noop,
  bossRushMode: false,
  onSetBossRushMode: noop,
  speedrunMode: false,
  onSetSpeedrunMode: noop,
  gauntletMode: false,
  onSetGauntletMode: noop,
  assistAvailable: false,
  onApplyAssist: noop,
  onReplayTraining: noop,
  onInstallApp: null,
};

const CAREER_KEY = "cod-career-v1";
const THEME_KEY = "cod-theme";

describe("HomeV3", () => {
  let container, root;

  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
    localStorage.removeItem(CAREER_KEY);
    localStorage.removeItem(THEME_KEY);
    document.documentElement.removeAttribute("data-cod-theme");
    window.history.pushState({}, "", "/");
    vi.restoreAllMocks();
  });

  it("renders game title and START RUN deploy button", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    await act(async () => {
      root = createRoot(container);
      root.render(<HomeV3 {...baseProps} />);
    });

    const shell = container.querySelector("[data-testid='home-v3-shell']");
    expect(shell).toBeTruthy();
    expect(container.textContent).toContain("CALL OF DOODIE");

    const startBtn = container.querySelector("[data-testid='front-door-deploy']");
    expect(startBtn).toBeTruthy();
    expect(startBtn.textContent).toContain("START RUN");
  });

  it("START RUN calls onStart when clicked", async () => {
    const onStart = vi.fn();
    container = document.createElement("div");
    document.body.appendChild(container);
    await act(async () => {
      root = createRoot(container);
      root.render(<HomeV3 {...baseProps} onStart={onStart} />);
    });

    const startBtn = container.querySelector("[data-testid='front-door-deploy']");
    await act(async () => { startBtn.click(); });
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it("mode drawer opens showing all game modes and closes again", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    await act(async () => {
      root = createRoot(container);
      root.render(<HomeV3 {...baseProps} />);
    });

    expect(container.querySelector(".home3__mode-drawer")).toBeNull();

    const modeBtn = container.querySelector(".home3__mode-button");
    expect(modeBtn).toBeTruthy();
    await act(async () => { modeBtn.click(); });
    expect(container.querySelector(".home3__mode-drawer")).toBeTruthy();

    // All 7 modes should be listed
    const modeGrid = container.querySelector(".home3__mode-grid");
    expect(modeGrid).toBeTruthy();
    expect(container.textContent).toContain("Standard Run");
    expect(container.textContent).toContain("Daily Challenge");
    expect(container.textContent).toContain("Boss Rush");
    expect(container.textContent).toContain("Cursed Run");

    // Close button dismisses the drawer
    const closeBtn = container.querySelector(".home3__drawer-heading button");
    await act(async () => { closeBtn.click(); });
    expect(container.querySelector(".home3__mode-drawer")).toBeNull();
  });

  it("theme toggle cycles themes and persists the preference", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    await act(async () => {
      root = createRoot(container);
      root.render(<HomeV3 {...baseProps} />);
    });

    const shell = container.querySelector("[data-testid='home-v3-shell']");
    const initialTheme = shell.getAttribute("data-theme");

    const toggle = container.querySelector("[data-theme-toggle]");
    expect(toggle).toBeTruthy();
    await act(async () => { toggle.click(); });

    const newTheme = shell.getAttribute("data-theme");
    expect(newTheme).not.toBe(initialTheme);
    expect(localStorage.getItem(THEME_KEY)).toBe(newTheme);
  });

  it("mobile nav buttons switch the active section", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    await act(async () => {
      root = createRoot(container);
      root.render(<HomeV3 {...baseProps} />);
    });

    const playSection = container.querySelector(".home3__play");
    const progressSection = container.querySelector(".home3__progress");
    expect(playSection.classList.contains("is-active")).toBe(true);
    expect(progressSection.classList.contains("is-active")).toBe(false);

    const navButtons = container.querySelectorAll(".home3__mobile-nav button");
    // Nav order: play / challenges / progress / more
    const progressNavBtn = navButtons[2];
    expect(progressNavBtn.textContent).toContain("Progress");

    await act(async () => { progressNavBtn.click(); });
    expect(progressSection.classList.contains("is-active")).toBe(true);
    expect(playSection.classList.contains("is-active")).toBe(false);
  });

  it("shows new player guidance when career has zero runs", async () => {
    // Default localStorage has no career → loadCareerStats returns totalRuns: 0
    container = document.createElement("div");
    document.body.appendChild(container);
    await act(async () => {
      root = createRoot(container);
      root.render(<HomeV3 {...baseProps} />);
    });

    expect(container.textContent).toContain("New player guide");
    expect(container.textContent).toContain("Start Training");
  });

  it("shows returning player welcome message when career history exists", async () => {
    localStorage.setItem(CAREER_KEY, JSON.stringify({
      totalRuns: 12,
      bestWave: 22,
      bestScore: 9500,
      totalKills: 340,
    }));
    container = document.createElement("div");
    document.body.appendChild(container);
    await act(async () => {
      root = createRoot(container);
      root.render(<HomeV3 {...baseProps} />);
    });

    expect(container.textContent).not.toContain("New player guide");
    expect(container.textContent).toContain("Welcome back");
    expect(container.textContent).toContain("Best wave 22");
    expect(container.textContent).toContain("9,500");
  });

  it("reflects bossRushMode prop in the mode label on the START RUN button", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    await act(async () => {
      root = createRoot(container);
      root.render(<HomeV3 {...baseProps} bossRushMode />);
    });

    const startBtn = container.querySelector("[data-testid='front-door-deploy']");
    expect(startBtn.textContent).toContain("Boss Rush");
  });

  it("displays quick-play cards for Daily Challenge and Weekly Gauntlet", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    await act(async () => {
      root = createRoot(container);
      root.render(<HomeV3 {...baseProps} />);
    });

    const quickGrid = container.querySelector(".home3__quick-grid");
    expect(quickGrid).toBeTruthy();
    expect(quickGrid.textContent).toContain("Daily Challenge");
    expect(quickGrid.textContent).toContain("Weekly Gauntlet");
    expect(quickGrid.textContent).toContain("Training Run");
  });

  it("opens the settings panel when settings icon button is clicked", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    await act(async () => {
      root = createRoot(container);
      root.render(<HomeV3 {...baseProps} />);
    });

    const settingsBtn = [...container.querySelectorAll("button")].find(
      (b) => b.getAttribute("aria-label") === "Open settings",
    );
    expect(settingsBtn).toBeTruthy();

    await act(async () => { settingsBtn.click(); });
    // Flush lazy-import microtasks
    await act(async () => {});

    expect(container.querySelector("[data-testid='panel-settings']")).toBeTruthy();
  });

  it("has accessible 4-item mobile nav with labeled sections", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    await act(async () => {
      root = createRoot(container);
      root.render(<HomeV3 {...baseProps} />);
    });

    const nav = container.querySelector(".home3__mobile-nav");
    expect(nav).toBeTruthy();
    expect(nav.getAttribute("aria-label")).toBeTruthy();
    const navBtns = nav.querySelectorAll("button");
    expect(navBtns.length).toBe(4);
    const labels = [...navBtns].map((b) => b.textContent);
    expect(labels.some((l) => /Play/i.test(l))).toBe(true);
    expect(labels.some((l) => /Progress/i.test(l))).toBe(true);
    expect(labels.some((l) => /More/i.test(l))).toBe(true);
  });
});
