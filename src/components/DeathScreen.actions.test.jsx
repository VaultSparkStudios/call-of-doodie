// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import DeathScreen from "./DeathScreen.jsx";
import { DIFFICULTIES } from "../constants.js";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
vi.mock("./CommunityStatsPanel.jsx", () => ({ default: () => null }));
vi.mock("./PlaytestFlightReceipt.jsx", () => ({ default: () => null }));
vi.mock("../utils/analytics.js", () => ({ track: vi.fn() }));
vi.mock("../storage.js", async (original) => ({ ...(await original()), requestStudioEventSync: vi.fn().mockResolvedValue({}) }));

describe("end-run player actions", () => {
  let root, container;
  const mount = async (extra = {}) => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => root.render(<DeathScreen score={1234} kills={8} wave={2} level={2} bestStreak={3} timeSurvived={42} totalDamage={100} crits={0} grenades={0} deathMessage="Flushed" difficulty="normal" runSeed={42} achievementsUnlocked={[]} activePerks={[]} missionsSummary={[]} leaderboard={[]} username="QA" DIFFICULTIES={DIFFICULTIES} fmtTime={() => "0:42"} onStartGame={vi.fn()} onMenu={vi.fn()} onRefreshLeaderboard={vi.fn()} onSubmitScore={vi.fn().mockResolvedValue({ submission: "online" })} {...extra} />));
  };
  const click = async (button) => act(async () => button.dispatchEvent(new MouseEvent("click", { bubbles: true })));
  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
    localStorage.clear();
    vi.restoreAllMocks();
  });
  it("submits once with optional blank last words, disables while pending, and displays online rank", async () => {
    let resolve;
    const submit = vi.fn(() => new Promise(r => { resolve = r; }));
    await mount({ onSubmitScore: submit });
    const button = container.querySelector('[data-testid="submit-to-leaderboard"]');
    expect(button.textContent).toBe("SUBMIT TO LEADERBOARD");
    expect(button.closest("details")).toBeNull();
    await act(async () => {
      button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(submit).toHaveBeenCalledTimes(1);
    expect(submit.mock.calls[0][0].lastWords).toBe("...");
    expect(button.disabled).toBe(true);
    expect(container.querySelector("#run-last-words").disabled).toBe(true);
    await act(async () => resolve({ submission: "online", globalRank: 12 }));
    expect(container.textContent).toContain("Score submitted!");
    expect(container.textContent).toContain("#12");
  });
  it.each(["local", "rejected"])("distinguishes %s submission from online success", async (submission) => {
    await mount({ onSubmitScore: vi.fn().mockResolvedValue({ submission, rejectionReason: "Invalid run" }) });
    await click(container.querySelector('[data-testid="submit-to-leaderboard"]'));
    expect(container.textContent).toContain(submission === "local" ? "Saved locally" : "Submission rejected");
    expect(container.textContent).not.toContain("Score submitted!");
  });
  it.each([{ practiceRun: true }, { operationMode: true }, { replayEligible: false }])("never offers online submission for an ineligible run %j", async (gsSnapshot) => {
    await mount({ gsSnapshot });
    expect(container.querySelector('[data-testid="submit-to-leaderboard"]')).toBeNull();
    expect(container.textContent).toMatch(/no online leaderboard|don't submit to the leaderboard/);
  });
  it("shows a selectable canonical link when sharing and clipboard are unavailable", async () => {
    Object.defineProperty(navigator, "share", { configurable: true, value: undefined });
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: undefined });
    await mount();
    await click([...container.querySelectorAll("button")].find(b => b.textContent === "SHARE RUN LINK"));
    expect(container.textContent).toContain("Clipboard access is unavailable");
    expect(container.querySelector('input[aria-label="Run link to copy"]').value).toMatch(/^https:\/\/callofdoodie.wtf\/play\/\?scenario=/);
  });
});
