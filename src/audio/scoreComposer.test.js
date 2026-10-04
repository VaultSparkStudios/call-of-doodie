import { describe, it, expect } from "vitest";
import { composeScoreStep, normalizeScoreMode, normalizeScoreVibe, normalizeScoreObjective, OBJECTIVE_PHRASES, scoreBPM, SCORE_PROFILES } from "./scoreComposer.js";

const phrase = (mode, tier = 0, start = 0) => Array.from({ length: 128 }, (_, step) => composeScoreStep(step + start, { mode, tier }));
describe("original mode scores", () => {
  it("gives objective verbs and pump milestones distinct phrases without changing player tempo", () => {
    for (const mode of ["operations", "zombies"]) {
      const signatures = Object.keys(OBJECTIVE_PHRASES).map(objective => JSON.stringify(Array.from({ length: 16 }, (_, step) => composeScoreStep(step, { mode, objective, vibe: "chill" }))));
      expect(new Set(signatures).size).toBe(Object.keys(OBJECTIVE_PHRASES).length);
      for (const objective of Object.keys(OBJECTIVE_PHRASES)) {
        expect(composeScoreStep(0, { mode, objective, vibe: "chill" }).bpm).toBe(scoreBPM({ mode, vibe: "chill" }));
      }
    }
    expect(normalizeScoreObjective("constructor")).toBe("none");
    expect(composeScoreStep(0, { mode: "classic", objective: "HOLD" })).toEqual(composeScoreStep(0, { mode: "classic" }));
  });
  it("gives each mode its own tempo, harmonic and rhythmic identity", () => {
    const signatures = Object.keys(SCORE_PROFILES).map(mode => JSON.stringify(phrase(mode)));
    expect(new Set(signatures).size).toBe(3);
    expect(new Set(Object.values(SCORE_PROFILES).map(score => score.bpm)).size).toBe(3);
    expect(phrase("zombies").flatMap(step => step.events).some(event => event.instrument === "groan")).toBe(true);
    expect(phrase("operations").flatMap(step => step.events).some(event => event.instrument === "metal")).toBe(true);
  });
  it("develops through four sections and releases tension in the breakdown", () => {
    const counts = [0, 128, 256, 384].map(start => phrase("classic", 0, start).reduce((total, step) => total + step.events.length, 0));
    expect(counts[2]).toBeLessThan(counts[1]);
    expect(counts[3]).toBeGreaterThan(counts[2]);
    expect([0, 128, 256, 384].map(step => composeScoreStep(step).section)).toEqual([0, 1, 2, 3]);
  });
  it("adds energy without replacing the score identity or abruptly changing heat tempo", () => {
    for (const mode of Object.keys(SCORE_PROFILES)) {
      expect(phrase(mode, 2).flatMap(step => step.events).length).toBeGreaterThan(phrase(mode).flatMap(step => step.events).length);
      expect(scoreBPM({ mode, tier: 0 })).toBe(scoreBPM({ mode, tier: 2 }));
    }
  });
  it("produces deterministic, bounded musical events over a full arrangement", () => {
    for (const mode of Object.keys(SCORE_PROFILES)) {
      for (let step = 0; step < 512; step++) {
        const score = composeScoreStep(step, { mode, tier: 2, boss: true });
        expect(score).toEqual(composeScoreStep(step, { mode, tier: 2, boss: true }));
        expect(score.events.length).toBeLessThanOrEqual(10);
        for (const event of score.events) {
          expect(Number.isFinite(event.note)).toBe(true);
          expect(event.volume).toBeGreaterThan(0);
          expect(event.volume).toBeLessThanOrEqual(0.12);
          expect(Math.abs(event.pan)).toBeLessThanOrEqual(1);
        }
      }
    }
  });
  it("normalizes unknown stored settings and mode aliases", () => {
    expect(normalizeScoreMode("sewer-zombies")).toBe("zombies");
    expect(normalizeScoreMode(undefined)).toBe("classic");
    expect(normalizeScoreVibe("bad-setting")).toBe("action");
  });
});
