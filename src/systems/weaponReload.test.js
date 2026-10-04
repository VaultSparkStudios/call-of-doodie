import { describe, expect, it } from 'vitest';
import { advanceWeaponReload, beginWeaponReload } from './weaponReload.js';
describe('simulation-clock reload', () => {
  it('retains unfinished reload time through pause and completes after remaining simulation steps', () => {
    const gs = {};
    beginWeaponReload(gs, 0, 1000);
    for (let i = 0; i < 30; i++) expect(advanceWeaponReload(gs)).toBeNull();
    for (let i = 0; i < 1000; i++) expect(advanceWeaponReload(gs, true)).toBeNull();
    expect(gs.pendingReload.remainingFrames).toBe(30);
    for (let i = 0; i < 29; i++) expect(advanceWeaponReload(gs)).toBeNull();
    expect(advanceWeaponReload(gs)).toBe(0);
    expect(advanceWeaponReload(gs)).toBeNull();
  });
  it('cannot refill another run or a cancelled reload', () => {
    const old = {}, next = {};
    beginWeaponReload(old, 2, 1);
    expect(advanceWeaponReload(next)).toBeNull();
    old.pendingReload = null;
    expect(advanceWeaponReload(old)).toBeNull();
  });
});
