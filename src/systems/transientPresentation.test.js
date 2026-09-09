import { describe, expect, it } from "vitest";
import { addParticles, addScreenText, addText, announce, MAX_FLOAT_TEXTS, MAX_PARTICLES } from "./transientPresentation.js";

describe("transient presentation boundaries", () => {
  it("caps particles exactly and reports the appended amount", () => {
    const gs = { particles: Array(MAX_PARTICLES - 2).fill({}), settParticlesMult: 2 };
    expect(addParticles(gs, 1, 2, "#fff", 8, () => 0.5)).toBe(2);
    expect(gs.particles).toHaveLength(MAX_PARTICLES);
    expect(addParticles(gs, 1, 2, "#fff", 1, () => 0.5)).toBe(0);
  });

  it("drops small text at capacity but makes bounded room for priority text", () => {
    const gs = { floatingTexts: Array.from({ length: MAX_FLOAT_TEXTS }, (_, id) => ({ id })) };
    expect(addText(gs, 0, 0, "small")).toBe(false);
    expect(addText(gs, 0, 0, "BOSS", "#f00", true)).toBe(true);
    expect(gs.floatingTexts).toHaveLength(MAX_FLOAT_TEXTS - 2);
    expect(gs.floatingTexts.at(-1)).toMatchObject({ text: "BOSS", big: true, quote: false, life: 90 });
  });

  it("retains quote timing semantics and fails safely for missing arrays", () => {
    const gs = { floatingTexts: [] };
    expect(addText(gs, 3, 4, "quote", "#fff", "quote")).toBe(true);
    expect(gs.floatingTexts[0]).toMatchObject({ life: 110, vy: -0.65, big: false, quote: true });
    expect(addText({}, 0, 0, "ignored")).toBe(false);
    expect(addParticles({}, 0, 0, "#fff")).toBe(0);
  });

  it("distinguishes screen-anchored announcements from world-anchored text (S167)", () => {
    const gs = { floatingTexts: [] };
    expect(addText(gs, 10, 20, "world")).toBe(true);
    expect(addScreenText(gs, 640, 300, "SCREEN", "#0f0", true)).toBe(true);
    expect(gs.floatingTexts[0]).toMatchObject({ x: 10, y: 20, screen: false });
    expect(gs.floatingTexts[1]).toMatchObject({ x: 640, y: 300, text: "SCREEN", big: true, screen: true, life: 90 });
  });

  it("announce centres on the viewport, never the arena, and falls back to the remembered view size", () => {
    const gs = { floatingTexts: [], arenaW: 2560, arenaH: 1440, _viewW: 1280, _viewH: 720 };
    expect(announce(gs, 1280, 720, "PHASE 2", "#0ff")).toBe(true);
    expect(gs.floatingTexts.at(-1)).toMatchObject({ x: 640, y: 240, screen: true, big: true });
    expect(announce(gs, undefined, undefined, "FALLBACK", "#fff", false, 0)).toBe(true);
    expect(gs.floatingTexts.at(-1)).toMatchObject({ x: 640, y: 360, screen: true, big: false });
    expect(announce({}, 1280, 720, "ignored")).toBe(false);
  });

  it("normalizes malformed random samples into finite particle state", () => {
    const samples = [Number.NaN, -4, 8, Number.POSITIVE_INFINITY];
    const gs = { particles: [], settParticlesMult: 1 };
    addParticles(gs, 0, 0, "#fff", 1, () => samples.shift());
    expect(Object.values(gs.particles[0]).filter((value) => typeof value === "number").every(Number.isFinite)).toBe(true);
  });
});
