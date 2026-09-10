import { beforeEach, describe, expect, it } from "vitest";
import { SEWER_EXTRACTION } from "./sewerExtraction.js";
import { createModeState, stepMode } from "../systems/modeDefinition.js";
import { createSimState } from "../sim/stepSim.js";
import { loadCareerStats, loadStash, saveStash } from "../storage.js";
import { RUN_PHASE } from "../systems/runTermination.js";

const ctx = { W: 1280, H: 720 };
const originalStash = { total: 200, runs: 2, best: 120, last: null };

function atOpenExit() {
  const gs = createSimState({ seed: 7 });
  createModeState(SEWER_EXTRACTION, gs, ctx);
  gs.pickups = [];
  gs.alarm = 60;
  stepMode(gs, SEWER_EXTRACTION, ctx);
  const exit = gs.structures.find((structure) => structure.id === "evac-toilet");
  gs.player.x = exit.x;
  gs.player.y = exit.y;
  gs._extractLoot = 75;
  gs._extractCrates = 1;
  return gs;
}

beforeEach(() => {
  localStorage.clear();
  saveStash(originalStash);
});

describe("sewer extraction terminal boundaries", () => {
  it.each(["tick", "crate", "kill"])("lockdown wins the race with evacuation when %s reaches alarm 100", (source) => {
    const gs = atOpenExit();
    gs.alarm = source === "tick" ? 99.999 : source === "crate" ? 96 : 98.4;
    if (source === "crate") gs.pickups.push({ x: gs.player.x, y: gs.player.y, type: "loot", value: 25, life: 100 });
    if (source === "kill") SEWER_EXTRACTION.onEnemyKilled(gs);

    expect(stepMode(gs, SEWER_EXTRACTION, ctx)).toBeNull();
    expect(gs._extractLocked).toBe(true);
    expect(gs._modeWon).toBe(false);
    expect(gs._extractBanked).toBeNull();
    expect(gs.structures.some((structure) => structure.id === "evac-toilet")).toBe(false);
    expect(loadStash()).toEqual(originalStash);
  });

  it("banks a successful haul exactly once, even if mode hooks are called again", () => {
    const gs = atOpenExit();
    const beforeScore = gs.score;
    expect(stepMode(gs, SEWER_EXTRACTION, ctx)).toBe("win");
    const banked = gs._extractBanked;
    expect(loadStash()).toEqual({ total: 275, runs: 3, best: 120, last: banked });
    expect(gs.score).toBe(beforeScore + 150);
    const alarm = gs.alarm;
    const pickups = [...gs.pickups];

    for (let i = 0; i < 3; i += 1) {
      SEWER_EXTRACTION.onEnemyKilled(gs);
      SEWER_EXTRACTION.onWaveStart(gs, ctx);
      expect(stepMode(gs, SEWER_EXTRACTION, ctx)).toBe("win");
    }
    expect(gs._extractBanked).toEqual(banked);
    expect(loadStash()).toEqual({ total: 275, runs: 3, best: 120, last: banked });
    expect(gs.score).toBe(beforeScore + 150);
    expect(gs.alarm).toBe(alarm);
    expect(gs.pickups).toEqual(pickups);
  });

  it("lockdown preserves the last stand and adds reinforcement pressure only once", () => {
    const gs = atOpenExit();
    gs.player.x = 640;
    gs.player.y = 360;
    gs.alarm = 100;
    gs.maxEnemiesThisWave = 10;
    for (let i = 0; i < 3; i += 1) expect(stepMode(gs, SEWER_EXTRACTION, ctx)).toBeNull();
    expect(gs.maxEnemiesThisWave).toBe(22);
    expect(gs._modeLost).not.toBe(true);
    expect(loadCareerStats().hazardChronicle.extraction_lockdown.encounters).toBe(1);
    expect(gs._extractLocked).toBe(true);
    expect(loadStash()).toEqual(originalStash);
  });

  it.each([RUN_PHASE.ENDING, RUN_PHASE.ENDED, RUN_PHASE.PLAYING])("cannot bank after lethal damage with phase %s", (phase) => {
    const gs = atOpenExit();
    gs.runPhase = phase;
    gs.player.health = 0;
    const score = gs.score;
    expect(stepMode(gs, SEWER_EXTRACTION, ctx)).not.toBe("win");
    expect(gs._extractBanked).toBeNull();
    expect(gs._modeWon).toBe(false);
    expect(gs.score).toBe(score);
    expect(loadStash()).toEqual(originalStash);
  });
});
