import { describe, expect, it } from 'vitest';
import {
  annotateActivePlaytestFlight,
  createPlaytestFlight,
  loadPlaytestPulse,
  recordActivePlaytestContinuation,
  recordPlaytestMilestone,
  recordPlaytestPulse,
  savePlaytestFlight,
} from '../src/utils/playtestFlightRecorder.js';

function memoryStorage() {
  const map = new Map();
  return { getItem: (key) => map.get(key) ?? null, setItem: (key, value) => map.set(key, String(value)), removeItem: (key) => map.delete(key) };
}

function deadFlight(now = 100) {
  return recordPlaytestMilestone(createPlaytestFlight({ now }), 'death', { now: now + 50 });
}

describe('closed-loop playtest continuation', () => {
  it('upserts answer-before-action into the same Pulse flight', () => {
    const sessionStorage = memoryStorage();
    const localStorage = memoryStorage();
    savePlaytestFlight(deadFlight(), sessionStorage);
    const answered = annotateActivePlaytestFlight({ deathClarity: 'clear', replayIntent: 'now' }, sessionStorage);
    recordPlaytestPulse(answered, localStorage);
    const result = recordActivePlaytestContinuation('new_run', { now: 175, sessionStorage, localStorage });
    const pulse = loadPlaytestPulse(localStorage);
    expect(result.receipt.continuation).toBe('new_run');
    expect(pulse.sampleSize).toBe(1);
    expect(pulse.flights[0].continuation).toBe('new_run');
  });

  it('converges action-before-answer without fabricating a complete sample', () => {
    const sessionStorage = memoryStorage();
    const localStorage = memoryStorage();
    savePlaytestFlight(deadFlight(200), sessionStorage);
    const action = recordActivePlaytestContinuation('replay_seed', { now: 260, sessionStorage, localStorage });
    expect(action.pulse).toBeNull();
    const answered = annotateActivePlaytestFlight({ deathClarity: 'partial', replayIntent: 'later' }, sessionStorage);
    recordPlaytestPulse(answered, localStorage);
    const pulse = loadPlaytestPulse(localStorage);
    expect(pulse.sampleSize).toBe(1);
    expect(pulse.flights[0]).toMatchObject({ continuation: 'replay_seed', annotations: { deathClarity: 'partial', replayIntent: 'later' } });
  });
});
