import { describe, expect, it } from "vitest";
import { HOME_VERSION, resolveHomeVersion } from "./homeVersion.js";

describe("home version routing", () => {
  it.each([
    ["", HOME_VERSION.CURRENT],
    ["?home=v1", HOME_VERSION.LEGACY],
    ["?home=v2", HOME_VERSION.CURRENT],
    ["?home=v3", HOME_VERSION.EXPERIMENTAL],
    ["?home=unknown", HOME_VERSION.CURRENT],
    ["?other=1", HOME_VERSION.CURRENT],
  ])("routes %s to %s", (search, expected) => {
    expect(resolveHomeVersion(search)).toBe(expected);
  });

  it("fails closed to the current home for non-string input", () => {
    expect(resolveHomeVersion({ home: "v1" })).toBe(HOME_VERSION.CURRENT);
  });
});
