import { describe, expect, it } from 'vitest';
import { classifyObservedAdvancement, normalizePlaythroughObservation } from './playthrough-observations.mjs';
describe('playthrough observation evidence', () => {
  it('does not convert missing, malformed or legacy fields into passing observations', () => {
    expect(normalizePlaythroughObservation({ totalKills: 9, frame: undefined }).kills).toBeNull();
    expect(classifyObservedAdvancement({}, {})).toEqual({ status: 'unavailable', basis: 'missing-world-observation' });
  });
  it('distinguishes clock evidence, fallback world changes and a frozen pause', () => {
    expect(classifyObservedAdvancement({ frame: 1 }, { frame: 2 }).basis).toBe('simulation-clock');
    const before = { player: { x: 1, y: 2, health: 100 }, enemies: [], kills: 0 };
    expect(classifyObservedAdvancement(before, before).status).toBe('unchanged');
    expect(classifyObservedAdvancement(before, { ...before, kills: 1 }).status).toBe('advanced');
  });
});
