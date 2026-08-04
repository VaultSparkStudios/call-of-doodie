import { describe, expect, it } from 'vitest';
import { buildFirstRunsJourney } from '../src/utils/firstRunsJourney.js';

describe('first three runs journey', () => {
  it.each([
    [0, 'RUN 1'],
    [1, 'RUN 2'],
    [2, 'RUN 3'],
  ])('makes the correct stage reachable after %i completed runs', (totalRuns, label) => {
    const journey = buildFirstRunsJourney({ totalRuns });
    expect(journey.steps.find((step) => step.active)?.label).toBe(label);
    expect(journey.steps.filter((step) => step.complete)).toHaveLength(totalRuns);
  });

  it('hides only after all three run receipts exist', () => {
    expect(buildFirstRunsJourney({ totalRuns: 3 })).toBeNull();
  });

  it('fails closed for malformed counters', () => {
    expect(buildFirstRunsJourney({ totalRuns: 'not-a-number' }).activeRun).toBe(1);
  });
});
