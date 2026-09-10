import { describe, expect, it } from 'vitest';

import {
  aggregateIndependentRisks,
  calculateEffectiveRisk,
  categoryRiskFactor,
} from './risk-intelligence.js';

describe('risk intelligence', () => {
  it('maps incident categories to routing risk factors', () => {
    expect(categoryRiskFactor.POOR_LIGHTING).toBe('lighting');
    expect(categoryRiskFactor.HARASSMENT).toBe('incident');
    expect(categoryRiskFactor.ROAD_CLOSURE).toBe('temporaryHazard');
  });

  it('combines severity, confidence, and time decay', () => {
    expect(calculateEffectiveRisk(4, 0.75, 0.5)).toBeCloseTo(0.3);
  });

  it('aggregates reports without allowing risk to exceed one', () => {
    expect(aggregateIndependentRisks([0.5, 0.5])).toBeCloseTo(0.75);
    expect(aggregateIndependentRisks([])).toBe(0);
    expect(aggregateIndependentRisks([1, 0.8])).toBe(1);
  });
});
