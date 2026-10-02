import { describe, expect, it } from "vitest";
import { buildChallengeUrl } from "./challengeLinks.js";
import { parseChallengeInvite } from "./challengePayload.js";

describe("buildChallengeUrl", () => {
  it("builds a seeded challenge URL with rivalry metadata", () => {
    const url = buildChallengeUrl({
      seed: 4242,
      difficulty: "hard",
      vsScore: 12345,
      vsName: "PlayerOne",
      baseUrl: "https://callofdoodie.wtf/",
    });
    expect(new URL(url).pathname).toBe("/");
    expect(parseChallengeInvite(new URL(url).search).invite).toMatchObject({ seed: 4242, difficulty: "hard", mode: "standard", loadout: "standard", vsScore: 12345, vsName: "PlayerOne" });
  });

  it("returns null when the seed is invalid", () => {
    expect(buildChallengeUrl({ seed: 0, baseUrl: "https://example.com" })).toBeNull();
  });
});
