import { describe, expect, it } from "vitest";
import { buildChallengeUrl } from "./challengeLinks.js";

describe("buildChallengeUrl", () => {
  it("builds a seeded challenge URL with rivalry metadata", () => {
    expect(buildChallengeUrl({
      seed: 4242,
      difficulty: "hard",
      vsScore: 12345,
      vsName: "PlayerOne",
      baseUrl: "https://vaultsparkstudios.com/call-of-doodie/",
    })).toBe("https://vaultsparkstudios.com/call-of-doodie/?seed=4242&diff=hard&vs=12345&vsName=PlayerOne");
  });

  it("returns null when the seed is invalid", () => {
    expect(buildChallengeUrl({ seed: 0, baseUrl: "https://example.com" })).toBeNull();
  });
});
