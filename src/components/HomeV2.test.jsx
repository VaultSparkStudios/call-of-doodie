import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("../supabase.js", () => ({ supabase: null, getOrCreateClientUid: () => "test-uid", getAuthUid: () => null }));
vi.mock("../utils/analytics.js", () => ({
  track: vi.fn(),
  analyticsInit: vi.fn(),
  identify: vi.fn(),
  analyticsReset: vi.fn(),
  gameCtx: () => ({}),
  resolveMode: () => "standard",
  getAnalyticsStatus: () => ({ enabled: false, provider: "none" }),
}));
vi.mock("./DemoCanvas.jsx", () => ({
  default: function DemoCanvasMock() {
    return <div data-testid="demo-canvas" />;
  },
}));

import HomeV2 from "./HomeV2.jsx";
import { encodeReplayCode } from "../utils/replayCode.js";
import { buildInputCalibrationRecord, loadInputCalibration, saveInputCalibration } from "../utils/inputCalibration.js";

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
  scoreAttackMode: false, onSetScoreAttackMode: noop,
  dailyChallengeMode: false, onSetDailyChallengeMode: noop,
  cursedRunMode: false, onSetCursedRunMode: noop,
  bossRushMode: false, onSetBossRushMode: noop,
  speedrunMode: false, onSetSpeedrunMode: noop,
  gauntletMode: false, onSetGauntletMode: noop,
  assistAvailable: false, onApplyAssist: noop,
};

describe("HomeV2", () => {
  let container, root;
  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
    window.history.pushState({}, "", "/");
    localStorage.removeItem("cod-debug-input");
    localStorage.removeItem("cod-debug-ops");
    localStorage.removeItem("cod-input-calibration");
    localStorage.removeItem("cod-controller-profile");
  });

  it("renders hero title + DEPLOY button and calls onStart on click", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    const onStart = vi.fn();
    await act(async () => {
      root = createRoot(container);
      root.render(<HomeV2 {...baseProps} onStart={onStart} />);
    });

    expect(container.textContent).toContain("CALL OF DOODIE");
    expect(container.textContent).toContain("DEPLOY");

    const deployBtn = [...container.querySelectorAll("button")].find(b => /DEPLOY/.test(b.textContent));
    expect(deployBtn).toBeTruthy();
    await act(async () => { deployBtn.click(); });
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it("exposes all 4 tab labels (Career / Codex / Settings / Support)", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    await act(async () => {
      root = createRoot(container);
      root.render(<HomeV2 {...baseProps} />);
    });
    const txt = container.textContent;
    expect(txt).toMatch(/CAREER/);
    expect(txt).toMatch(/CODEX/);
    expect(txt).toMatch(/SETTINGS/);
    expect(txt).toMatch(/SUPPORT/);
  });

  it("shows a journey card and keeps Command Center collapsed by default", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    await act(async () => {
      root = createRoot(container);
      root.render(<HomeV2 {...baseProps} />);
    });

    expect(container.textContent).toContain("JOURNEY");
    expect(container.textContent).toContain("NEXT:");
    expect(container.textContent).toContain("COMMAND CENTER");
    const commandToggle = [...container.querySelectorAll("button")].find(b => /COMMAND CENTER/.test(b.textContent));
    expect(commandToggle?.getAttribute("aria-expanded")).toBe("false");
  });

  it("hydrates replay links including starter loadout", async () => {
    const code = encodeReplayCode({
      seed: 424242,
      mode: "daily_challenge",
      difficulty: "hard",
      starterLoadout: "tank",
      weaponIdx: 0,
    });
    window.history.pushState({}, "", `/?replay=${code}`);

    container = document.createElement("div");
    document.body.appendChild(container);
    const setDifficulty = vi.fn();
    const setStarterLoadout = vi.fn();
    const onSetDailyChallengeMode = vi.fn();

    await act(async () => {
      root = createRoot(container);
      root.render(
        <HomeV2
          {...baseProps}
          setDifficulty={setDifficulty}
          setStarterLoadout={setStarterLoadout}
          onSetDailyChallengeMode={onSetDailyChallengeMode}
        />,
      );
    });

    expect(setDifficulty).toHaveBeenCalledWith("hard");
    expect(setStarterLoadout).toHaveBeenCalledWith("tank");
    expect(onSetDailyChallengeMode).toHaveBeenCalledWith(true);
    const seedInput = [...container.querySelectorAll("input")].find(input => input.value === "424242");
    expect(seedInput).toBeTruthy();
  });

  it("surfaces first-run calibration guidance and hidden input diagnostics shortcut", async () => {
    localStorage.setItem("cod-debug-input", "1");
    container = document.createElement("div");
    document.body.appendChild(container);
    await act(async () => {
      root = createRoot(container);
      root.render(<HomeV2 {...baseProps} />);
    });

    expect(container.textContent).toContain("Calibrate");
    expect(container.textContent).toContain("DEBUG INPUT");
  });

  it("turns Aim Check into a local controls-verified receipt", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    await act(async () => {
      root = createRoot(container);
      root.render(<HomeV2 {...baseProps} />);
    });

    const aimButton = [...container.querySelectorAll("button")].find(b => /AIM CHECK/.test(b.textContent));
    expect(aimButton).toBeTruthy();
    await act(async () => { aimButton.click(); });
    expect(container.textContent).toContain("Verify Full-Circle Control");

    const verifyButton = [...container.querySelectorAll("button")].find(b => /VERIFY CONTROLS/.test(b.textContent));
    expect(verifyButton).toBeTruthy();
    await act(async () => { verifyButton.click(); });

    const saved = loadInputCalibration();
    expect(saved?.complete).toBe(true);
    expect(saved?.buckets).toEqual(["east", "north", "south", "west"]);
    expect(container.textContent).toContain("AIM CHECK VERIFIED");
  });

  it("surfaces remembered input calibration and controller profile status", async () => {
    saveInputCalibration(buildInputCalibrationRecord({
      source: "mouse",
      buckets: ["east", "west", "north", "south"],
      timestamp: 123,
    }));
    localStorage.setItem("cod-controller-profile", JSON.stringify({
      version: 1,
      type: "xbox",
      index: 1,
      id: "Xbox Wireless Controller",
      axes: 4,
      buttons: 16,
      lastSeen: 123,
    }));
    container = document.createElement("div");
    document.body.appendChild(container);
    await act(async () => {
      root = createRoot(container);
      root.render(<HomeV2 {...baseProps} />);
    });

    expect(container.textContent).toContain("INPUT QA READY");
    expect(container.textContent).toContain("XBOX · FOUR-DIRECTION");
    expect(container.textContent).toContain("#1");
  });

  it("hides operational measurement status from the default visitor surface", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    await act(async () => {
      root = createRoot(container);
      root.render(<HomeV2 {...baseProps} />);
    });

    expect(container.textContent).not.toContain("MEASUREMENT STATUS");
    expect(container.textContent).not.toContain("PostHog key missing");
  });

  it("shows measurement status only through the ops debug surface", async () => {
    window.history.pushState({}, "", "/?debug=ops");
    container = document.createElement("div");
    document.body.appendChild(container);
    await act(async () => {
      root = createRoot(container);
      root.render(<HomeV2 {...baseProps} />);
    });

    expect(container.textContent).toContain("MEASUREMENT STATUS");
    expect(container.textContent).toContain("PostHog key missing");
    expect(container.textContent).toContain("BALANCE LAB");
  });
});
