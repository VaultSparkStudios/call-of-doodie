import { describe, expect, it } from "vitest";
import { buildThreatRecommendation, normalizeFieldReport } from "./fieldReport.js";

describe("Field Report threat response", () => {
  it("rejects unknown sentiment and does not invent a recommendation", () => {
    expect(normalizeFieldReport("fine-ish")).toBeNull();
    expect(buildThreatRecommendation({ feedback: "fine-ish" })).toBeNull();
  });

  it("escalates only when sentiment is repeated or supported by performance", () => {
    expect(buildThreatRecommendation({ feedback: "too_easy", currentDifficulty: "normal", wave: 2, kills: 5, score: 1000 })).toBeNull();
    expect(buildThreatRecommendation({ feedback: "too_easy", recentFeedback: ["too_easy"], currentDifficulty: "normal" })).toMatchObject({
      kind: "difficulty",
      value: "hard",
      evidence: "repeated_player_sentiment",
    });
    expect(buildThreatRecommendation({ feedback: "too_easy", currentDifficulty: "hard", wave: 9, kills: 80 })).toMatchObject({ kind: "difficulty", value: "insane" });
  });

  it("offers separately ranked Zombies after an easy report at the top tier", () => {
    expect(buildThreatRecommendation({ feedback: "too_easy", currentDifficulty: "insane", score: 30000 })).toMatchObject({
      kind: "mode",
      value: "zombies",
      label: "OPEN THE SEWER",
    });
  });
});
