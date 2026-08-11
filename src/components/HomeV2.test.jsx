import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("../supabase.js", () => ({ getSupabaseClient: async () => null, getOrCreateClientUid: () => "test-uid", getAuthUid: () => null }));
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
  onSetVisualPack: noop,
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

function saveVerifiedInput() {
  saveInputCalibration(buildInputCalibrationRecord({
    source: "mouse",
    buckets: ["east", "west", "north", "south"],
    timestamp: Date.now(),
  }));
}

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
    localStorage.removeItem("cod-pwa-install-attempt");
    localStorage.removeItem("cod-run-history-v1");
    localStorage.removeItem("cod-career-v1");
    localStorage.removeItem("cod-theme");
    document.documentElement.removeAttribute("data-cod-theme");
    sessionStorage.removeItem("cod-insight-dismissed");
    vi.unstubAllGlobals();
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

  it("launches the deterministic weekly Gauntlet in one quick action", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    const onStart = vi.fn();
    const onSetGauntletMode = vi.fn();
    await act(async () => {
      root = createRoot(container);
      root.render(<HomeV2 {...baseProps} onStart={onStart} onSetGauntletMode={onSetGauntletMode} />);
    });

    const gauntlet = container.querySelector('[aria-label="Launch weekly Gauntlet"]');
    expect(gauntlet).toBeTruthy();
    await act(async () => { gauntlet.click(); });

    expect(onSetGauntletMode).toHaveBeenCalledWith(true);
    expect(onStart).toHaveBeenCalledWith(expect.any(Number), expect.objectContaining({ gauntletWeek: expect.any(Number) }));
    expect(onSetGauntletMode.mock.invocationCallOrder[0]).toBeLessThan(onStart.mock.invocationCallOrder[0]);
  });

  it("shows every primary weapon before deployment and makes selection direct", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    const onSelectPrimaryWeapon = vi.fn();
    await act(async () => {
      root = createRoot(container);
      root.render(<HomeV2 {...baseProps} primaryWeaponIndex={0} onSelectPrimaryWeapon={onSelectPrimaryWeapon} />);
    });

    const arsenal = container.querySelector('[aria-label="Choose primary weapon"]');
    expect(arsenal).not.toBeNull();
    expect(arsenal.querySelectorAll("button")).toHaveLength(12);
    const rpg = arsenal.querySelector('[aria-label^="Equip Rubber Chicken RPG"]');
    expect(rpg).not.toBeNull();
    await act(async () => { rpg.click(); });
    expect(onSelectPrimaryWeapon).toHaveBeenCalledWith(1);
  });

  it("offers the non-default Retro character pack before deployment", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    const onSetVisualPack = vi.fn();
    await act(async () => {
      root = createRoot(container);
      root.render(<HomeV2 {...baseProps} gameSettings={{ visualPack: "modern" }} onSetVisualPack={onSetVisualPack} />);
    });

    const selector = container.querySelector('[data-testid="visual-pack-selector"]');
    expect(selector).not.toBeNull();
    const modern = [...selector.querySelectorAll("button")].find(button => /MODERN/.test(button.textContent));
    const retro = [...selector.querySelectorAll("button")].find(button => /RETRO/.test(button.textContent));
    expect(modern?.getAttribute("aria-pressed")).toBe("true");
    expect(retro?.getAttribute("aria-pressed")).toBe("false");
    await act(async () => { retro.click(); });
    expect(onSetVisualPack).toHaveBeenCalledWith("retro");
  });

  it("persists an accessible project-specific theme toggle", async () => {
    window.history.replaceState({}, "", "/?theme=porcelain-day");
    container = document.createElement("div");
    document.body.appendChild(container);
    await act(async () => {
      root = createRoot(container);
      root.render(<HomeV2 {...baseProps} />);
    });

    const shell = container.querySelector("[data-testid='home-v2-shell']");
    const toggle = container.querySelector("[data-theme-toggle]");
    expect(shell?.getAttribute("data-theme")).toBe("porcelain-day");
    expect(toggle?.getAttribute("aria-pressed")).toBe("true");
    await act(async () => { toggle.click(); });
    expect(shell?.getAttribute("data-theme")).toBe("sewer-night");
    expect(localStorage.getItem("cod-theme")).toBe("sewer-night");
  });

  it("exposes the streamlined Progress / Field Manual / Support information architecture", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    await act(async () => {
      root = createRoot(container);
      root.render(<HomeV2 {...baseProps} />);
    });
    const txt = container.textContent;
    expect(txt).toMatch(/PLAYER PROGRESS/);
    expect(txt).toMatch(/FIELD MANUAL/);
    expect(txt).toMatch(/SUPPORT/);
  });

  it("shows a journey card and exposes the Player Hub once onboarding completes", async () => {
    saveVerifiedInput();
    localStorage.setItem("cod-career-v1", JSON.stringify({ totalRuns: 5, totalKills: 120 }));
    container = document.createElement("div");
    document.body.appendChild(container);
    await act(async () => {
      root = createRoot(container);
      root.render(<HomeV2 {...baseProps} />);
    });

    expect(container.textContent).toContain("COMMANDER'S ORDERS");
    expect(container.querySelector('[data-order-kind="journey"]')).toBeTruthy();
    expect(container.textContent).toContain("PROGRESS TOOLS");
    const commandToggle = [...container.querySelectorAll("button")].find(b => /PROGRESS TOOLS/.test(b.textContent));
    expect(commandToggle?.getAttribute("aria-expanded")).toBe("true");
    expect(container.textContent).toContain("STATS");
    localStorage.removeItem("cod-career-v1");
  });

  it("renders first-run training as the single Commander's Orders surface after input proof", async () => {
    saveVerifiedInput();
    localStorage.removeItem("cod-career-v1");
    container = document.createElement("div");
    document.body.appendChild(container);
    await act(async () => {
      root = createRoot(container);
      root.render(<HomeV2 {...baseProps} />);
    });

    expect(container.textContent).toContain("FIRST 3 RUNS");
    expect(container.querySelectorAll('[data-testid="commanders-orders"]')).toHaveLength(1);
    expect(container.querySelector('[data-order-kind="first-runs"]')).toBeTruthy();
  });

  it("keeps one stable Commander's Orders component across onboarding and journey phases", async () => {
    saveVerifiedInput();
    localStorage.removeItem("cod-career-v1");
    const onboardingContainer = document.createElement("div");
    document.body.appendChild(onboardingContainer);
    let onboardingRoot;
    await act(async () => {
      onboardingRoot = createRoot(onboardingContainer);
      onboardingRoot.render(<HomeV2 {...baseProps} />);
    });
    const onboardingFrame = onboardingContainer.querySelector('[data-testid="commanders-orders"]');

    localStorage.setItem("cod-career-v1", JSON.stringify({ totalRuns: 5, totalKills: 120 }));
    const ordersContainer = document.createElement("div");
    document.body.appendChild(ordersContainer);
    let ordersRoot;
    await act(async () => {
      ordersRoot = createRoot(ordersContainer);
      ordersRoot.render(<HomeV2 {...baseProps} />);
    });
    const ordersFrameEl = ordersContainer.querySelector('[data-testid="commanders-orders"]');

    expect(onboardingFrame).toBeTruthy();
    expect(ordersFrameEl).toBeTruthy();
    expect(onboardingFrame.dataset.orderKind).toBe("first-runs");
    expect(ordersFrameEl.dataset.orderKind).toBe("journey");
    expect(onboardingFrame.style.maxWidth).toBe(ordersFrameEl.style.maxWidth);
    expect(onboardingFrame.style.borderRadius).toBe(ordersFrameEl.style.borderRadius);
    expect(onboardingFrame.style.padding).toBe(ordersFrameEl.style.padding);
    expect(onboardingFrame.style.margin).toBe(ordersFrameEl.style.margin);

    await act(async () => { onboardingRoot.unmount(); ordersRoot.unmount(); });
    onboardingContainer.remove();
    ordersContainer.remove();
    localStorage.removeItem("cod-career-v1");
  });

  it("uses accessible mobile radio buttons instead of native mode and difficulty pickers", async () => {
    vi.stubGlobal("requestAnimationFrame", (callback) => { callback(); return 1; });
    container = document.createElement("div");
    document.body.appendChild(container);
    const onSetZombiesMode = vi.fn();
    await act(async () => {
      root = createRoot(container);
      root.render(<HomeV2 {...baseProps} isMobile onSetZombiesMode={onSetZombiesMode} />);
    });

    expect(container.querySelectorAll("select")).toHaveLength(0);
    const groups = container.querySelectorAll('[role="radiogroup"]');
    expect(groups).toHaveLength(2);
    const zombies = container.querySelector('[data-mode-id="zombies"]');
    expect(zombies.getAttribute("aria-checked")).toBe("false");
    expect(zombies.style.minHeight).toBe("44px");
    await act(async () => {
      zombies.click();
      await new Promise((resolve) => setTimeout(resolve, 60));
    });
    expect(onSetZombiesMode).toHaveBeenCalledWith(true);
  });

  it("renders and consumes a bounded next-run contract through the single order CTA", async () => {
    saveVerifiedInput();
    localStorage.setItem("cod-career-v1", JSON.stringify({ totalRuns: 5, totalKills: 120 }));
    container = document.createElement("div");
    document.body.appendChild(container);
    const onStart = vi.fn();
    const onConsumeNextRunContract = vi.fn();
    await act(async () => {
      root = createRoot(container);
      root.render(
        <HomeV2
          {...baseProps}
          onStart={onStart}
          pendingNextRunContract={{ id: "tempo", focus: "Spend cooldowns", target: "Throw before the crowd peaks.", proof: "No unused-grenade death." }}
          onConsumeNextRunContract={onConsumeNextRunContract}
        />,
      );
    });

    const order = container.querySelector('[data-order-kind="next-run-contract"]');
    expect(order).toBeTruthy();
    expect(order.textContent).toContain("Spend cooldowns");
    expect(order.dataset.reasonCode).toBe("next-run-contract:tempo");
    const action = [...order.querySelectorAll("button")].find((button) => /DEPLOY/.test(button.textContent));
    await act(async () => { action.click(); });
    expect(onConsumeNextRunContract).toHaveBeenCalledTimes(1);
    expect(onStart).toHaveBeenCalledTimes(1);
    localStorage.removeItem("cod-career-v1");
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

    expect(container.textContent).toContain("INPUT PROOF");
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
    expect(verifyButton.disabled).toBe(true);
    await act(async () => { verifyButton.click(); });
    expect(loadInputCalibration()).toBeNull();

    await act(async () => {
      for (const key of ["w", "d", "s", "a"]) {
        window.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
      }
    });
    expect(verifyButton.disabled).toBe(false);
    await act(async () => { verifyButton.click(); });

    const saved = loadInputCalibration();
    expect(saved?.complete).toBe(true);
    expect(saved?.buckets).toEqual(["east", "north", "south", "west"]);
    expect(saved?.source).toBe("keyboard");
    expect(container.textContent).toContain("INPUT QA READY");
  });

  it("surfaces remembered input calibration and controller profile status", async () => {
    saveVerifiedInput();
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

  it("surfaces PWA install readiness without claiming physical acceptance", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    await act(async () => {
      root = createRoot(container);
      root.render(<HomeV2 {...baseProps} pwaInstallPromptReady onInstallApp={vi.fn()} />);
    });

    expect(container.textContent).toContain("INSTALL AVAILABLE");
    expect(container.textContent).toContain("INSTALL APP");
    expect(container.textContent).not.toContain("PWA INSTALLED");
    expect(container.textContent).not.toContain("3/4");
  });

  it("renders stored PWA prompt acceptance as install QA evidence", async () => {
    localStorage.setItem("cod-pwa-install-attempt", JSON.stringify({ version: 1, outcome: "accepted", timestamp: 123 }));
    container = document.createElement("div");
    document.body.appendChild(container);
    await act(async () => {
      root = createRoot(container);
      root.render(<HomeV2 {...baseProps} />);
    });

    expect(container.textContent).toContain("INSTALL ACCEPTED");
    expect(container.textContent).not.toContain("PWA INSTALLED");
  });

  it("launches Replay Training through the app contract instead of only clearing storage", async () => {
    localStorage.setItem("cod-tutorial-v2", "1");
    const onReplayTraining = vi.fn();
    container = document.createElement("div");
    document.body.appendChild(container);
    await act(async () => {
      root = createRoot(container);
      root.render(<HomeV2 {...baseProps} onReplayTraining={onReplayTraining} />);
    });

    const replayTraining = [...container.querySelectorAll("button")].find(button => /REPLAY TRAINING/.test(button.textContent));
    await act(async () => { replayTraining.click(); });
    expect(onReplayTraining).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem("cod-tutorial-v2")).toBeNull();
  });

  it("keeps internal art cards off the homepage and makes local-save status actionable", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    await act(async () => {
      root = createRoot(container);
      root.render(<HomeV2 {...baseProps} />);
    });

    expect(container.textContent).not.toContain("Porcelain Throne");
    expect(container.textContent).not.toContain("ASSETS");
    expect(container.textContent).toContain("PROGRESS SAVES ON THIS DEVICE");
    const testSave = [...container.querySelectorAll("button")].find(button => /TEST LOCAL SAVE/.test(button.textContent));
    expect(testSave).toBeTruthy();
    await act(async () => { testSave.click(); });
    expect(container.textContent).toContain("PROGRESS SAVES ON THIS DEVICE");
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

  it("surfaces a player-facing balance insight without the ops debug flag", async () => {
    localStorage.setItem("cod-run-history-v1", JSON.stringify([
      { wave: 7, score: 1000, ts: 1 },
      { wave: 7, score: 900, ts: 2 },
      { wave: 3, score: 400, ts: 3 },
    ]));
    container = document.createElement("div");
    document.body.appendChild(container);
    await act(async () => {
      root = createRoot(container);
      root.render(<HomeV2 {...baseProps} />);
    });

    expect(container.textContent).toContain("PATTERN SPOTTED");
    expect(container.textContent).toContain("Wave 7 is repeating");
    expect(container.textContent).not.toContain("BALANCE LAB");
  });

  it("does not surface a balance insight when local history is quiet", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    await act(async () => {
      root = createRoot(container);
      root.render(<HomeV2 {...baseProps} />);
    });

    expect(container.textContent).not.toContain("PATTERN SPOTTED");
  });

  it("hides the balance insight after dismissal for the session", async () => {
    localStorage.setItem("cod-run-history-v1", JSON.stringify([
      { wave: 7, score: 1000, ts: 1 },
      { wave: 7, score: 900, ts: 2 },
    ]));
    container = document.createElement("div");
    document.body.appendChild(container);
    await act(async () => {
      root = createRoot(container);
      root.render(<HomeV2 {...baseProps} />);
    });

    const dismissBtn = [...container.querySelectorAll("button")].find(b => b.getAttribute("aria-label") === "Dismiss pattern insight");
    expect(dismissBtn).toBeTruthy();
    await act(async () => { dismissBtn.click(); });
    expect(container.textContent).not.toContain("PATTERN SPOTTED");
    expect(sessionStorage.getItem("cod-insight-dismissed")).toBe("1");
  });
});
