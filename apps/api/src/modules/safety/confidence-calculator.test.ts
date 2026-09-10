import { describe, expect, it } from 'vitest';

import { calculateConfidence } from './confidence-calculator.js';

const baseInput = {
  reporterTrustScore: 0.6,
  confirmationCount: 0,
  disputeCount: 0,
  hasEvidence: false,
  status: 'PENDING' as const,
};

describe('confidence calculator', () => {
  it('raises confidence with confirmations and lowers it with disputes', () => {
    const initial = calculateConfidence(baseInput);
    const confirmed = calculateConfidence({
      ...baseInput,
      confirmationCount: 4,
    });
    const disputed = calculateConfidence({ ...baseInput, disputeCount: 4 });

    expect(confirmed).toBeGreaterThan(initial);
    expect(disputed).toBeLessThan(initial);
  });

  it('includes reporter trust and evidence without exceeding the pending cap', () => {
    const trusted = calculateConfidence({
      ...baseInput,
      reporterTrustScore: 1,
      hasEvidence: true,
      confirmationCount: 100,
    });

    expect(trusted).toBe(0.85);
  });

  it('applies moderation overrides', () => {
    expect(calculateConfidence({ ...baseInput, status: 'VERIFIED' })).toBe(0.9);
    expect(calculateConfidence({ ...baseInput, status: 'REJECTED' })).toBe(0);
    expect(calculateConfidence({ ...baseInput, status: 'EXPIRED' })).toBe(0);
  });
});
