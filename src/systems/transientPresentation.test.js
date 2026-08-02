import { describe, expect, it } from "vitest";
import { addParticles, addText, MAX_FLOAT_TEXTS, MAX_PARTICLES } from "./transientPresentation.js";

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

  it("normalizes malformed random samples into finite particle state", () => {
    const samples = [Number.NaN, -4, 8, Number.POSITIVE_INFINITY];
    const gs = { particles: [], settParticlesMult: 1 };
    addParticles(gs, 0, 0, "#fff", 1, () => samples.shift());
    expect(Object.values(gs.particles[0]).filter((value) => typeof value === "number").every(Number.isFinite)).toBe(true);
  });
});
