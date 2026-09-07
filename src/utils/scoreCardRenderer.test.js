import { describe, it, expect } from "vitest";
import { paintScoreCard, SCORE_CARD_HEIGHT, SCORE_CARD_WIDTH } from "./scoreCardRenderer.js";

// S165 — the share card moved out of DeathScreen.jsx into its own on-demand
// chunk. These assert the extraction kept the card's content, using a recording
// stub instead of a real canvas so the layout is provable without a DOM.

function makeCtx() {
  const texts = [];
  const stub = {
    texts,
    fillStyle: "", strokeStyle: "", font: "", textAlign: "", lineWidth: 0,
    shadowColor: "", shadowBlur: 0,
    fillRect() {}, strokeRect() {}, beginPath() {}, fill() {}, stroke() {},
    roundRect() {}, arc() {},
    fillText(text) { texts.push(String(text)); },
    createLinearGradient: () => ({ addColorStop() {} }),
    createRadialGradient: () => ({ addColorStop() {} }),
  };
  return stub;
}

const BASE = {
  score: 12345,
  kills: 42,
  wave: 7,
  level: 5,
  bestStreak: 9,
  timeSurvived: 200,
  username: "plunger",
  playerSkin: "🪖",
  deathMessage: "skill issue",
  difficulty: "hard",
  DIFFICULTIES: { hard: { label: "hard", emoji: "🔥", color: "#F00" }, normal: { label: "normal" } },
  RANK_NAMES: ["recruit", "private", "sergeant", "captain", "general"],
  fmtTime: (s) => `${s}s`,
  siteHost: "callofdoodie.wtf",
};

describe("paintScoreCard", () => {
  it("keeps the card at the 1200×630 social-card size", () => {
    expect(SCORE_CARD_WIDTH).toBe(1200);
    expect(SCORE_CARD_HEIGHT).toBe(630);
  });

  it("writes the score, the fallen player, the site host and the CTA", () => {
    const ctx = makeCtx();
    paintScoreCard(ctx, BASE);
    const all = ctx.texts.join("\n");
    expect(all).toContain("12,345");
    expect(all).toContain("FINAL SCORE");
    expect(all).toContain("PLUNGER  HAS FALLEN");
    expect(all).toContain("callofdoodie.wtf");
    expect(all).toContain("CAN YOU BEAT PLUNGER?");
    expect(all).toContain("skill issue");
  });

  it("labels the active alternate mode and only that mode", () => {
    const ctx = makeCtx();
    paintScoreCard(ctx, { ...BASE, cursedRunMode: true });
    const banner = ctx.texts.find(t => t.includes("KILLCAM"));
    expect(banner).toContain("☠ CURSED");
    expect(banner).not.toContain("BOSS RUSH");
  });

  it("prints the replay share stamp only when a proof receipt exists", () => {
    const without = makeCtx();
    paintScoreCard(without, BASE);
    expect(without.texts.join("\n")).not.toContain("VERIFIED SEED");

    const withProof = makeCtx();
    paintScoreCard(withProof, {
      ...BASE,
      replayProofReceipt: { color: "#0F0" },
      replayProofPresenter: { shareStamp: "VERIFIED SEED 1234" },
    });
    expect(withProof.texts.join("\n")).toContain("VERIFIED SEED 1234");
  });

  it("falls back to normal difficulty and a default skin without throwing", () => {
    const ctx = makeCtx();
    expect(() => paintScoreCard(ctx, { ...BASE, difficulty: "nope", playerSkin: "" })).not.toThrow();
    expect(ctx.texts.join("\n")).toContain("🪖 PLUNGER  HAS FALLEN");
  });
});
