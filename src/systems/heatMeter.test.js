import { describe, it, expect } from "vitest";
import { addHeatOnKill, decayHeat, heatTier, resetHeat, HEAT_MAX } from "./heatMeter.js";

describe("heatMeter", () => {
  it("normal kill adds 3", () => {
    const gs = { heat: 0 };
    expect(addHeatOnKill(gs)).toBe(3);
  });
  it("streak 5+ adds 5, streak 10+ adds 8, boss adds 20", () => {
    const gs = { heat: 0 };
    addHeatOnKill(gs, { killstreak: 5 });
    expect(gs.heat).toBe(5);
    addHeatOnKill(gs, { killstreak: 10 });
    expect(gs.heat).toBe(13);
    addHeatOnKill(gs, { isBoss: true });
    expect(gs.heat).toBe(33);
  });
  it("caps at HEAT_MAX", () => {
    const gs = { heat: HEAT_MAX - 1 };
    addHeatOnKill(gs, { isBoss: true });
    expect(gs.heat).toBe(HEAT_MAX);
  });
  it("decays toward zero, never negative", () => {
    const gs = { heat: 0.1 };
    decayHeat(gs);
    expect(gs.heat).toBe(0);
  });
  it("heatTier reflects thresholds", () => {
    expect(heatTier(0)).toBe(0);
    expect(heatTier(45)).toBe(1);
    expect(heatTier(80)).toBe(2);
  });
  it("resetHeat clears", () => {
    const gs = { heat: 50 };
    resetHeat(gs);
    expect(gs.heat).toBe(0);
  });
});
