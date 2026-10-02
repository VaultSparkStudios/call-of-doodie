import { describe, expect, it } from "vitest";
import { parseLaunchIntent } from "./launchIntent.js";

describe("public play discovery links", () => {
  it("selects every published mode without inventing a seed or setup", () => {
    expect(parseLaunchIntent("?mode=boss_rush")).toEqual({ kind: "mode", id: "boss_rush" });
    expect(parseLaunchIntent("?mode=bot_royale")).toEqual({ kind: "mode", id: "bot_royale" });
    expect(parseLaunchIntent("?mode=unknown")).toBeNull();
  });

  it("keeps exact authored routes and safely falls back to a valid route", () => {
    expect(parseLaunchIntent("?operation=porcelain-siege&route=boiler-room")).toEqual({ kind: "operation", id: "porcelain-siege", route: "boiler-room" });
    expect(parseLaunchIntent("?operation=porcelain-siege&route=not-a-route")).toEqual({ kind: "operation", id: "porcelain-siege", route: "laundry-annex" });
  });

  it("defers to scenario, replay and seed invitations", () => {
    for (const invitation of ["scenario=abc", "replay=abc", "seed=123"]) {
      expect(parseLaunchIntent(`?mode=boss_rush&${invitation}`)).toBeNull();
    }
  });
});
