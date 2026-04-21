import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("../supabase.js", () => ({ supabase: null, getOrCreateClientUid: () => "test-uid", getAuthUid: () => null }));
vi.mock("../utils/analytics.js", () => ({ track: vi.fn(), analyticsInit: vi.fn(), identify: vi.fn(), analyticsReset: vi.fn(), gameCtx: () => ({}), resolveMode: () => "standard" }));

import HomeV2 from "./HomeV2.jsx";

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
  afterEach(() => { act(() => root?.unmount()); container?.remove(); });

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
});
