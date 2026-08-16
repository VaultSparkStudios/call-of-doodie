import { describe, expect, it } from "vitest";
import { MODE_CATALOG, assertCatalogMatchesReplayModes, getMode, resolveSelectedModeId } from "./modeCatalog.js";
import { REPLAY_MODES } from "../utils/replayCode.js";

describe("modeCatalog (S155 shared mode truth)", () => {
  it("catalog ids exactly match REPLAY_MODES in order", () => {
    expect(MODE_CATALOG.map((mode) => mode.id)).toEqual([...REPLAY_MODES]);
    expect(assertCatalogMatchesReplayModes()).toBe(true);
  });

  it("every mode carries the full display field set", () => {
    for (const mode of MODE_CATALOG) {
      for (const field of ["label", "short", "arcadeLabel", "emoji", "icon", "color", "blurb", "description"]) {
        expect(mode[field], `${mode.id}.${field}`).toBeTruthy();
      }
    }
  });

  it("resolveSelectedModeId honors the priority chain and defaults to standard", () => {
    expect(resolveSelectedModeId({})).toBe("standard");
    expect(resolveSelectedModeId({ zombiesMode: true, bossRushMode: true })).toBe("zombies");
    expect(resolveSelectedModeId({ bossRushMode: true, cursedRunMode: true })).toBe("boss_rush");
    expect(resolveSelectedModeId({ gauntletMode: true })).toBe("gauntlet");
  });

  it("getMode falls back to standard for unknown ids", () => {
    expect(getMode("nonexistent").id).toBe("standard");
    expect(getMode("zombies").label).toBe("Sewer Zombies");
  });
});
