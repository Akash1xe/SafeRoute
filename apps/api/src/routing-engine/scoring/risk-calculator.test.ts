import { describe, expect, it } from 'vitest';

import { RiskCalculator } from './risk-calculator.js';

describe('risk calculator', () => {
  it('combines normalized risk factors using configured weights', () => {
    const calculator = new RiskCalculator({
      lighting: 0.2,
      incident: 0.4,
      isolation: 0.1,
      accident: 0.2,
      temporaryHazard: 0.1,
    });

    expect(
      calculator.calculate({
        lighting: 1,
        incident: 0.5,
        isolation: 0,
        accident: 0.5,
        temporaryHazard: 0,
      }),
    ).toBeCloseTo(0.5);
  });

  it('rejects configurations that do not sum to one', () => {
    expect(
      () =>
        new RiskCalculator({
          lighting: 1,
          incident: 1,
          isolation: 1,
          accident: 1,
          temporaryHazard: 1,
        }),
    ).toThrow('add up to 1');
  });
});
