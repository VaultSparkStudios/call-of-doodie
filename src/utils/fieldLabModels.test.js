import { describe, expect, it } from 'vitest';
import { COMPLAINT_TACTICS, PLUMBING_ROUTES, compareFateAttempts, createComplaintContract, createPlumbingRoom, fateOrder, replayPlumbing, reroutePlumbing, resolveFateAttempt } from './fieldLabModels.js';

describe('unranked Field Lab models', () => {
  it('previews both sides of three valve routes and replays reversible choices', () => {
    for (const route of Object.values(PLUMBING_ROUTES)) { expect(route.benefit).toBeTruthy(); expect(route.cost).toBeTruthy(); }
    let room = createPlumbingRoom(42);
    room = reroutePlumbing(room, 'lane');
    room = reroutePlumbing(room, 'boss');
    room = reroutePlumbing(room, 'lane');
    expect(room.route).toBe('lane');
    expect(room.events).toHaveLength(3);
    expect(replayPlumbing(42, room.events)).toEqual(room);
    expect(() => reroutePlumbing(room, 'hidden')).toThrow(RangeError);
  });

  it('locks a disclosed complaint counter with deterministic original tactics', () => {
    expect(Object.keys(COMPLAINT_TACTICS)).toEqual(['noise', 'parking']);
    const first = createComplaintContract({ seed: 42, tactic: 'parking', counter: 'tow' });
    expect(first).toEqual(createComplaintContract({ seed: 42, tactic: 'parking', counter: 'tow' }));
    expect(first.counterMatched).toBe(true);
    expect(first.competitive).toBe(false);
    expect(first.events).toHaveLength(3);
    expect(createComplaintContract({ seed: 42, tactic: 'parking', counter: 'appeal' }).counterMatched).toBe(false);
  });

  it('alternates paired-practice order and compares only authored observations', () => {
    expect(fateOrder(42)).toEqual(['rush', 'cover']);
    expect(fateOrder(43)).toEqual(['cover', 'rush']);
    const [a, b] = fateOrder(42).map((approach) => resolveFateAttempt({ seed: 42, approach }));
    const comparison = compareFateAttempts(a, b);
    expect(comparison.sharedSeed).toBe(42);
    expect(comparison.claim).toMatch(/Neither predicts or rewinds/);
    expect(comparison.competitive).toBe(false);
    expect(() => compareFateAttempts(a, a)).toThrow(RangeError);
  });
});
