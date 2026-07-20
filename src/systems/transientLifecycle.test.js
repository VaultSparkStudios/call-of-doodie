import { describe, expect, it } from "vitest";
import { stepAndCompactInPlace, stepTransientEffectsInPlace } from "./transientLifecycle.js";

describe("transient lifecycle", () => {
  it("preserves identity and order while applying filter-compatible callbacks", () => {
    const items = [{ id: 1 }, { id: 2 }, { id: 3 }];
    const original = items;
    const callbackArgs = [];
    const result = stepAndCompactInPlace(items, (item, index, source) => {
      callbackArgs.push([item.id, index, source === original]);
      return item.id !== 2;
    });
    expect(result).toBe(original);
    expect(result.map((item) => item.id)).toEqual([1, 3]);
    expect(callbackArgs).toEqual([[1, 0, true], [2, 1, true], [3, 2, true]]);
  });

  it("matches Array.filter snapshot semantics when a callback appends", () => {
    const items = [{ id: 1 }];
    stepAndCompactInPlace(items, (item, index, source) => {
      if (index === 0) source.push({ id: 2 });
      return item.id === 1;
    });
    expect(items).toEqual([{ id: 1 }]);
  });

  it("steps all safe transient collections without replacing their arrays", () => {
    const gs = {
      particles: [{ x: 0, y: 0, vx: 10, vy: -2, life: 2 }, { x: 5, y: 5, vx: 0, vy: 0, life: 1 }],
      floatingTexts: [{ y: 10, vy: -1, life: 2 }],
      dyingEnemies: [{ life: 1 }, { life: 3 }],
      lightningArcs: [{ life: 2 }],
      beams: [{ life: 1 }],
    };
    const identities = Object.fromEntries(Object.entries(gs));
    expect(stepTransientEffectsInPlace(gs)).toBe(gs);
    for (const key of Object.keys(identities)) expect(gs[key]).toBe(identities[key]);
    expect(gs.particles).toHaveLength(1);
    expect(gs.particles[0]).toMatchObject({ x: 10, y: -2, vx: 9.5, vy: -1.9, life: 1 });
    expect(gs.floatingTexts[0]).toMatchObject({ y: 9, life: 1 });
    expect(gs.dyingEnemies).toEqual([{ life: 2 }]);
    expect(gs.lightningArcs).toEqual([{ life: 1 }]);
    expect(gs.beams).toEqual([]);
  });

  it("normalizes absent transient collections to reusable arrays", () => {
    const gs = {};
    stepTransientEffectsInPlace(gs);
    expect(gs).toMatchObject({
      particles: [],
      floatingTexts: [],
      dyingEnemies: [],
      lightningArcs: [],
      beams: [],
    });
  });
});

