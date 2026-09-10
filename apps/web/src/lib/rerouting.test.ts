import { describe, expect, it } from 'vitest';

import { shouldSuggestReroute } from './rerouting';
import type { CalculatedRoute } from './types';

const current: CalculatedRoute = {
  preference: 'FASTEST',
  nodeIds: ['a', 'b'],
  geometry: [],
  distanceMeters: 500,
  durationSeconds: 300,
  safetyScore: 60,
  optimizationCost: 500,
  exploredNodes: 2,
  warnings: [],
};

describe('rerouting suggestions', () => {
  it('suggests a different safest path after a risk event', () => {
    expect(
      shouldSuggestReroute(current, [
        { ...current, preference: 'SAFEST', nodeIds: ['a', 'c', 'b'] },
      ]),
    ).toBe(true);
  });

  it('does not interrupt the user when the safest path is unchanged', () => {
    expect(
      shouldSuggestReroute(current, [{ ...current, preference: 'SAFEST' }]),
    ).toBe(false);
  });
});
