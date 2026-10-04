import { describe, expect, it } from "vitest";
import { parseLaunchIntent } from "./launchIntent.js";
import { FULL_MODE_CATALOG } from "../config/modeCatalog.js";
import { DIFFICULTIES } from "../constants.js";

describe("public play discovery links", () => {
  it.each(FULL_MODE_CATALOG.flatMap(mode => Object.keys(DIFFICULTIES).map(difficulty => [mode.id, difficulty])))("retains catalog setup %s/%s", (id, difficulty) => {
    expect(parseLaunchIntent(`?mode=${id}&diff=${difficulty}&seed=42`)).toEqual({ kind: "mode", id, difficulty, seed: 42 });
  });
  it("selects every published mode without inventing a seed or setup", () => {
    expect(parseLaunchIntent("?mode=boss_rush")).toEqual({ kind: "mode", id: "boss_rush" });
    expect(parseLaunchIntent("?mode=bot_royale")).toEqual({ kind: "mode", id: "bot_royale" });
    expect(parseLaunchIntent("?mode=unknown")).toBeNull();
  });

  it("keeps exact authored routes and safely falls back to a valid route", () => {
    expect(parseLaunchIntent("?operation=porcelain-siege&route=boiler-room")).toEqual({ kind: "operation", id: "porcelain-siege", route: "boiler-room" });
    expect(parseLaunchIntent("?operation=porcelain-siege&route=not-a-route")).toEqual({ kind: "operation", id: "porcelain-siege", route: "laundry-annex" });
  });

  it("defers to scenario and replay invitations", () => {
    for (const invitation of ["scenario=abc", "replay=abc"]) {
      expect(parseLaunchIntent(`?mode=boss_rush&${invitation}`)).toBeNull();
    }
  });
  it("composes explicit seeded mode and mission setups", () => {
    expect(parseLaunchIntent("?mode=zombies&seed=42&diff=hard")).toEqual({ kind: "mode", id: "zombies", seed: 42, difficulty: "hard" });
    expect(parseLaunchIntent("?mode=zombies&seed=bad&diff=nightmare")).toEqual({ kind: "mode", id: "zombies" });
    expect(parseLaunchIntent("?operation=porcelain-siege&route=boiler-room&seed=0&diff=insane")).toMatchObject({ kind: "operation", route: "boiler-room", seed: 0, difficulty: "insane" });
  });
});
