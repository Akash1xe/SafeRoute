import { describe, expect, it } from 'vitest';

import {
  calculateTimeDecay,
  categoryHalfLifeMs,
  categoryTimeDecay,
} from './time-decay.js';

describe('time decay', () => {
  it('halves risk once per half-life', () => {
    const createdAt = new Date('2026-01-01T00:00:00Z');
    const halfLife = 1_000;

    expect(calculateTimeDecay(createdAt, createdAt, halfLife)).toBe(1);
    expect(
      calculateTimeDecay(
        createdAt,
        new Date(createdAt.getTime() + halfLife),
        halfLife,
      ),
    ).toBeCloseTo(0.5);
    expect(
      calculateTimeDecay(
        createdAt,
        new Date(createdAt.getTime() + halfLife * 2),
        halfLife,
      ),
    ).toBeCloseTo(0.25);
  });

  it('keeps persistent environmental risks longer than transient accidents', () => {
    const createdAt = new Date('2026-01-01T00:00:00Z');
    const now = new Date(createdAt.getTime() + categoryHalfLifeMs.ACCIDENT);

    expect(categoryTimeDecay('ACCIDENT', createdAt, now)).toBeCloseTo(0.5);
    expect(categoryTimeDecay('ISOLATED_AREA', createdAt, now)).toBeGreaterThan(
      0.99,
    );
  });
});
