import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import MenuScreen from "./MenuScreen.jsx";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
Element.prototype.scrollIntoView = vi.fn();

vi.mock("../supabase.js", () => ({ supabase: null }));
vi.mock("../utils/analytics.js", () => ({
  track: vi.fn(),
}));

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
  controllerType: "xbox",
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
};

function findButton(container, pattern) {
  return [...container.querySelectorAll("button")].find((button) => pattern.test(button.textContent));
}

describe("MenuScreen legacy shared panels", () => {
  let container;
  let root;

  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
    localStorage.clear();
    sessionStorage.clear();
  });

  it("routes legacy rules and controls modals through shared panel content", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    await act(async () => {
      root = createRoot(container);
      root.render(<MenuScreen {...baseProps} />);
    });

    await act(async () => {
      findButton(container, /COMMAND CENTER/)?.click();
    });

    await act(async () => {
      findButton(container, /RULES/)?.click();
    });
    expect(container.textContent).toContain("RULES OF ENGAGEMENT");

    await act(async () => {
      findButton(container, /BACK/)?.click();
    });

    await act(async () => {
      findButton(container, /CONTROLS/)?.click();
    });
    expect(container.textContent).toContain("CONTROLS");
    expect(container.textContent).toContain("Xbox");
  });
});